package com.plabpractice.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan("com.plabpractice.api.model")
@EnableJpaRepositories("com.plabpractice.api.repository")
public class PlabPracticeApplication {
    public static void main(String[] args) {
        // Log startup information
        System.out.println("Starting PLAB 2 Practice Application...");
        System.out.println("Active Profile: " + System.getProperty("spring.profiles.active", "default"));

        SpringApplication.run(PlabPracticeApplication.class, args);
    }
}