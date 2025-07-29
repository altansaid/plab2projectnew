package com.plabpractice.api.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

        // No dependencies needed - DataLoader is completely disabled

        @Override
        public void run(String... args) throws Exception {
                // DataLoader completely disabled - no mock data will be loaded
                // Users should create their own categories and cases through the admin
                // interface
                System.out.println("=== DataLoader: DISABLED - No mock data will be loaded ===");
                System.out.println("Create your own categories and cases through the application interface.");
        }

        // All mock data methods removed - DataLoader is completely clean
        // Use the admin interface or API endpoints to create categories and cases
}