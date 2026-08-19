#!/usr/bin/env bash
# Deploy gas-booking plugin to every WP install that runs it.
#
# The multisite VPS (72.61.207.109) is the primary — every Web
# Builder / Pro Builder client site runs from ONE copy of the plugin
# there. Custom-server sites each have their own copy and would
# otherwise silently drift behind. This script keeps them in step
# so bug fixes / speed passes land estate-wide in one command.
#
# Usage:
#   ./deploy-plugin.sh
#
# What it does:
#   1. SCPs gas-booking.php + gas-booking.js to the multisite VPS
#   2. SCPs same to each entry in CUSTOM_SITES below
#   3. Fixes ownership + reloads php-fpm on multisite (nginx)
#   4. Prints the deployed version so we can eyeball it worked
#
# To add another custom-server site to the sync, append its full
# WordPress-root path to CUSTOM_SITES (host:path shape).
#
# To skip the multisite push (e.g. troubleshooting a specific
# custom site), export SKIP_MULTISITE=1 before running.

set -euo pipefail

KEY="$HOME/.ssh/id_ed25519"
PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)/plugins/gas-booking"
LOCAL_PHP="$PLUGIN_DIR/gas-booking.php"
LOCAL_JS="$PLUGIN_DIR/assets/js/gas-booking.js"

VERSION=$(grep "GAS_BOOKING_VERSION" "$LOCAL_PHP" | head -1 | grep -oE "'[0-9.]+'" | tr -d "'")

echo "→ Deploying gas-booking v${VERSION}"
echo

# --- Multisite VPS ---
if [ "${SKIP_MULTISITE:-0}" != "1" ]; then
    MULTISITE_HOST="root@72.61.207.109"
    MULTISITE_DIR="/var/www/wordpress/wp-content/plugins/gas-booking"
    echo "[multisite VPS] $MULTISITE_HOST"
    scp -i "$KEY" -q "$LOCAL_PHP" "$MULTISITE_HOST:$MULTISITE_DIR/gas-booking.php"
    scp -i "$KEY" -q "$LOCAL_JS" "$MULTISITE_HOST:$MULTISITE_DIR/assets/js/gas-booking.js"
    ssh -i "$KEY" "$MULTISITE_HOST" "chown -R www-data:www-data $MULTISITE_DIR && systemctl reload php8.3-fpm"
    echo "  ✓ deployed"
    echo
fi

# --- Custom-server one-off sites (31.97.119.90) ---
# Format: host:absolute-path-to-WP-root
# Only sites listed here get the sync — bespoke sites the client
# owner shouldn't be touching stay out. Confirm with Steve before
# adding new ones. Apache on this box, no service reload needed.
CUSTOM_SITES=(
    "root@31.97.119.90:/var/www/bookrocketstay.custom.gas.travel"
)

for target in "${CUSTOM_SITES[@]}"; do
    host="${target%%:*}"
    wp_root="${target#*:}"
    site_name=$(basename "$wp_root")
    plugin_dir="$wp_root/wp-content/plugins/gas-booking"
    echo "[custom] $site_name ($host)"
    scp -i "$KEY" -q "$LOCAL_PHP" "$host:$plugin_dir/gas-booking.php"
    scp -i "$KEY" -q "$LOCAL_JS" "$host:$plugin_dir/assets/js/gas-booking.js"
    ssh -i "$KEY" "$host" "chown -R www-data:www-data $plugin_dir"
    echo "  ✓ deployed"
    echo
done

echo "Done. All targets on v${VERSION}."
