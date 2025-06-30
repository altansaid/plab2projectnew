#!/bin/bash

echo "🐘 Starting PLAB Practice Application with PostgreSQL..."
echo ""

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "   Start PostgreSQL first: brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if psql -U plabuser -d plabdb -c '\q' > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to plabdb database"
    echo "   Run setup script first: psql -U $(whoami) -d postgres -f setup-postgresql.sql"
    exit 1
fi

echo ""
echo "🚀 Starting Spring Boot application with PostgreSQL..."
echo "   Profile: development"
echo "   Database: PostgreSQL (plabdb)"
echo "   URL: jdbc:postgresql://localhost:5432/plabdb"
echo ""

cd backend
./gradlew bootRun --args='--spring.profiles.active=dev' 