package com.plabpractice.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.service.FeedbackService;
import com.plabpractice.api.service.SessionService;
import com.plabpractice.api.service.SessionWebSocketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FeedbackService feedbackService;

    @MockBean
    private SessionService sessionService;

    @MockBean
    private SessionWebSocketService webSocketService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private SessionRepository sessionRepository;

    @MockBean
    private SessionParticipantRepository participantRepository;

    @MockBean
    private CaseRepository caseRepository;

    private User senderUser;
    private User doctorUser;
    private Session testSession;
    private Case testCase;
    private SessionParticipant doctorParticipant;

    @BeforeEach
    void setUp() {
        senderUser = new User();
        senderUser.setId(1L);
        senderUser.setName("Patient User");
        senderUser.setEmail("patient@example.com");
        senderUser.setRole(User.Role.USER);

        doctorUser = new User();
        doctorUser.setId(2L);
        doctorUser.setName("Doctor User");
        doctorUser.setEmail("doctor@example.com");
        doctorUser.setRole(User.Role.USER);

        testCase = new Case();
        testCase.setId(1L);
        testCase.setTitle("Test Case");

        testSession = new Session();
        testSession.setId(1L);
        testSession.setTitle("Test Session");
        testSession.setCode("123456");
        testSession.setPhase(Session.Phase.FEEDBACK);
        testSession.setCurrentRound(1);
        testSession.setSelectedCase(testCase);

        doctorParticipant = new SessionParticipant();
        doctorParticipant.setId(1L);
        doctorParticipant.setSession(testSession);
        doctorParticipant.setUser(doctorUser);
        doctorParticipant.setRole(SessionParticipant.Role.DOCTOR);
        doctorParticipant.setIsActive(true);
    }

    @Test
    @WithMockUser(username = "patient@example.com", roles = {"USER"})
    void submitFeedback_Success() throws Exception {
        // Arrange
        Map<String, Object> feedbackData = new HashMap<>();
        feedbackData.put("sessionCode", "123456");
        feedbackData.put("comment", "Great session!");
        feedbackData.put("criteriaScores", Arrays.asList(
                Map.of(
                        "criterionId", "crit-1",
                        "criterionName", "Communication",
                        "score", 4,
                        "subScores", Collections.emptyList()
                )
        ));

        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(senderUser));
        when(sessionRepository.findByCode("123456")).thenReturn(Optional.of(testSession));
        when(participantRepository.findBySessionIdAndRole(1L, SessionParticipant.Role.DOCTOR))
                .thenReturn(List.of(doctorParticipant));
        when(caseRepository.findById(1L)).thenReturn(Optional.of(testCase));
        when(feedbackService.saveFeedback(any())).thenAnswer(invocation -> {
            return invocation.getArgument(0);
        });

        // Act & Assert
        mockMvc.perform(post("/api/feedback/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(feedbackData)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "patient@example.com", roles = {"USER"})
    void submitFeedback_MissingFields() throws Exception {
        // Arrange - Missing required fields
        Map<String, Object> feedbackData = new HashMap<>();
        feedbackData.put("sessionCode", "123456");
        // Missing comment and criteriaScores

        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(senderUser));

        // Act & Assert
        mockMvc.perform(post("/api/feedback/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(feedbackData)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitFeedback_Unauthenticated() throws Exception {
        // Arrange
        Map<String, Object> feedbackData = new HashMap<>();
        feedbackData.put("sessionCode", "123456");
        feedbackData.put("comment", "Great session!");

        // Act & Assert - Should fail without authentication
        mockMvc.perform(post("/api/feedback/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(feedbackData)))
                .andExpect(status().isUnauthorized());
    }
}


