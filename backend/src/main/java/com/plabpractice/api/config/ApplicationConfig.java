package com.plabpractice.api.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

@Configuration
public class ApplicationConfig {

    private final Environment environment;

    public ApplicationConfig(Environment environment) {
        this.environment = environment;
    }

    @EventListener
    public void handleApplicationReady(ApplicationReadyEvent event) {
        validateConfiguration();
    }

    private void validateConfiguration() {
        try {
            System.out.println("=== Application Configuration Validation ===");

            String jwtSecret = environment.getProperty("jwt.secret", "");
            String allowedOrigins = environment.getProperty("cors.allowed-origins", "");
            String databaseUrl = environment.getProperty("spring.datasource.url", "");
            String activeProfile = environment.getProperty("spring.profiles.active", "default");

            System.out.println("🚀 Active Profile: " + activeProfile);

            // Validate JWT Secret
            if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
                System.err.println("⚠️  WARNING: JWT_SECRET environment variable is not set!");
                System.err.println("   Application may fail during JWT operations");
            } else if (jwtSecret.length() < 32) {
                System.err.println("⚠️  WARNING: JWT_SECRET should be at least 32 characters long");
                System.out.println("✅ JWT Secret: Set (length: " + jwtSecret.length() + ")");
            } else {
                System.out.println("✅ JWT Secret: Valid (length: " + jwtSecret.length() + ")");
            }

            // Validate CORS Origins
            if (allowedOrigins == null || allowedOrigins.trim().isEmpty()) {
                System.out.println("⚠️  CORS_ALLOWED_ORIGINS not set, using application defaults");
            } else {
                System.out.println("✅ CORS Origins: " + allowedOrigins);
            }

            // Validate Database URL
            if (databaseUrl == null || databaseUrl.trim().isEmpty()) {
                System.out.println("⚠️  DATABASE_URL not set, using application defaults");
            } else {
                System.out.println("✅ Database URL: " + (databaseUrl.contains("postgresql") ? "PostgreSQL" : "Other"));
            }

            System.out.println("=== Configuration Validation Complete ===");
        } catch (Exception e) {
            System.err.println("❌ Error during configuration validation: " + e.getMessage());
            // Don't throw exception to prevent startup failure
        }
    }
}