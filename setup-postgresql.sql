-- PostgreSQL Database Setup for PLAB Practice Application
-- Run this script as: psql -U postgres -f setup-postgresql.sql

-- Create database
CREATE DATABASE plabdb;

-- Create application user with secure password
CREATE USER plabuser WITH ENCRYPTED PASSWORD 'plab_secure_password_2024!';

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