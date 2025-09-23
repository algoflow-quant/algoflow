#!/bin/bash
set -e

# Load environment variables safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../.env"

# Database variables
DB_NAME="algoflowdb"
SCHEMA_FILE="schema.sql"

echo "Cleaning up old repositories..."
# Remove the problematic PPA repository
sudo rm -f /etc/apt/sources.list.d/timescale-ubuntu-timescaledb-ppa-*
sudo add-apt-repository --remove ppa:timescale/timescaledb-ppa -y 2>/dev/null || true

# Remove old PostgreSQL repo if it exists (to fix the legacy keyring warning)
sudo rm -f /etc/apt/sources.list.d/pgdg.list
sudo rm -f /etc/apt/trusted.gpg.d/postgresql.gpg

echo "Updating package lists..."
sudo apt-get update -y

echo "Installing prerequisites..."
sudo apt-get install -y wget gnupg lsb-release curl

echo "Adding PostgreSQL repository with proper key management..."
sudo mkdir -p /etc/apt/keyrings
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
sudo sh -c "echo 'deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main' > /etc/apt/sources.list.d/pgdg.list"

echo "Adding TimescaleDB repository (packagecloud, NOT PPA)..."
# Remove any existing TimescaleDB repo files
sudo rm -f /etc/apt/sources.list.d/timescaledb.list

# Add the correct packagecloud repository
echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/timescaledb.gpg

echo "Updating package lists with new repositories..."
sudo apt-get update -y

echo "Installing PostgreSQL 16..."
sudo apt-get install -y postgresql-16 postgresql-client-16

echo "Installing TimescaleDB..."
sudo apt-get install -y timescaledb-2-postgresql-16

echo "Configuring TimescaleDB..."
sudo timescaledb-tune --quiet --yes

echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "Creating database user and database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true

echo "Enabling TimescaleDB extension..."
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

echo "Running schema.sql..."
sudo -u postgres psql -d $DB_NAME -f "$SCHEMA_FILE"

echo "Creating hypertable..."
sudo -u postgres psql -d $DB_NAME -c "SELECT create_hypertable('stock_metadata', 'date_scraped', if_not_exists => TRUE);"

echo "Granting privileges to user..."
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"

echo "Done!"