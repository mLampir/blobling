#!/usr/bin/env bash
#
# Installs the newest release on a Raspberry Pi, without git and without build tools:
#
#   curl -fsSL https://github.com/mLampir/blobling/releases/latest/download/install.sh | sudo bash
#
#   ... | sudo bash -s -- --app            update: only the app, no system update
#   ... | sudo bash -s -- --version v1.2.0 a given release instead of the newest
#                                          (LED_MATRIX_VERSION=v1.2.0 does the same; the update
#                                          button's unit uses it for a beta, pi/src/update.ts)
#
# It downloads the release package, checks its checksum, unpacks it to
# /opt/led-matrix/releases/<version> and runs setup.sh from there. The previous
# release stays next to it (one only), so an update can be undone by running its
# setup.sh again. The release workflow fills in the repository below; to install
# from a fork, set LED_MATRIX_REPO=<owner>/<repo>.

set -euo pipefail

# Everything is in a function, so a download that breaks off halfway runs nothing.
main() {
    local repo="${LED_MATRIX_REPO:-@REPO@}"
    local releases="/opt/led-matrix/releases"
    local version="${LED_MATRIX_VERSION:-}" setup_args=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --app) setup_args=(--app) ;;
            --version) version="${2:-}"; shift ;;
            *) echo "Unknown option: $1 (allowed: --app, --version <version>)" >&2; exit 1 ;;
        esac
        shift
    done

    if [[ $EUID -ne 0 ]]; then
        echo "Please run as root: ... | sudo bash" >&2
        exit 1
    fi
    if [[ ! "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
        echo "No repository known – set LED_MATRIX_REPO=<owner>/<repo>" >&2
        exit 1
    fi
    for tool in curl tar sha256sum; do
        command -v "$tool" >/dev/null || { echo "$tool is missing" >&2; exit 1; }
    done

    if [[ -z "$version" ]]; then
        # .../releases/latest redirects to .../releases/tag/<version>
        local latest
        latest="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$repo/releases/latest")"
        version="${latest##*/releases/tag/}"
        [[ "$version" != "$latest" ]] || { echo "No release found in $repo" >&2; exit 1; }
    fi
    if [[ ! "$version" =~ ^[A-Za-z0-9._-]+$ ]]; then
        echo "Not a valid version: $version" >&2
        exit 1
    fi

    local name="blobling-$version.tar.gz"
    local url="https://github.com/$repo/releases/download/$version"
    local tmp
    tmp="$(mktemp -d)"
    # expanded now: $tmp is local and gone by the time the script exits
    trap "rm -rf '$tmp'" EXIT

    printf '\033[1;34m==> Downloading %s\033[0m\n' "$name"
    curl -fsSL -o "$tmp/$name" "$url/$name"
    curl -fsSL -o "$tmp/$name.sha256" "$url/$name.sha256"
    (cd "$tmp" && sha256sum -c --quiet "$name.sha256") || { echo "Checksum does not match – stopped" >&2; exit 1; }

    local target="$releases/$version"
    rm -rf "$target"
    mkdir -p "$target"
    tar -xzf "$tmp/$name" -C "$target" --no-same-owner
    # Keep this release and the one before it.
    ls -1dt "$releases"/*/ | tail -n +3 | xargs -r rm -rf

    printf '\033[1;34m==> Installing %s\033[0m\n' "$version"
    bash "$target/setup.sh" "${setup_args[@]}" </dev/null
}

main "$@"
