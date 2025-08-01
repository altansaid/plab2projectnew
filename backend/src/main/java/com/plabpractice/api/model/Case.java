package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @Column(columnDefinition = "TEXT")
    private String doctorInstructions;

    @Column(columnDefinition = "TEXT")
    private String patientInstructions;

    @Column(columnDefinition = "TEXT")
    private String observerInstructions;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    // Doctor role specific content
    @Column(columnDefinition = "TEXT")
    private String doctorDescription;

    @Column(columnDefinition = "TEXT")
    private String doctorScenario;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", name = "doctor_sections")
    private List<CaseSection> doctorSections;

    // Patient/Observer role specific content
    @Column(columnDefinition = "TEXT")
    private String patientDescription;

    @Column(columnDefinition = "TEXT")
    private String patientScenario;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", name = "patient_sections")
    private List<CaseSection> patientSections;

    // Common fields
    @Column(columnDefinition = "TEXT")
    private String doctorRole;

    @Column(columnDefinition = "TEXT")
    private String patientRole;

    @Column(columnDefinition = "TEXT")
    private String observerNotes;

    @Column(columnDefinition = "TEXT")
    private String learningObjectives;

    @Column(nullable = false)
    private Integer duration = 15; // Duration in minutes

    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    @Column(columnDefinition = "TEXT")
    private String patientNotes;

    @Column(columnDefinition = "TEXT")
    private String imageUrl; // URL or path to patient image/diagram

    // Visual data that supports both image and text content
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", name = "visual_data")
    private VisualData visualData;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "case_topics", joinColumns = @JoinColumn(name = "case_id"))
    @Column(name = "topic")
    @JsonIgnore
    private List<String> topics;

    // Case-specific feedback criteria
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<FeedbackCriterion> feedbackCriteria;

    // Recall functionality
    @Column(name = "is_recall_case", nullable = false)
    private Boolean isRecallCase = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", name = "recall_dates")
    private List<String> recallDates; // Store dates as ISO strings (YYYY-MM-DD)

    @Data
    @NoArgsConstructor
    public static class VisualData {
        private String type; // "image" or "text"
        private String content; // URL for image, text content for text type

        public VisualData(String type, String content) {
            this.type = type;
            this.content = content;
        }
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