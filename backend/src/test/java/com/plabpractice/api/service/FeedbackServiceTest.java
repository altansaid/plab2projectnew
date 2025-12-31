package com.plabpractice.api.service;

import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Feedback;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.FeedbackRepository;
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
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    private User senderUser;
    private User recipientUser;
    private Session testSession;
    private Case testCase;
    private Feedback testFeedback;

    @BeforeEach
    void setUp() {
        senderUser = new User();
        senderUser.setId(1L);
        senderUser.setName("Sender User");
        senderUser.setEmail("sender@example.com");
        senderUser.setRole(User.Role.USER);

        recipientUser = new User();
        recipientUser.setId(2L);
        recipientUser.setName("Recipient User");
        recipientUser.setEmail("recipient@example.com");
        recipientUser.setRole(User.Role.USER);

        testCase = new Case();
        testCase.setId(1L);
        testCase.setTitle("Test Case");

        testSession = new Session();
        testSession.setId(1L);
        testSession.setTitle("Test Session");
        testSession.setCode("123456");
        testSession.setCurrentRound(1);
        testSession.setSelectedCase(testCase);

        testFeedback = new Feedback();
        testFeedback.setId(1L);
        testFeedback.setSession(testSession);
        testFeedback.setSender(senderUser);
        testFeedback.setRecipient(recipientUser);
        testFeedback.setCaseId(testCase.getId());
        testFeedback.setCaseTitle(testCase.getTitle());
        testFeedback.setRoundNumber(1);
        testFeedback.setComment("Great job!");
        testFeedback.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void saveFeedback_Success() {
        // Arrange
        when(feedbackRepository.save(any(Feedback.class))).thenReturn(testFeedback);

        // Act
        Feedback result = feedbackService.saveFeedback(testFeedback);

        // Assert
        assertNotNull(result);
        assertEquals(testFeedback.getId(), result.getId());
        assertEquals("Great job!", result.getComment());
        verify(feedbackRepository, times(1)).save(any(Feedback.class));
    }

    @Test
    void getFeedbackByRecipient_Success() {
        // Arrange
        when(feedbackRepository.findByRecipientId(2L)).thenReturn(List.of(testFeedback));

        // Act
        List<Feedback> results = feedbackService.getFeedbackByRecipient(2L);

        // Assert
        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(testFeedback.getId(), results.get(0).getId());
    }

    @Test
    void getFeedbackByRecipient_NoFeedback() {
        // Arrange
        when(feedbackRepository.findByRecipientId(999L)).thenReturn(List.of());

        // Act
        List<Feedback> results = feedbackService.getFeedbackByRecipient(999L);

        // Assert
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void getFeedbackBySession_Success() {
        // Arrange
        when(feedbackRepository.findBySessionId(1L)).thenReturn(List.of(testFeedback));

        // Act
        List<Feedback> results = feedbackService.getFeedbackBySession(1L);

        // Assert
        assertNotNull(results);
        assertEquals(1, results.size());
    }

    @Test
    void getFeedbackById_Success() {
        // Arrange
        when(feedbackRepository.findById(1L)).thenReturn(Optional.of(testFeedback));

        // Act
        Optional<Feedback> result = feedbackService.getFeedbackById(1L);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(testFeedback.getId(), result.get().getId());
    }

    @Test
    void getFeedbackById_NotFound() {
        // Arrange
        when(feedbackRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        Optional<Feedback> result = feedbackService.getFeedbackById(999L);

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    void deleteFeedback_Success() {
        // Arrange
        doNothing().when(feedbackRepository).deleteById(1L);

        // Act
        feedbackService.deleteFeedback(1L);

        // Assert
        verify(feedbackRepository, times(1)).deleteById(1L);
    }
}

