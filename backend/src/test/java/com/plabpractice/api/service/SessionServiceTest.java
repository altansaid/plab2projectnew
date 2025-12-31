package com.plabpractice.api.service;

import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import com.plabpractice.api.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private SessionParticipantRepository sessionParticipantRepository;

    @Mock
    private CaseRepository caseRepository;

    @InjectMocks
    private SessionService sessionService;

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
    }

    @Test
    void createSession_Success() {
        // Arrange
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> {
            Session s = invocation.getArgument(0);
            s.setId(1L);
            return s;
        });
        when(sessionParticipantRepository.save(any(SessionParticipant.class))).thenAnswer(invocation -> {
            SessionParticipant p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        // Act
        Session result = sessionService.createSession("New Session", testUser);

        // Assert
        assertNotNull(result);
        assertEquals("New Session", result.getTitle());
        assertEquals(Session.Status.CREATED, result.getStatus());
        assertNotNull(result.getCode());
        assertEquals(6, result.getCode().length());
        verify(sessionRepository, times(1)).save(any(Session.class));
        verify(sessionParticipantRepository, times(1)).save(any(SessionParticipant.class));
    }

    @Test
    void joinSession_Success() {
        // Arrange
        when(sessionRepository.findByCode("123456")).thenReturn(Optional.of(testSession));
        when(sessionParticipantRepository.findBySessionIdAndUserId(1L, 2L)).thenReturn(Optional.empty());
        when(sessionParticipantRepository.save(any(SessionParticipant.class))).thenAnswer(invocation -> {
            SessionParticipant p = invocation.getArgument(0);
            p.setId(2L);
            return p;
        });

        User newUser = new User();
        newUser.setId(2L);
        newUser.setName("New User");
        newUser.setEmail("new@example.com");

        // Act
        Optional<Session> result = sessionService.joinSession("123456", newUser);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(testSession.getId(), result.get().getId());
        verify(sessionParticipantRepository, times(1)).save(any(SessionParticipant.class));
    }

    @Test
    void joinSession_SessionNotFound() {
        // Arrange
        when(sessionRepository.findByCode("invalid")).thenReturn(Optional.empty());

        // Act
        Optional<Session> result = sessionService.joinSession("invalid", testUser);

        // Assert
        assertTrue(result.isEmpty());
        verify(sessionParticipantRepository, never()).save(any(SessionParticipant.class));
    }

    @Test
    void findSessionByCode_Success() {
        // Arrange
        when(sessionRepository.findByCode("123456")).thenReturn(Optional.of(testSession));

        // Act
        Optional<Session> result = sessionService.findSessionByCode("123456");

        // Assert
        assertTrue(result.isPresent());
        assertEquals("123456", result.get().getCode());
    }

    @Test
    void findSessionByCode_NotFound() {
        // Arrange
        when(sessionRepository.findByCode("invalid")).thenReturn(Optional.empty());

        // Act
        Optional<Session> result = sessionService.findSessionByCode("invalid");

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    void getAvailableRoles_AllRolesAvailable() {
        // Arrange
        when(sessionParticipantRepository.findBySessionIdAndIsActive(1L, true))
                .thenReturn(List.of());

        // Act
        List<String> roles = sessionService.getAvailableRoles(testSession);

        // Assert
        assertTrue(roles.contains("PATIENT"));
        assertTrue(roles.contains("OBSERVER"));
        // DOCTOR should not be available for joiners
        assertFalse(roles.contains("DOCTOR"));
    }

    @Test
    void getAvailableRoles_PatientTaken() {
        // Arrange
        SessionParticipant patientParticipant = new SessionParticipant();
        patientParticipant.setRole(SessionParticipant.Role.PATIENT);
        patientParticipant.setIsActive(true);

        when(sessionParticipantRepository.findBySessionIdAndIsActive(1L, true))
                .thenReturn(List.of(patientParticipant));

        // Act
        List<String> roles = sessionService.getAvailableRoles(testSession);

        // Assert
        assertFalse(roles.contains("PATIENT"));
        assertTrue(roles.contains("OBSERVER"));
    }

    @Test
    void isUserHost_CreatorIsHost() {
        // Arrange
        when(sessionRepository.findByCode("123456")).thenReturn(Optional.of(testSession));

        // Act
        boolean result = sessionService.isUserHost("123456", testUser);

        // Assert
        assertTrue(result);
    }

    @Test
    void isUserHost_NonCreatorNotHost() {
        // Arrange
        User otherUser = new User();
        otherUser.setId(999L);
        otherUser.setName("Other User");

        when(sessionRepository.findByCode("123456")).thenReturn(Optional.of(testSession));
        when(sessionParticipantRepository.findBySessionIdAndUserId(1L, 999L))
                .thenReturn(Optional.empty());
        when(sessionParticipantRepository.findBySessionId(1L))
                .thenReturn(List.of());

        // Act
        boolean result = sessionService.isUserHost("123456", otherUser);

        // Assert
        assertFalse(result);
    }

    @Test
    void startSession_Success() {
        // Arrange
        when(sessionRepository.findById(1L)).thenReturn(Optional.of(testSession));
        when(sessionRepository.save(any(Session.class))).thenReturn(testSession);

        // Act
        sessionService.startSession(1L);

        // Assert
        assertEquals(Session.Status.IN_PROGRESS, testSession.getStatus());
        verify(sessionRepository, times(1)).save(testSession);
    }

    @Test
    void endSession_Success() {
        // Arrange
        testSession.setStatus(Session.Status.IN_PROGRESS);
        when(sessionRepository.findById(1L)).thenReturn(Optional.of(testSession));
        when(sessionRepository.save(any(Session.class))).thenReturn(testSession);

        // Act
        sessionService.endSession(1L);

        // Assert
        assertEquals(Session.Status.COMPLETED, testSession.getStatus());
        assertNotNull(testSession.getEndTime());
        verify(sessionRepository, times(1)).save(testSession);
    }

    @Test
    void calculateRemainingTime_ReadingPhase() {
        // Arrange
        testSession.setPhase(Session.Phase.READING);
        testSession.setReadingTime(2.0); // 2 minutes
        testSession.setPhaseStartTime(LocalDateTime.now().minusSeconds(30)); // 30 seconds ago

        // Act
        int remainingSeconds = sessionService.calculateRemainingTime(testSession);

        // Assert
        // Should be approximately 90 seconds (120 - 30)
        assertTrue(remainingSeconds > 85 && remainingSeconds <= 90);
    }

    @Test
    void calculateRemainingTime_NoPhaseStartTime() {
        // Arrange
        testSession.setPhase(Session.Phase.READING);
        testSession.setPhaseStartTime(null);
        testSession.setTimeRemaining(120);

        // Act
        int remainingSeconds = sessionService.calculateRemainingTime(testSession);

        // Assert
        assertEquals(120, remainingSeconds);
    }
}

