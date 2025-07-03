package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "feedbacks")
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false)
    private String comment; // Additional Comment

    @Column(nullable = false)
    private Double overallPerformance; // Calculated from criteria scores (1.0-5.0)

    @Column(name = "score", nullable = false)
    private Integer score; // Legacy score column (mapped from overallPerformance)

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Case-specific feedback scores stored as JSON
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<FeedbackScore> criteriaScores;

    @Data
    @NoArgsConstructor
    public static class FeedbackScore {
        private String criterionId;
        private String criterionName;
        private Double score; // Can be null if it has sub-criteria
        private List<FeedbackSubScore> subScores;

        public FeedbackScore(String criterionId, String criterionName, Double score, List<FeedbackSubScore> subScores) {
            this.criterionId = criterionId;
            this.criterionName = criterionName;
            this.score = score;
            this.subScores = subScores;
        }
    }

    @Data
    @NoArgsConstructor
    public static class FeedbackSubScore {
        private String subCriterionId;
        private String subCriterionName;
        private Double score; // 1.0-5.0

        public FeedbackSubScore(String subCriterionId, String subCriterionName, Double score) {
            this.subCriterionId = subCriterionId;
            this.subCriterionName = subCriterionName;
            this.score = score;
        }
    }

}