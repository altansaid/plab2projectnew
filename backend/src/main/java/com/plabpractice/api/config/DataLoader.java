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
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Arrays;
import java.util.List;

@Component
public class DataLoader implements CommandLineRunner {

        private final CategoryRepository categoryRepository;
        private final CaseRepository caseRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;

        @Autowired
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

                        // Load default users if database is empty
                        if (userRepository.count() == 0) {
                                System.out.println("Database is empty, loading default users...");
                                loadDefaultUsers();
                        } else {
                                System.out.println("Users already exist, skipping user creation");
                        }

                        // Delete all existing cases and categories
                        System.out.println("Deleting existing cases and categories...");
                        caseRepository.deleteAll();
                        categoryRepository.deleteAll();

                        // Load new categories and cases
                        System.out.println("Loading new categories and cases...");
                        loadCategoriesAndCases();

                        System.out.println("=== DataLoader: Initialization complete ===");
                } catch (Exception e) {
                        System.err.println("❌ Error during data loading: " + e.getMessage());
                        e.printStackTrace();
                        System.err.println("⚠️  Application will continue without sample data");
                }
        }

        private void loadDefaultUsers() {
                // Create default admin user
                User admin = new User();
                admin.setName("Admin User");
                admin.setEmail("admin@plab.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(User.Role.ADMIN);
                admin.setProvider(User.AuthProvider.LOCAL);
                userRepository.save(admin);

                // Create default regular user
                User user = new User();
                user.setName("Test User");
                user.setEmail("user@plab.com");
                user.setPassword(passwordEncoder.encode("user123"));
                user.setRole(User.Role.USER);
                user.setProvider(User.AuthProvider.LOCAL);
                userRepository.save(user);

                System.out.println("Default users created:");
                System.out.println("Admin: admin@plab.com / admin123");
                System.out.println("User: user@plab.com / user123");
        }

        private void loadCategoriesAndCases() {
                // Create 10 categories
                Category cardiology = createCategory("Cardiology", "Heart and cardiovascular system cases");
                Category respiratory = createCategory("Respiratory Medicine", "Lung and breathing related cases");
                Category neurology = createCategory("Neurology", "Brain and nervous system cases");
                Category pediatrics = createCategory("Pediatrics", "Cases involving children and adolescents");
                Category geriatrics = createCategory("Geriatrics", "Cases involving elderly patients");
                Category emergency = createCategory("Emergency Medicine", "Acute and emergency cases");
                Category psychiatry = createCategory("Psychiatry", "Mental health and behavioral cases");
                Category endocrinology = createCategory("Endocrinology", "Hormone and metabolic system cases");
                Category gastroenterology = createCategory("Gastroenterology", "Digestive system cases");
                Category dermatology = createCategory("Dermatology", "Skin related cases");

                // Create cases for each category
                // Cardiology Cases (Multiple cases for proper testing)
                createCase(cardiology, "Acute Myocardial Infarction",
                                "Management of acute heart attack",
                                "A 55-year-old male presents with severe chest pain and shortness of breath.");

                createCase(cardiology, "Severe Heart Failure",
                                "Management of acute heart failure",
                                "A 68-year-old female presents with severe shortness of breath and ankle swelling.");

                createCase(cardiology, "Atrial Fibrillation",
                                "Management of irregular heart rhythm",
                                "A 72-year-old male presents with palpitations and dizziness.");

                createCase(cardiology, "Hypertensive Crisis",
                                "Management of severe high blood pressure",
                                "A 45-year-old presents with severe headache and blood pressure 220/120.");

                // Respiratory Cases (Multiple cases for proper testing)
                createCase(respiratory, "Severe Asthma Exacerbation",
                                "Management of acute asthma attack",
                                "A 25-year-old female presents with severe wheezing and difficulty breathing.");

                createCase(respiratory, "Pneumonia",
                                "Management of community-acquired pneumonia",
                                "A 65-year-old male presents with fever, cough, and chest pain.");

                createCase(respiratory, "COPD Exacerbation",
                                "Management of chronic lung disease flare-up",
                                "A 70-year-old smoker presents with worsening breathlessness and increased sputum.");

                // Neurology Case
                createCase(neurology, "Acute Stroke Assessment",
                                "Rapid evaluation of stroke symptoms",
                                "A 70-year-old patient presents with sudden onset of facial drooping and speech difficulties.");

                // Pediatrics Case
                createCase(pediatrics, "Febrile Seizure",
                                "Management of fever and seizure in a child",
                                "A 2-year-old child is brought in with high fever and recent seizure activity.");

                // Geriatrics Case
                createCase(geriatrics, "Falls Assessment",
                                "Evaluation of recurrent falls in elderly",
                                "An 80-year-old presents with history of multiple falls in the past month.");

                // Emergency Medicine Case
                createCase(emergency, "Anaphylactic Shock",
                                "Acute management of severe allergic reaction",
                                "A 35-year-old develops sudden rash, swelling, and breathing difficulty after eating.");

                // Psychiatry Case
                createCase(psychiatry, "Major Depression",
                                "Assessment of severe depression",
                                "A 45-year-old presents with persistent low mood and suicidal thoughts.");

                // Endocrinology Case
                createCase(endocrinology, "Diabetic Ketoacidosis",
                                "Management of acute diabetes complication",
                                "A 20-year-old type 1 diabetic presents with vomiting and confusion.");

                // Gastroenterology Case
                createCase(gastroenterology, "Acute Appendicitis",
                                "Diagnosis of acute abdominal pain",
                                "A 15-year-old presents with right-sided abdominal pain and vomiting.");

                // Dermatology Case
                createCase(dermatology, "Severe Allergic Reaction",
                                "Assessment of acute skin reaction",
                                "A 30-year-old develops widespread rash after starting new medication.");

                System.out.println("10 categories and cases loaded successfully!");
        }

        private Category createCategory(String name, String description) {
                Category category = new Category();
                category.setName(name);
                category.setDescription(description);
                return categoryRepository.save(category);
        }

        private Case createCase(Category category, String title, String description, String scenario) {
                Case caseEntity = new Case();
                caseEntity.setCategory(category);
                caseEntity.setTitle(title);
                caseEntity.setDescription(description);
                caseEntity.setDoctorScenario(scenario);
                caseEntity.setPatientScenario(scenario);
                return caseRepository.save(caseEntity);
        }
}