package com.plabpractice.api.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;

import javax.sql.DataSource;

@Configuration
public class ApplicationConfig {

    private final Environment environment;

    public ApplicationConfig(Environment environment) {
        this.environment = environment;
    }

    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSource dataSource() {
        String databaseUrl = environment.getProperty("DATABASE_URL");

        // Transform Render's postgresql:// URL to JDBC format
        if (databaseUrl != null && databaseUrl.startsWith("postgresql://")) {
            databaseUrl = "jdbc:" + databaseUrl;
            System.out.println("🔄 Transformed DATABASE_URL for JDBC: "
                    + databaseUrl.substring(0, Math.min(50, databaseUrl.length())) + "...");
        }

        return DataSourceBuilder.create()
                .url(databaseUrl != null ? databaseUrl : environment.getProperty("spring.datasource.url"))
                .username(environment.getProperty("DATABASE_USERNAME",
                        environment.getProperty("spring.datasource.username")))
                .password(environment.getProperty("DATABASE_PASSWORD",
                        environment.getProperty("spring.datasource.password")))
                .driverClassName(environment.getProperty("spring.datasource.driverClassName"))
                .build();
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
            String databaseUrl = environment.getProperty("DATABASE_URL");
            String fallbackUrl = environment.getProperty("spring.datasource.url", "");
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
            if (databaseUrl != null && !databaseUrl.trim().isEmpty()) {
                if (databaseUrl.startsWith("postgresql://")) {
                    System.out.println("✅ DATABASE_URL: Render PostgreSQL format detected - will transform to JDBC");
                } else if (databaseUrl.startsWith("jdbc:postgresql://")) {
                    System.out.println("✅ DATABASE_URL: Already in JDBC format");
                } else {
                    System.out.println(
                            "✅ DATABASE_URL: " + (databaseUrl.contains("postgresql") ? "PostgreSQL" : "Other"));
                }
            } else if (fallbackUrl != null && !fallbackUrl.trim().isEmpty()) {
                System.out.println("✅ Database URL: Using fallback from application properties");
            } else {
                System.out.println("⚠️  No DATABASE_URL found, using application defaults");
            }

            System.out.println("=== Configuration Validation Complete ===");
        } catch (Exception e) {
            System.err.println("❌ Error during configuration validation: " + e.getMessage());
            // Don't throw exception to prevent startup failure
        }
    }
}