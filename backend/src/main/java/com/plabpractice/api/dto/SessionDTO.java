package com.plabpractice.api.dto;

import com.plabpractice.api.model.Session;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class SessionDTO {
    private Long id;
    private String title;
    private String code;
    private Session.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<SessionParticipantDTO> participants;
    private int participantCount;

    public SessionDTO(Session session) {
        this.id = session.getId();
        this.title = session.getTitle();
        this.code = session.getCode();
        this.status = session.getStatus();
        this.createdAt = session.getCreatedAt();
        this.startTime = session.getStartTime();
        this.endTime = session.getEndTime();
        this.participantCount = 0; // Will be set separately to avoid lazy loading
    }
}