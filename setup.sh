#!/usr/bin/env bash
#
# Sets up a Raspberry Pi (Raspberry Pi OS Lite 64-bit) as an LED matrix display.
#
#   sudo ./setup.sh          full setup
#   sudo ./setup.sh --app    only update the app, configuration and service
#                            (no system update; for updates from a PC, see
#                            tools/deploy.mjs)
#
# The script can be run as often as you like: steps that are already done are
# detected and skipped, and the app is reinstalled every time.
# It does NOT reboot the Pi; at the end it tells you whether a reboot is needed.

set -euo pipefail

# ---------------------------------------------------------------- Settings
#
# Hostname, user, Wi-Fi and time zone come from the Raspberry Pi Imager
# (README, step 1); the setup takes them as they are.

INSTALL_DIR="/opt/led-matrix"            # the app, the Python environment of the panel driver, matrix library
DATA_DIR="/var/lib/led-matrix"           # saved state, the pet's save file
CONFIG_DIR="/etc/led-matrix"             # config.ini
SERVICE_NAME="led-matrix"

# Pinned version of the matrix library, so every Pi is set up exactly the same.
LIB_REPO="https://github.com/hzeller/rpi-rgb-led-matrix.git"
LIB_COMMIT="51d3231e370593b60952b2c3b18d2e3802329f18"

BOOT_CONFIG="/boot/firmware/config.txt"
BOOT_CMDLINE="/boot/firmware/cmdline.txt"

# ---------------------------------------------------------------- Helpers

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$INSTALL_DIR/rpi-rgb-led-matrix"
VENV_DIR="$INSTALL_DIR/venv"
REBOOT_NEEDED=0

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m    WARNING: %s\033[0m\n' "$*"; }

backup_once() {
    # One-time backup of the original file before the first change.
    [[ -e "$1.orig-led-matrix" ]] || cp -a "$1" "$1.orig-led-matrix"
}

APP_ONLY=0
case "${1:-}" in
    "") ;;
    --app) APP_ONLY=1 ;;
    *) echo "Unknown option: $1 (allowed: --app)" >&2; exit 1 ;;
esac

if [[ $EUID -ne 0 ]]; then
    echo "Please run as root: sudo $0 $*" >&2
    exit 1
fi
if [[ $APP_ONLY -eq 1 && ! -e /etc/modprobe.d/blacklist-rgb-matrix.conf ]]; then
    echo "This Pi has not been fully set up yet – please run the script once without --app." >&2
    exit 1
fi
for f in "$BOOT_CONFIG" "$BOOT_CMDLINE" "$REPO_DIR/app/pet.html" "$REPO_DIR/requirements.txt" \
         "$REPO_DIR/pi/panel_driver.py"; do
    [[ -e "$f" ]] || { echo "Missing file: $f" >&2; exit 1; }
done

# ================================================================ 1. System

if [[ $APP_ONLY -eq 1 ]]; then
    step "System: skipped (--app)"
else
    step "Updating the system (can take a while the first time)"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold full-upgrade
    apt-get -y install git rsync python3-venv python3-dev build-essential cmake nodejs
    # npm only builds the server, and only where the repo itself is on the Pi (see "Server" below)
    if [[ -d "$REPO_DIR/core" ]]; then
        apt-get -y install npm
    fi
    apt-get -y autoremove

    step "Time via NTP"
    timedatectl set-ntp true
    TIMEZONE="$(timedatectl show -p Timezone --value)"
    info "Time zone $TIMEZONE, NTP synchronized: $(timedatectl show -p NTPSynchronized --value)"
    if [[ "$TIMEZONE" =~ ^(Etc/)?(UTC|Universal|GMT)$ ]]; then
        warn "The time zone is $TIMEZONE – bedtime and night mode go by local time."
        info "Change it with e.g.: sudo timedatectl set-timezone Europe/Berlin (list: timedatectl list-timezones)"
    fi

    step "Disabling onboard audio (it interferes with driving the matrix)"
    if grep -qE '^\s*dtparam=audio=off\s*$' "$BOOT_CONFIG" && ! grep -qE '^\s*dtparam=audio=on' "$BOOT_CONFIG"; then
        info "already disabled"
    else
        backup_once "$BOOT_CONFIG"
        if grep -qE '^\s*dtparam=audio=' "$BOOT_CONFIG"; then
            sed -i -E 's/^\s*dtparam=audio=.*/dtparam=audio=off/' "$BOOT_CONFIG"
        else
            printf '\n[all]\ndtparam=audio=off\n' >> "$BOOT_CONFIG"
        fi
        info "set dtparam=audio=off in $BOOT_CONFIG"
        REBOOT_NEEDED=1
    fi
    # Also blacklist the sound module, as the matrix library recommends.
    BLACKLIST="/etc/modprobe.d/blacklist-rgb-matrix.conf"
    if [[ "$(cat "$BLACKLIST" 2>/dev/null)" != "blacklist snd_bcm2835" ]]; then
        echo "blacklist snd_bcm2835" > "$BLACKLIST"
        info "created $BLACKLIST"
    fi
    # Unload it right away, so the app also runs before the reboot.
    if lsmod | grep -q '^snd_bcm2835'; then
        modprobe -r snd_bcm2835 2>/dev/null && info "unloaded snd_bcm2835" \
            || { warn "snd_bcm2835 is in use – the display will only start after a reboot"; REBOOT_NEEDED=1; }
    fi

    step "Reserving CPU core 3 for the matrix (isolcpus=3)"
    if grep -qE '(^|\s)isolcpus=3(\s|$)' "$BOOT_CMDLINE"; then
        info "already set"
    else
        backup_once "$BOOT_CMDLINE"
        # cmdline.txt is a single line; replace an existing isolcpus, otherwise append it.
        if grep -qE '(^|\s)isolcpus=' "$BOOT_CMDLINE"; then
            sed -i -E '1 s/(^|\s)isolcpus=\S*/\1isolcpus=3/' "$BOOT_CMDLINE"
        else
            sed -i -E '1 s/\s*$/ isolcpus=3/' "$BOOT_CMDLINE"
        fi
        info "$(cat "$BOOT_CMDLINE")"
        REBOOT_NEEDED=1
    fi

fi

# ================================================================ 2. Matrix library
#
# The library has bindings for Python and none for Node, so a small Python
# script drives the panel (pi/panel_driver.py). It is all that runs in here.

step "Python environment of the panel driver $VENV_DIR"
mkdir -p "$INSTALL_DIR"
if [[ -x "$VENV_DIR/bin/python" ]] && ! "$VENV_DIR/bin/python" -c 'import sys' 2>/dev/null; then
    warn "venv is broken (e.g. after a Python update) – recreating it"
    rm -rf "$VENV_DIR"
fi
[[ -d "$VENV_DIR" ]] || python3 -m venv "$VENV_DIR"
# Only install packages when requirements.txt has changed (saves time on a Pi 3).
REQ_MARKER="$VENV_DIR/.requirements.txt"
if cmp -s "$REPO_DIR/requirements.txt" "$REQ_MARKER"; then
    info "Python packages already up to date"
else
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    "$VENV_DIR/bin/pip" install --quiet -r "$REPO_DIR/requirements.txt"
    cp "$REPO_DIR/requirements.txt" "$REQ_MARKER"
    info "Python packages installed"
fi

step "rpi-rgb-led-matrix @ ${LIB_COMMIT:0:12}"
if [[ "$(git -C "$LIB_DIR" rev-parse HEAD 2>/dev/null || true)" != "$LIB_COMMIT" ]]; then
    rm -rf "$LIB_DIR"
    git init -q "$LIB_DIR"
    git -C "$LIB_DIR" remote add origin "$LIB_REPO"
    git -C "$LIB_DIR" fetch -q --depth 1 origin "$LIB_COMMIT"
    git -C "$LIB_DIR" checkout -q FETCH_HEAD
    info "source downloaded"
else
    info "source already present"
fi

MARKER="$VENV_DIR/.rgbmatrix-commit"
if [[ "$(cat "$MARKER" 2>/dev/null)" == "$LIB_COMMIT" ]] && "$VENV_DIR/bin/python" -c 'import rgbmatrix' 2>/dev/null; then
    info "Python bindings already installed"
else
    info "Building the Python bindings (about 5-10 minutes on a Pi 3) ..."
    "$VENV_DIR/bin/pip" install --quiet "$LIB_DIR"
    "$VENV_DIR/bin/python" -c 'import rgbmatrix'
    echo "$LIB_COMMIT" > "$MARKER"
    info "installed"
fi

# ================================================================ 3. App + service

step "Server (TypeScript, built into one file)"
BUNDLE_DIR="$REPO_DIR/dist/pi"
if [[ -d "$REPO_DIR/core" ]]; then
    # The repo itself is here (git clone): build the server. npm run deploy builds it on the PC and
    # sends the finished file without the sources, so that nothing is compiled here.
    if ! command -v npm >/dev/null; then
        echo "npm is missing – please run the script once without --app." >&2
        exit 1
    fi
    # As the owner of the folder, so that nothing in it ends up belonging to root.
    REPO_OWNER="$(stat -c %U "$REPO_DIR")"
    LOCK_MARKER="$REPO_DIR/node_modules/.package-lock.installed"
    if cmp -s "$REPO_DIR/package-lock.json" "$LOCK_MARKER"; then
        info "build tools already up to date"
    else
        info "Installing the build tools ..."
        (cd "$REPO_DIR" && runuser -u "$REPO_OWNER" -- npm ci --no-audit --no-fund --loglevel=error)
        runuser -u "$REPO_OWNER" -- cp "$REPO_DIR/package-lock.json" "$LOCK_MARKER"
    fi
    (cd "$REPO_DIR" && runuser -u "$REPO_OWNER" -- npm run --silent build >/dev/null)
    info "built"
else
    info "taken as it was built on the PC"
fi
for f in "$BUNDLE_DIR/server.mjs" "$REPO_DIR/dist/app/app.js"; do
    if [[ ! -s "$f" ]]; then
        echo "Missing file: $f (npm run build creates it)" >&2
        exit 1
    fi
done

step "App to $INSTALL_DIR"
# The pages, the language files and the sprite sheets; the app's sources and its projects for the
# stores stay behind
rsync -a --delete --delete-excluded --exclude '__pycache__' --exclude '/src' --exclude '/android' --exclude '/ios' \
    --exclude '/native' --exclude '/tsconfig.json' "$REPO_DIR/app/" "$INSTALL_DIR/app/"
# The panel driver and the hardware test
rsync -a --delete --delete-excluded --exclude '__pycache__' --exclude 'src' --exclude 'test' "$REPO_DIR/pi/" "$INSTALL_DIR/pi/"
mkdir -p "$INSTALL_DIR/dist/pi" "$INSTALL_DIR/dist/app"
rsync -a --delete "$BUNDLE_DIR/" "$INSTALL_DIR/dist/pi/"
# The app's script, for the pet page
install -m 644 "$REPO_DIR/dist/app/app.js" "$INSTALL_DIR/dist/app/app.js"
# Which release this is, where it came from and how it updates itself (pi/src/update.ts). Only a
# release package has VERSION; set up from a checkout, the Pi does not look for updates.
for f in VERSION REPO install.sh; do
    if [[ -e "$REPO_DIR/VERSION" && -e "$REPO_DIR/$f" ]]; then
        install -m "$([[ $f == *.sh ]] && echo 755 || echo 644)" "$REPO_DIR/$f" "$INSTALL_DIR/$f"
    else
        rm -f "$INSTALL_DIR/$f"
    fi
done
[[ -e "$INSTALL_DIR/VERSION" ]] && info "release $(cat "$INSTALL_DIR/VERSION")"
mkdir -p "$DATA_DIR"
chmod 755 "$DATA_DIR"

step "Configuration $CONFIG_DIR/config.ini"
mkdir -p "$CONFIG_DIR"
if [[ -e "$REPO_DIR/config.ini" ]]; then
    # A config.ini in the repo folder takes precedence (that is how the configuration travels from the PC).
    if cmp -s "$REPO_DIR/config.ini" "$CONFIG_DIR/config.ini"; then
        info "already up to date (from config.ini in the repo folder)"
    else
        [[ -e "$CONFIG_DIR/config.ini" ]] && cp -a "$CONFIG_DIR/config.ini" "$CONFIG_DIR/config.ini.bak"
        install -m 600 "$REPO_DIR/config.ini" "$CONFIG_DIR/config.ini"
        info "taken from config.ini in the repo folder"
    fi
elif [[ -e "$CONFIG_DIR/config.ini" ]]; then
    info "exists – left untouched"
else
    install -m 600 "$REPO_DIR/config.example.ini" "$CONFIG_DIR/config.ini"
    info "created from the template (everything optional, the defaults apply)"
fi
chmod 600 "$CONFIG_DIR/config.ini"
if ! grep -qE '^\s*latitude\s*=\s*\S' "$CONFIG_DIR/config.ini" && ! grep -q '"location":\[' "$DATA_DIR/settings.json" 2>/dev/null; then
    info "No location yet: enter it on the settings page (http://$(hostname).local/) for the weather"
fi

step "systemd service $SERVICE_NAME"
install -m 644 "$REPO_DIR/systemd/$SERVICE_NAME.service" "/etc/systemd/system/$SERVICE_NAME.service"
# The update button's unit (started on demand only, so it is not enabled)
install -m 644 "$REPO_DIR/systemd/$SERVICE_NAME-update.service" "/etc/systemd/system/$SERVICE_NAME-update.service"
systemctl daemon-reload
systemctl enable --quiet "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 5
if systemctl is-active --quiet "$SERVICE_NAME"; then
    info "running"
else
    warn "The service is not running – check the log: journalctl -u $SERVICE_NAME -e"
fi

# ================================================================ Done

step "Done"
info "Web interface: http://$(hostname).local/  or  http://$(hostname -I | awk '{print $1}')/"
info "Pet page in the browser: http://$(hostname).local/pet  (or connect the Blobling app to this Pi)"
if [[ $REBOOT_NEEDED -eq 1 ]]; then
    warn "Boot settings were changed – please reboot: sudo reboot"
fi
