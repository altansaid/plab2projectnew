package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

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
    private String comment;

    @Column(nullable = false)
    private Integer score; // Overall score (1-5)

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Additional detailed scoring fields
    @Column(name = "clinical_management_score")
    private Integer clinicalManagementScore;

    @Column(name = "communication_score")
    private Integer communicationScore;

    @Column(name = "professionalism_score")
    private Integer professionalismScore;

    @Column(name = "empathy_score")
    private Integer empathyScore;

    @Column(name = "examination_skills_score")
    private Integer examinationSkillsScore;

    @Column(name = "diagnosis_accuracy_score")
    private Integer diagnosisAccuracyScore;

    @Column(name = "treatment_plan_score")
    private Integer treatmentPlanScore;

    @Column(name = "data_gathering_score")
    private Integer dataGatheringScore;

    @Column(name = "interpersonal_skills_score")
    private Integer interpersonalSkillsScore;

    @Column(name = "time_management_score")
    private Integer timeManagementScore;

    @Column(name = "patient_safety_score")
    private Integer patientSafetyScore;

    @Column(name = "decision_making_score")
    private Integer decisionMakingScore;

    @Column(name = "problem_solving_score")
    private Integer problemSolvingScore;

    @Column(name = "documentation_score")
    private Integer documentationScore;

    @Column(name = "teamwork_score")
    private Integer teamworkScore;

    @Column(name = "leadership_score")
    private Integer leadershipScore;

    @Column(name = "cultural_sensitivity_score")
    private Integer culturalSensitivityScore;

    @Column(name = "ethical_awareness_score")
    private Integer ethicalAwarenessScore;

    @Column(name = "patient_rapport_score")
    private Integer patientRapportScore;

    @Column(name = "confidence_score")
    private Integer confidenceScore;
}