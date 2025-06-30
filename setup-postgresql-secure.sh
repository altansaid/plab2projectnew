#!/bin/bash

# Secure PostgreSQL Database Setup for PLAB Practice Application
# This script prompts for passwords instead of hardcoding them

echo "🔐 PLAB Practice Platform - Secure Database Setup"
echo "=================================================="
echo ""

# Check if PostgreSQL is running
if ! pg_isready &>/dev/null; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "📋 This script will:"
echo "1. Create the 'plabdb' database"
echo "2. Create the 'plabuser' with a secure password you provide"
echo "3. Grant necessary privileges"
echo ""

# Prompt for database password
echo "🔑 Enter a strong password for the 'plabuser' database user:"
read -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password cannot be empty. Exiting."
    exit 1
fi

# Validate password strength (basic check)
if [ ${#DB_PASSWORD} -lt 12 ]; then
    echo "⚠️  Warning: Password is less than 12 characters. Consider using a stronger password."
    echo "Continue anyway? (y/N): "
    read -n 1 continue_choice
    echo ""
    if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
        echo "Exiting. Please run again with a stronger password."
        exit 1
    fi
fi

echo "🚀 Setting up database..."

# Create temporary SQL file
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << EOF
-- Create database
CREATE DATABASE plabdb;

-- Create application user with secure password
CREATE USER plabuser WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE plabdb TO plabuser;

-- Switch to the application database
\c plabdb;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO plabuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO plabuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO plabuser;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO plabuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO plabuser;

-- Display confirmation
SELECT 'Database setup completed successfully!' AS status;
EOF

# Execute the SQL
if psql -U postgres -f "$TEMP_SQL"; then
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update your backend/src/main/resources/application-dev.properties"
    echo "   Set: spring.datasource.password=$DB_PASSWORD"
    echo "2. For production, use environment variables instead of hardcoded passwords"
    echo "3. Test the connection: ./gradlew bootRun --args='--spring.profiles.active=dev'"
else
    echo "❌ Database setup failed. Please check the error messages above."
fi

# Clean up temporary file
rm -f "$TEMP_SQL"

echo ""
echo "🔐 Security reminder: Keep your database password secure and never commit it to version control!" 