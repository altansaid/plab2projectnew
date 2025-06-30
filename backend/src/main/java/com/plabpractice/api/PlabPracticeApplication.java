package com.plabpractice.api;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.io.File;

@SpringBootApplication
@EntityScan("com.plabpractice.api.model")
@EnableJpaRepositories("com.plabpractice.api.repository")
public class PlabPracticeApplication {
    public static void main(String[] args) {
        // Load environment variables from .env.production file
        loadEnvironmentVariables();

        SpringApplication.run(PlabPracticeApplication.class, args);
    }

    private static void loadEnvironmentVariables() {
        try {
            // Look for .env.production file in the project root
            File envFile = new File(".env.production");
            if (!envFile.exists()) {
                // Try looking in the parent directory if running from backend folder
                envFile = new File("../.env.production");
            }

            if (envFile.exists()) {
                System.out.println("Loading environment variables from: " + envFile.getAbsolutePath());

                Dotenv dotenv = Dotenv.configure()
                        .filename(".env.production")
                        .directory(envFile.getParent() != null ? envFile.getParent() : ".")
                        .ignoreIfMissing()
                        .load();

                // Set each environment variable as a system property
                dotenv.entries().forEach(entry -> {
                    System.setProperty(entry.getKey(), entry.getValue());
                    System.out.println("Loaded env var: " + entry.getKey() + " = " +
                            (entry.getKey().toLowerCase().contains("password") ||
                                    entry.getKey().toLowerCase().contains("secret") ? "***" : entry.getValue()));
                });
            } else {
                System.out.println("No .env.production file found. Using system environment variables or defaults.");
            }
        } catch (Exception e) {
            System.err.println("Error loading .env.production file: " + e.getMessage());
            e.printStackTrace();
        }
    }
}