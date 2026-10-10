#!/usr/bin/env bash
#
# Hardware test: Node draws test pictures and sends them through the panel
# driver to the LED panel (see panel-test.mjs). The display service is stopped
# for the test, which takes about a minute, and started again afterwards.
#
#   sudo bash /opt/led-matrix/pi/panel-test.sh

set -euo pipefail

SERVICE_NAME="led-matrix"

if [[ $EUID -ne 0 ]]; then
    echo "Please run as root: sudo bash $0" >&2
    exit 1
fi
if ! command -v node >/dev/null; then
    echo "Node is not installed – please run the full setup once: sudo bash setup.sh" >&2
    exit 1
fi

WAS_RUNNING=0
systemctl is-active --quiet "$SERVICE_NAME" && WAS_RUNNING=1
restore() {
    if [[ $WAS_RUNNING -eq 1 ]]; then
        systemctl start "$SERVICE_NAME"
        echo "Service $SERVICE_NAME started again."
    fi
}
trap restore EXIT
systemctl stop "$SERVICE_NAME"

node "$(dirname "${BASH_SOURCE[0]}")/panel-test.mjs" "$@"
