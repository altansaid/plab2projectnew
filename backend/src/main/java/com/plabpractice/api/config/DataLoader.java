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
                // Cardiology Cases
                createCase(cardiology, "Acute Myocardial Infarction",
                                "Management of acute heart attack",
                                "A 55-year-old male presents with severe chest pain and shortness of breath.",
                                "Evaluate the patient's condition, interpret ECG, and initiate appropriate treatment protocol.",
                                "Present with typical MI symptoms, express anxiety and fear.",
                                "Focus on rapid assessment and decision-making skills.",
                                20);

                // Respiratory Case
                createCase(respiratory, "Severe Asthma Exacerbation",
                                "Management of acute asthma attack",
                                "A 25-year-old female presents with severe wheezing and difficulty breathing.",
                                "Assess severity, initiate treatment, and develop an action plan.",
                                "Demonstrate respiratory distress and anxiety about breathing difficulties.",
                                "Evaluate proper use of inhalers and breathing techniques.",
                                15);

                // Neurology Case
                createCase(neurology, "Acute Stroke Assessment",
                                "Rapid evaluation of stroke symptoms",
                                "A 70-year-old patient presents with sudden onset of facial drooping and speech difficulties.",
                                "Perform FAST assessment and determine eligibility for thrombolysis.",
                                "Display typical stroke symptoms and communication difficulties.",
                                "Focus on time-critical decision making.",
                                25);

                // Pediatrics Case
                createCase(pediatrics, "Febrile Seizure",
                                "Management of fever and seizure in a child",
                                "A 2-year-old child is brought in with high fever and recent seizure activity.",
                                "Take history, examine the child, and explain management to parents.",
                                "Present as worried parents with a distressed child.",
                                "Demonstrate pediatric examination skills.",
                                15);

                // Geriatrics Case
                createCase(geriatrics, "Falls Assessment",
                                "Evaluation of recurrent falls in elderly",
                                "An 80-year-old presents with history of multiple falls in the past month.",
                                "Conduct comprehensive geriatric assessment and fall risk evaluation.",
                                "Describe recent falls and express concern about independence.",
                                "Focus on safety and prevention strategies.",
                                20);

                // Emergency Medicine Case
                createCase(emergency, "Anaphylactic Shock",
                                "Acute management of severe allergic reaction",
                                "A 35-year-old develops sudden rash, swelling, and breathing difficulty after eating.",
                                "Recognize anaphylaxis and initiate emergency treatment.",
                                "Show rapid progression of allergic symptoms.",
                                "Emphasize rapid assessment and treatment.",
                                15);

                // Psychiatry Case
                createCase(psychiatry, "Major Depression",
                                "Assessment of severe depression",
                                "A 45-year-old presents with persistent low mood and suicidal thoughts.",
                                "Conduct mental health assessment and risk evaluation.",
                                "Express depressive symptoms and reluctance to seek help.",
                                "Focus on communication and risk assessment.",
                                30);

                // Endocrinology Case
                createCase(endocrinology, "Diabetic Ketoacidosis",
                                "Management of acute diabetes complication",
                                "A 20-year-old type 1 diabetic presents with vomiting and confusion.",
                                "Assess severity, initiate treatment, and manage fluid balance.",
                                "Display symptoms of DKA and provide relevant history.",
                                "Demonstrate systematic approach to metabolic emergencies.",
                                25);

                // Gastroenterology Case
                createCase(gastroenterology, "Acute Appendicitis",
                                "Diagnosis of acute abdominal pain",
                                "A 15-year-old presents with right-sided abdominal pain and vomiting.",
                                "Take focused history and perform abdominal examination.",
                                "Demonstrate typical appendicitis symptoms and progression.",
                                "Focus on systematic abdominal examination.",
                                20);

                // Dermatology Case
                createCase(dermatology, "Severe Allergic Reaction",
                                "Assessment of acute skin reaction",
                                "A 30-year-old develops widespread rash after starting new medication.",
                                "Evaluate rash characteristics and determine causation.",
                                "Show skin changes and describe symptom progression.",
                                "Emphasize systematic skin examination.",
                                15);

                System.out.println("10 categories and cases loaded successfully!");
        }

        private Category createCategory(String name, String description) {
                Category category = new Category();
                category.setName(name);
                category.setDescription(description);
                return categoryRepository.save(category);
        }

        private Case createCase(Category category, String title, String description, String scenario,
                        String doctorRole, String patientRole, String observerNotes,
                        Integer duration) {
                Case caseEntity = new Case();
                caseEntity.setCategory(category);
                caseEntity.setTitle(title);
                caseEntity.setDescription(description);
                caseEntity.setDoctorScenario(scenario);
                caseEntity.setPatientScenario(scenario);
                caseEntity.setDoctorRole(doctorRole);
                caseEntity.setPatientRole(patientRole);
                caseEntity.setObserverNotes(observerNotes);
                caseEntity.setDuration(duration);
                return caseRepository.save(caseEntity);
        }
}