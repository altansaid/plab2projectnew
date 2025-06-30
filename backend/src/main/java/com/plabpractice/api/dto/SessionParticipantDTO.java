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
        this.user = new UserDTO(participant.getUser());
        this.role = participant.getRole();
    }
}