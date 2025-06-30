package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    public enum Difficulty {
        BEGINNER,
        INTERMEDIATE,
        ADVANCED
    }
}