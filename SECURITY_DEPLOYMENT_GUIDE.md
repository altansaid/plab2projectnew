# Security Deployment Guide

## 🚨 CRITICAL: Complete BEFORE Production Deployment

### 1. Environment Variables Configuration

Create a `.env` file with the following secure values:

```bash
# Database Configuration (Replace with your production database)
DATABASE_URL=jdbc:postgresql://your-production-db:5432/plabdb
DATABASE_DRIVER=org.postgresql.Driver
DATABASE_USERNAME=your_secure_username
DATABASE_PASSWORD=your_very_secure_password

# JWT Configuration
JWT_SECRET=your_very_long_secure_random_jwt_secret_key_at_least_256_bits
JWT_EXPIRATION=86400000

# CORS Configuration (Replace with your actual frontend domains)
CORS_ALLOWED_ORIGINS=https://plab2projectnew.vercel.app

# Security Settings
H2_CONSOLE_ENABLED=false
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=strict

# Logging (Production levels)
LOG_LEVEL_ROOT=WARN
LOG_LEVEL_APP=INFO
LOG_LEVEL_WEB=WARN
LOG_LEVEL_HIBERNATE=ERROR
LOG_LEVEL_MESSAGING=WARN
LOG_LEVEL_WEBSOCKET=WARN

# JPA Settings (Production)
JPA_DDL_AUTO=validate
JPA_SHOW_SQL=false
JPA_FORMAT_SQL=false
JPA_DIALECT=org.hibernate.dialect.PostgreSQLDialect
```

### 2. Database Migration

⚠️ **CRITICAL**: Replace H2 with PostgreSQL for production:

1. Add PostgreSQL dependency
2. Set up production database
3. Run schema migration
4. Update connection settings

### 3. Password Policy Enhancement

Update `AuthController.java` registration validation:

```java
@Size(min = 8, message = "Password must be at least 8 characters")
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
         message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
```

### 4. HTTPS Configuration

Add to `application.properties`:

```properties
# Force HTTPS
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${SSL_KEYSTORE_PASSWORD}
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=your-app
```

### 5. Security Headers

The application now includes:

- ✅ X-Frame-Options: DENY (clickjacking protection)
- ✅ X-Content-Type-Options: nosniff
- ✅ Secure cookies
- ✅ HttpOnly cookies
- ✅ SameSite cookies

### 6. Input Validation

✅ Already implemented:

- Email validation
- Password length validation
- Request body validation with `@Valid`

### 7. Error Handling

Current status: ⚠️ **NEEDS IMPROVEMENT**

- Generic error messages in production
- No stack trace exposure
- Proper logging without sensitive data

### 8. Rate Limiting

**MISSING - IMPLEMENT BEFORE DEPLOYMENT**

Add rate limiting dependency and configuration:

```xml
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>7.6.0</version>
</dependency>
```

### 9. Monitoring & Logging

**RECOMMENDED**:

- Set up application monitoring (e.g., Micrometer + Prometheus)
- Configure secure logging (no sensitive data)
- Set up alerting for security events

### 10. Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated to PostgreSQL
- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for production domains only
- [ ] H2 console disabled
- [ ] Production logging levels set
- [ ] Rate limiting implemented
- [ ] Security testing completed
- [ ] Dependency scan completed
- [ ] Strong JWT secret generated (256+ bits)
- [ ] Database credentials secured
- [ ] Error messages sanitized

### 11. Security Testing

Before deployment, run:

```bash
# Backend dependency check
./gradlew dependencyCheckAnalyze

# Frontend vulnerability scan
npm audit

# Security headers test (after deployment)
curl -I https://yourdomain.com/api/health
```

### 12. Post-Deployment Monitoring

Monitor for:

- Failed authentication attempts
- Unusual API access patterns
- Database connection errors
- JWT token validation failures

---

## ⚡ Quick Security Fixes Applied

1. ✅ **Fixed Frontend Dependencies**: Updated Vite to resolve esbuild vulnerability
2. ✅ **Environment Variables**: Externalized all sensitive configuration
3. ✅ **CORS Security**: Fixed overly permissive `origins = "*"` in CaseController
4. ✅ **H2 Console**: Disabled by default, only enabled in development
5. ✅ **Security Headers**: Added frame options, content type options
6. ✅ **Production Logging**: Reduced log verbosity for production

## 🔥 Still Requires Immediate Attention

1. **Generate Secure JWT Secret**: Use a cryptographically secure random string
2. **Setup Production Database**: Replace H2 with PostgreSQL/MySQL
3. **Enable HTTPS**: Configure SSL certificates
4. **Implement Rate Limiting**: Prevent brute force attacks
5. **Enhance Password Policy**: Stronger requirements
6. **Security Testing**: Penetration testing before go-live
