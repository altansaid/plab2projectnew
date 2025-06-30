#!/bin/bash

# JWT Secret Generator for Secure Deployment
echo "🔐 Generating secure JWT secret..."
echo ""

# Generate a 256-bit (32 byte) secure random string
JWT_SECRET=$(openssl rand -base64 32)

echo "🔑 Your secure JWT secret (copy this to your .env.production file):"
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Also generate a database password
DB_PASSWORD=$(openssl rand -base64 24)
echo "🔒 Generated secure database password:"
echo "DATABASE_PASSWORD=$DB_PASSWORD"
echo ""

# Generate SSL keystore password
SSL_PASSWORD=$(openssl rand -base64 16)
echo "🛡️  Generated SSL keystore password:"
echo "SSL_KEYSTORE_PASSWORD=$SSL_PASSWORD"
echo ""

echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "1. Store these secrets securely"
echo "2. Never commit these to version control"
echo "3. Use environment variables in production"
echo "4. Rotate secrets regularly"
echo ""

echo "📋 Quick setup:"
echo "1. Copy .env.production.template to .env.production"
echo "2. Replace placeholder values with the generated secrets above"
echo "3. Update database and domain configurations"
echo "4. Set up production database (PostgreSQL recommended)"
echo "" 