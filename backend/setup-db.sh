#!/bin/bash

# PostgreSQL connection details - Updated to match application-dev.properties
DB_NAME="plabdb"
DB_USER="plabuser"
DB_PASSWORD="plab_secure_password_2024!"

# Create database if it doesn't exist
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE $DB_NAME"

# Create user if it doesn't exist and grant privileges
psql -U postgres -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;"

psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 