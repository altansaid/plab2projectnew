package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "cases")
public class Case {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(columnDefinition = "TEXT")
    private String scenario;

    @Column(columnDefinition = "TEXT")
    private String doctorRole;

    @Column(columnDefinition = "TEXT")
    private String patientRole;

    @Column(columnDefinition = "TEXT")
    private String observerNotes;

    @Column(columnDefinition = "TEXT")
    private String learningObjectives;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty = Difficulty.INTERMEDIATE;

    @Column(nullable = false)
    private Integer duration = 15; // Duration in minutes

    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    @Column(columnDefinition = "TEXT")
    private String patientNotes;

    @Column(columnDefinition = "TEXT")
    private String imageUrl; // URL or path to patient image/diagram

    @ElementCollection
    @CollectionTable(name = "case_topics", joinColumns = @JoinColumn(name = "case_id"))
    @Column(name = "topic")
    private List<String> topics;

    // Modular sections for dynamic content
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<CaseSection> sections;

    // Case-specific feedback criteria
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<FeedbackCriterion> feedbackCriteria;

    public enum Difficulty {
        BEGINNER,
        INTERMEDIATE,
        ADVANCED
    }

    @Data
    @NoArgsConstructor
    public static class CaseSection {
        private String id;
        private String title;
        private String content;
        private Integer order;

        public CaseSection(String id, String title, String content, Integer order) {
            this.id = id;
            this.title = title;
            this.content = content;
            this.order = order;
        }
    }

    @Data
    @NoArgsConstructor
    public static class FeedbackCriterion {
        private String id;
        private String name;
        private Integer order;
        private Boolean hasSubCriteria;
        private List<FeedbackSubCriterion> subCriteria;

        public FeedbackCriterion(String id, String name, Integer order, Boolean hasSubCriteria,
                List<FeedbackSubCriterion> subCriteria) {
            this.id = id;
            this.name = name;
            this.order = order;
            this.hasSubCriteria = hasSubCriteria != null ? hasSubCriteria : false;
            this.subCriteria = subCriteria;
        }
    }

    @Data
    @NoArgsConstructor
    public static class FeedbackSubCriterion {
        private String id;
        private String name;
        private Integer order;

        public FeedbackSubCriterion(String id, String name, Integer order) {
            this.id = id;
            this.name = name;
            this.order = order;
        }
    }
}