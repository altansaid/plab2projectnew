package com.plabpractice.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

@Configuration
public class ApplicationConfig {

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${spring.datasource.url:}")
    private String databaseUrl;

    @EventListener
    public void handleContextRefresh(ContextRefreshedEvent event) {
        validateConfiguration();
    }

    private void validateConfiguration() {
        System.out.println("=== Application Configuration Validation ===");

        // Validate JWT Secret
        if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
            System.err.println("❌ CRITICAL: JWT_SECRET environment variable is not set!");
            throw new IllegalStateException("JWT_SECRET environment variable is required for security");
        }
        if (jwtSecret.length() < 32) {
            System.err.println("❌ CRITICAL: JWT_SECRET must be at least 32 characters long");
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters long for security");
        }
        System.out.println("✅ JWT Secret: Valid (length: " + jwtSecret.length() + ")");

        // Validate CORS Origins
        if (allowedOrigins == null || allowedOrigins.trim().isEmpty()) {
            System.out.println("⚠️  WARNING: CORS_ALLOWED_ORIGINS not set, using defaults");
        } else {
            System.out.println("✅ CORS Origins: " + allowedOrigins);
        }

        // Validate Database URL
        if (databaseUrl == null || databaseUrl.trim().isEmpty()) {
            System.out.println("⚠️  WARNING: DATABASE_URL not set, using defaults");
        } else {
            System.out
                    .println("✅ Database URL: " + (databaseUrl.startsWith("jdbc:postgresql") ? "PostgreSQL" : "Other"));
        }

        System.out.println("=== Configuration Validation Complete ===");
    }
}