package com.plabpractice.api.dto;

import com.plabpractice.api.model.SessionParticipant;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SessionParticipantDTO {
    private Long id;
    private UserDTO user;
    private SessionParticipant.Role role;

    public SessionParticipantDTO(SessionParticipant participant) {
        this.id = participant.getId();
        this.role = participant.getRole();
        // Handle user safely - only create UserDTO if user is loaded
        if (participant.getUser() != null) {
            this.user = new UserDTO(participant.getUser());
        }
    }
}