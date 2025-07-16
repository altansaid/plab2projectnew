package com.plabpractice.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "sessions", indexes = {
        @Index(name = "idx_session_code", columnList = "session_code"),
        @Index(name = "idx_session_status", columnList = "status"),
        @Index(name = "idx_session_created_by", columnList = "created_by")
})
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "session_code", nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.CREATED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Phase phase = Phase.WAITING;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false)
    private SessionType sessionType = SessionType.TOPIC;

    @Column(name = "reading_time_minutes", nullable = false)
    private Integer readingTime = 2; // in minutes

    @Column(name = "consultation_time_minutes", nullable = false)
    private Integer consultationTime = 8; // in minutes

    @Enumerated(EnumType.STRING)
    @Column(name = "timing_type", nullable = false)
    private TimingType timingType = TimingType.COUNTDOWN;

    @Column(name = "selected_topics", columnDefinition = "TEXT")
    private String selectedTopics; // JSON array of selected topics

    @ManyToOne
    @JoinColumn(name = "case_id")
    private Case selectedCase;

    @Column(name = "current_round", nullable = false)
    private Integer currentRound = 1; // Track which round/case iteration we're on

    @Column(name = "time_remaining", nullable = false)
    private Integer timeRemaining = 0; // in seconds

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime = LocalDateTime.now();

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "phase_start_time")
    private LocalDateTime phaseStartTime;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SessionParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Feedback> feedbacks = new ArrayList<>();

    public enum Status {
        CREATED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public enum Phase {
        WAITING,
        READING,
        CONSULTATION,
        FEEDBACK,
        COMPLETED
    }

    public enum SessionType {
        TOPIC,
        RECALL
    }

    public enum TimingType {
        COUNTDOWN,
        STOPWATCH
    }
}