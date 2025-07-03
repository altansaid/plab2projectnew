package com.plabpractice.api.config;

import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

        private final CategoryRepository categoryRepository;
        private final CaseRepository caseRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;

        // Constructor injection with @Lazy to break circular dependency
        public DataLoader(CategoryRepository categoryRepository,
                        CaseRepository caseRepository,
                        UserRepository userRepository,
                        @Lazy PasswordEncoder passwordEncoder) {
                this.categoryRepository = categoryRepository;
                this.caseRepository = caseRepository;
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
        }

        @Override
        public void run(String... args) throws Exception {
                try {
                        System.out.println("=== DataLoader: Starting data initialization ===");

                        // Fix image URLs that have duplicate /api prefix (one-time migration)
                        fixImageUrls();

                        // Load default users if database is empty
                        if (userRepository.count() == 0) {
                                System.out.println("Database is empty, loading default users...");
                                loadDefaultUsers();
                        } else {
                                System.out.println("Users already exist, skipping user creation");
                        }

                        // Only load sample cases if database is empty (first startup)
                        if (caseRepository.count() == 0) {
                                System.out.println("Loading sample cases...");
                                loadSampleCases();
                        } else {
                                System.out.println("Cases already exist, skipping case creation");
                        }

                        System.out.println("=== DataLoader: Initialization complete ===");
                } catch (Exception e) {
                        System.err.println("❌ Error during data loading: " + e.getMessage());
                        e.printStackTrace();
                        // Don't throw the exception to prevent application startup failure
                        System.err.println("⚠️  Application will continue without sample data");
                }
        }

        private void fixImageUrls() {
                try {
                        System.out.println("Checking for image URLs that need fixing...");

                        // Find all cases with image URLs that have duplicate /api prefix
                        var casesWithImages = caseRepository.findAll().stream()
                                        .filter(c -> c.getImageUrl() != null
                                                        && c.getImageUrl().startsWith("/api/uploads/images/"))
                                        .toList();

                        if (!casesWithImages.isEmpty()) {
                                System.out.println("Found " + casesWithImages.size() + " cases with image URLs to fix");

                                for (Case caseEntity : casesWithImages) {
                                        String oldUrl = caseEntity.getImageUrl();
                                        String newUrl = oldUrl.replace("/api/uploads/images/", "/uploads/images/");
                                        caseEntity.setImageUrl(newUrl);
                                        caseRepository.save(caseEntity);
                                        System.out.println("Fixed image URL: " + oldUrl + " -> " + newUrl);
                                }

                                System.out.println("Image URL migration completed!");
                        } else {
                                System.out.println("No image URLs need fixing");
                        }
                } catch (Exception e) {
                        System.err.println("Error during image URL migration: " + e.getMessage());
                        e.printStackTrace();
                }
        }

        private void loadDefaultUsers() {
                // Create default admin user
                User admin = new User();
                admin.setName("Admin User");
                admin.setEmail("admin@plab.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(User.Role.ADMIN);
                userRepository.save(admin);

                // Create default regular user
                User user = new User();
                user.setName("Test User");
                user.setEmail("user@plab.com");
                user.setPassword(passwordEncoder.encode("user123"));
                user.setRole(User.Role.USER);
                userRepository.save(user);

                System.out.println("Default users created:");
                System.out.println("Admin: admin@plab.com / admin123");
                System.out.println("User: user@plab.com / user123");
        }

        private void loadSampleCases() {
                // Create a single category for sample cases
                Category sampleCategory = createCategory("General Practice", "General medical practice cases");

                // Create only 3 sample cases as requested
                createCase(sampleCategory, "Chest Pain Assessment", "Acute chest pain evaluation",
                                "A 45-year-old man presents to the emergency department with sudden onset of severe chest pain. The pain started 2 hours ago while he was at work and is described as crushing and radiating to his left arm. He appears sweaty and anxious.",
                                "Take a focused history, perform a cardiovascular examination, and discuss immediate management including ECG interpretation and differential diagnosis.",
                                "Present with chest pain, answer questions about the pain characteristics, family history, and risk factors. Show appropriate level of concern and anxiety.",
                                "Observe communication skills, systematic approach to chest pain, and ability to prioritize urgent investigations.",
                                "Demonstrate competency in acute chest pain assessment, ECG interpretation, and emergency management protocols.",
                                Case.Difficulty.INTERMEDIATE, 15);

                createCase(sampleCategory, "Hypertension Management", "Routine hypertension follow-up",
                                "A 55-year-old woman attends for routine follow-up of her hypertension. Her blood pressure readings at home have been consistently elevated (160/95 mmHg) despite current medication.",
                                "Conduct a comprehensive review of hypertension management, assess cardiovascular risk factors, and discuss treatment optimization.",
                                "Present as a patient with poorly controlled hypertension, discuss lifestyle factors, medication compliance, and concerns about side effects.",
                                "Evaluate systematic approach to cardiovascular risk assessment and shared decision-making skills.",
                                "Demonstrate competency in hypertension management, cardiovascular risk stratification, and patient education.",
                                Case.Difficulty.BEGINNER, 12);

                createCase(sampleCategory, "Acute Asthma Attack", "Emergency asthma management",
                                "An 8-year-old child is brought by parents with acute shortness of breath, wheezing, and cough. The child appears distressed and is using accessory muscles to breathe.",
                                "Assess the severity of the asthma attack, provide immediate management, and communicate with both child and parents about the treatment plan.",
                                "Present as worried parents with a child having an asthma attack. Be anxious but cooperative, provide relevant history about triggers and previous episodes.",
                                "Observe pediatric emergency skills, family communication, and systematic approach to acute asthma management.",
                                "Demonstrate competency in pediatric asthma assessment, emergency treatment protocols, and family-centered care.",
                                Case.Difficulty.ADVANCED, 10);

                System.out.println("3 sample cases loaded successfully!");
        }

        private Category createCategory(String name, String description) {
                Category category = new Category();
                category.setName(name);
                category.setDescription(description);
                return categoryRepository.save(category);
        }

        private Case createCase(Category category, String title, String description, String scenario,
                        String doctorRole, String patientRole, String observerNotes,
                        String learningObjectives, Case.Difficulty difficulty, Integer duration) {
                Case caseEntity = new Case();
                caseEntity.setCategory(category);
                caseEntity.setTitle(title);
                caseEntity.setDescription(description);
                caseEntity.setScenario(scenario);
                caseEntity.setDoctorRole(doctorRole);
                caseEntity.setPatientRole(patientRole);
                caseEntity.setObserverNotes(observerNotes);
                caseEntity.setLearningObjectives(learningObjectives);
                caseEntity.setDifficulty(difficulty);
                caseEntity.setDuration(duration);
                return caseRepository.save(caseEntity);
        }
}