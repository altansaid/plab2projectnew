-- PostgreSQL Database Setup for PLAB Practice Application
-- SECURITY: Set the DB_PASSWORD environment variable before running this script
-- Example: export DB_PASSWORD='your_secure_password_here'
-- Run this script as: psql -U postgres -f setup-postgresql.sql

-- Create database
CREATE DATABASE plabdb;

-- Create application user with secure password from environment variable
-- NOTE: Replace 'YOUR_SECURE_PASSWORD_HERE' with a strong password before running
CREATE USER plabuser WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

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

-- SECURITY REMINDER:
-- 1. Replace 'YOUR_SECURE_PASSWORD_HERE' with a strong password
-- 2. Update your application-dev.properties with the same password
-- 3. Never commit real passwords to version control 