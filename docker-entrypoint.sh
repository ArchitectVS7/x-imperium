#!/bin/bash
set -e

# Generate config.php from environment variables
# Railway MySQL addon provides: MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
# Docker Compose provides: CONF_DATABASE_* variables

# Determine which env vars to use (Railway vs Docker Compose)
DB_HOST="${MYSQL_HOST:-${CONF_DATABASE_HOSTNAME:-localhost}}"
DB_NAME="${MYSQL_DATABASE:-${CONF_DATABASE_NAME:-ximperium}}"
DB_USER="${MYSQL_USER:-${CONF_DATABASE_USERNAME:-ximperium}}"
DB_PASS="${MYSQL_PASSWORD:-${CONF_DATABASE_PASSWORD:-ximperium_secret}}"
DB_DRIVER="${CONF_DATABASE_DRIVER:-mysqli}"
TIMEZONE="${CONF_TIMEZONE:-UTC}"

# Create config.php from template
CONFIG_FILE="/var/www/html/include/config.php"
TEMPLATE_FILE="/var/www/html/include/config_orig.php"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Generating config.php from environment variables..."

    sed -e "s/{db_hostname}/${DB_HOST}/g" \
        -e "s/{db_name}/${DB_NAME}/g" \
        -e "s/{db_username}/${DB_USER}/g" \
        -e "s/{db_password}/${DB_PASS}/g" \
        -e "s/{db_driver}/${DB_DRIVER}/g" \
        "$TEMPLATE_FILE" > "$CONFIG_FILE"

    # Update timezone if specified
    if [ "$TIMEZONE" != "America/Montreal" ]; then
        sed -i "s|America/Montreal|${TIMEZONE}|g" "$CONFIG_FILE"
    fi

    echo "config.php generated successfully"
fi

# Ensure templates_c directories exist and are writable
mkdir -p /var/www/html/templates_c/{system,game,installer,xml/system}
chown -R www-data:www-data /var/www/html/templates_c
chmod -R 775 /var/www/html/templates_c

# Execute the main command (Apache)
exec "$@"
