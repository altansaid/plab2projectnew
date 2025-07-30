package com.plabpractice.api.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@EnableCaching
public class ApplicationConfig {

    private final Environment environment;

    public ApplicationConfig(Environment environment) {
        this.environment = environment;
    }

    @Bean
    public DataSource dataSource() {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        String jdbcUrl = null;
        String username = null;
        String password = null;

        // Parse Render's DATABASE_URL format:
        // postgresql://username:password@host:port/database
        if (databaseUrl != null && databaseUrl.startsWith("postgresql://")) {
            try {
                URI uri = URI.create(databaseUrl);

                // Extract components
                String host = uri.getHost();
                int port = uri.getPort();

                // Default to PostgreSQL standard port if not specified
                if (port == -1) {
                    port = 5432;
                    System.out.println("🔧 Port not specified in DATABASE_URL, defaulting to 5432");
                }

                String database = uri.getPath().substring(1); // Remove leading '/'

                // Extract username and password from userInfo
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] credentials = userInfo.split(":", 2);
                    username = credentials[0];
                    password = credentials[1];
                }

                // Construct proper JDBC URL
                jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, database);

                System.out.println("🔄 Parsed DATABASE_URL successfully:");
                System.out.println("   Host: " + host);
                System.out.println("   Port: " + port);
                System.out.println("   Database: " + database);
                System.out.println("   Username: "
                        + (username != null ? username.substring(0, Math.min(3, username.length())) + "***" : "null"));
                System.out.println("   JDBC URL: " + jdbcUrl);

            } catch (Exception e) {
                System.err.println("❌ Error parsing DATABASE_URL: " + e.getMessage());
                System.err.println("   Falling back to direct transformation");
                jdbcUrl = "jdbc:" + databaseUrl;
            }
        }

        DataSourceBuilder<?> builder = DataSourceBuilder.create();

        // Set URL
        if (jdbcUrl != null) {
            builder.url(jdbcUrl);
        } else {
            builder.url(environment.getProperty("spring.datasource.url"));
        }

        // Set username
        if (username != null) {
            builder.username(username);
        } else {
            String envUsername = environment.getProperty("DATABASE_USERNAME");
            if (envUsername != null) {
                builder.username(envUsername);
            } else {
                builder.username(environment.getProperty("spring.datasource.username"));
            }
        }

        // Set password
        if (password != null) {
            builder.password(password);
        } else {
            String envPassword = environment.getProperty("DATABASE_PASSWORD");
            if (envPassword != null) {
                builder.password(envPassword);
            } else {
                builder.password(environment.getProperty("spring.datasource.password"));
            }
        }

        // Set driver
        builder.driverClassName(environment.getProperty("spring.datasource.driverClassName", "org.postgresql.Driver"));

        return builder.build();
    }

    @Bean
    public CacheManager cacheManager() {
        // Use in-memory cache for simplicity - can be upgraded to Redis later
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setAllowNullValues(false); // Don't cache null values
        return cacheManager;
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
                    System.out.println("✅ DATABASE_URL: Render PostgreSQL format detected - will parse and transform");
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