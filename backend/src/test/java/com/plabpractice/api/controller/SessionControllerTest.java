package com.plabpractice.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.security.JwtTokenProvider;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SessionService sessionService;

    @MockBean
    private SessionWebSocketService webSocketService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtTokenProvider tokenProvider;

    private User testUser;
    private Session testSession;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setName("Test User");
        testUser.setEmail("test@example.com");
        testUser.setRole(User.Role.USER);

        testSession = new Session();
        testSession.setId(1L);
        testSession.setTitle("Test Session");
        testSession.setCode("123456");
        testSession.setStatus(Session.Status.CREATED);
        testSession.setPhase(Session.Phase.WAITING);
        testSession.setCreatedBy(testUser);
        testSession.setCreatedAt(LocalDateTime.now());
        testSession.setReadingTime(2.0);
        testSession.setConsultationTime(8.0);
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void createSession_Success() throws Exception {
        // Arrange
        Map<String, Object> sessionRequest = new HashMap<>();
        sessionRequest.put("title", "New Session");
        sessionRequest.put("sessionType", "TOPIC");
        sessionRequest.put("readingTime", 2.0);
        sessionRequest.put("consultationTime", 8.0);
        sessionRequest.put("timingType", "COUNTDOWN");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(sessionService.createSessionWithConfig(
                any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(testSession);

        // Act & Assert
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sessionRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("123456"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getSessionByCode_Success() throws Exception {
        // Arrange
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(sessionService.findSessionByCode("123456")).thenReturn(Optional.of(testSession));
        when(sessionService.getSessionParticipantDTOs(1L)).thenReturn(java.util.List.of());
        when(sessionService.isUserHost("123456", testUser)).thenReturn(true);
        when(sessionService.getUserRoleInSession("123456", testUser)).thenReturn(null);

        // Act & Assert
        mockMvc.perform(get("/api/sessions/123456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("123456"))
                .andExpect(jsonPath("$.title").value("Test Session"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getSessionByCode_NotFound() throws Exception {
        // Arrange
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(sessionService.findSessionByCode("invalid")).thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/api/sessions/invalid"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void joinSession_Success() throws Exception {
        // Arrange
        Map<String, String> joinRequest = new HashMap<>();
        joinRequest.put("code", "123456");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(sessionService.joinSession("123456", testUser)).thenReturn(Optional.of(testSession));
        when(sessionService.getAvailableRoles(testSession)).thenReturn(java.util.List.of("PATIENT", "OBSERVER"));
        doNothing().when(webSocketService).broadcastParticipantUpdate(any());

        // Act & Assert
        mockMvc.perform(post("/api/sessions/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(joinRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.code").value("123456"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void joinSession_SessionNotFound() throws Exception {
        // Arrange
        Map<String, String> joinRequest = new HashMap<>();
        joinRequest.put("code", "invalid");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(sessionService.joinSession("invalid", testUser)).thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(post("/api/sessions/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(joinRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createSession_Unauthenticated() throws Exception {
        // Arrange
        Map<String, Object> sessionRequest = new HashMap<>();
        sessionRequest.put("title", "New Session");

        // Act & Assert
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sessionRequest)))
                .andExpect(status().isUnauthorized());
    }
}


