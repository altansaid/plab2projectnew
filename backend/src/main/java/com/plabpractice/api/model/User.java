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
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email")
})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Password reset fields
    @Column(name = "reset_token")
    @JsonIgnore
    private String resetToken;

    @Column(name = "reset_token_expiry")
    @JsonIgnore
    private LocalDateTime resetTokenExpiry;

    // Google OAuth fields
    @Column(name = "google_id")
    private String googleId;

    @Column(name = "provider")
    @Enumerated(EnumType.STRING)
    private AuthProvider provider = AuthProvider.LOCAL;

    // Supabase Auth integration
    @Column(name = "supabase_id", unique = true)
    private String supabaseId;

    @Column(name = "migrated_to_supabase")
    private Boolean migratedToSupabase = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<SessionParticipant> sessions = new ArrayList<>();

    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Feedback> sentFeedback = new ArrayList<>();

    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Feedback> receivedFeedback = new ArrayList<>();

    public enum Role {
        USER,
        ADMIN
    }

    public enum AuthProvider {
        LOCAL,
        GOOGLE
    }

    // Helper methods for reset token
    public boolean isResetTokenValid() {
        return resetToken != null && resetTokenExpiry != null &&
                LocalDateTime.now().isBefore(resetTokenExpiry);
    }

    public void clearResetToken() {
        this.resetToken = null;
        this.resetTokenExpiry = null;
    }
}