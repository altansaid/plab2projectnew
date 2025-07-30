package com.plabpractice.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.dto.SessionDTO;
import com.plabpractice.api.dto.SessionParticipantDTO;
import com.plabpractice.api.dto.UserDTO;
import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import com.plabpractice.api.model.Feedback;
import com.plabpractice.api.repository.FeedbackRepository;

@Service
@Transactional
public class SessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository sessionParticipantRepository;

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FeedbackRepository feedbackRepository;

    public Session createSession(String title, User creator) {
        Session session = new Session();
        session.setTitle(title);
        session.setCode(generateSessionCode());
        session.setStatus(Session.Status.CREATED);
        session.setCreatedBy(creator);
        session.setCreatedAt(LocalDateTime.now());
        session.setStartTime(LocalDateTime.now());

        Session savedSession = sessionRepository.save(session);

        // Add creator as doctor (host is always the doctor)
        SessionParticipant host = new SessionParticipant();
        host.setSession(savedSession);
        host.setUser(creator);
        host.setRole(SessionParticipant.Role.DOCTOR); // Changed from HOST to DOCTOR
        sessionParticipantRepository.save(host);

        return savedSession;
    }

    public Optional<Session> joinSession(String code, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(code);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();

            // Check if user has an existing participant record (active or inactive)
            Optional<SessionParticipant> existingParticipant = sessionParticipantRepository
                    .findBySessionIdAndUserId(session.getId(), user.getId());

            if (existingParticipant.isPresent()) {
                // Reactivate existing participant
                SessionParticipant participant = existingParticipant.get();
                participant.setIsActive(true);
                sessionParticipantRepository.save(participant);
            } else {
                // Create new participant
                SessionParticipant participant = new SessionParticipant();
                participant.setSession(session);
                participant.setUser(user);
                participant.setRole(SessionParticipant.Role.PARTICIPANT);
                participant.setIsActive(true);
                sessionParticipantRepository.save(participant);
            }
        }
        return sessionOpt;
    }

    public void startSession(Long sessionId) {
        Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            session.setStatus(Session.Status.IN_PROGRESS);
            session.setStartTime(LocalDateTime.now());
            sessionRepository.save(session);
        }
    }

    public void endSession(Long sessionId) {
        Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            session.setStatus(Session.Status.COMPLETED);
            session.setEndTime(LocalDateTime.now());
            sessionRepository.save(session);
        }
    }

    public List<SessionParticipant> getSessionParticipants(Long sessionId) {
        return sessionParticipantRepository.findBySessionId(sessionId);
    }

    @Transactional(readOnly = true)
    public List<SessionParticipantDTO> getSessionParticipantDTOs(Long sessionId) {
        // Use optimized query to get only ACTIVE participants
        List<SessionParticipant> activeParticipants = sessionParticipantRepository
                .findBySessionIdAndIsActiveWithUser(sessionId, true);
        return activeParticipants.stream()
                .map(participant -> {
                    SessionParticipantDTO dto = new SessionParticipantDTO();
                    dto.setId(participant.getId());
                    dto.setRole(participant.getRole());
                    // User is already eagerly loaded, no additional query needed
                    if (participant.getUser() != null) {
                        UserDTO userDTO = new UserDTO();
                        userDTO.setId(participant.getUser().getId());
                        userDTO.setName(participant.getUser().getName());
                        userDTO.setEmail(participant.getUser().getEmail());
                        userDTO.setRole(participant.getUser().getRole());
                        dto.setUser(userDTO);
                    }
                    return dto;
                })
                .toList();
    }

    public List<Session> getUserSessions(Long userId) {
        List<SessionParticipant> participations = sessionParticipantRepository.findByUserId(userId);
        return participations.stream()
                .map(SessionParticipant::getSession)
                .toList();
    }

    public List<Session> getActiveSessions() {
        return sessionRepository.findByStatus(Session.Status.IN_PROGRESS);
    }

    public Session createSessionWithConfig(String title, String sessionType, Integer readingTime,
            Integer consultationTime, String timingType,
            List<String> selectedTopics, User creator) {
        Session session = new Session();
        session.setTitle(title);
        session.setCode(generateSessionCode());
        session.setStatus(Session.Status.CREATED);
        session.setPhase(Session.Phase.WAITING);
        session.setSessionType(Session.SessionType.valueOf(sessionType));
        session.setReadingTime(readingTime);
        session.setConsultationTime(consultationTime);
        session.setTimingType(Session.TimingType.valueOf(timingType));
        session.setCreatedBy(creator);

        // Convert topics list to JSON string
        try {
            session.setSelectedTopics(objectMapper.writeValueAsString(selectedTopics));
        } catch (JsonProcessingException e) {
            session.setSelectedTopics("[]");
        }

        session.setCreatedAt(LocalDateTime.now());
        session.setStartTime(LocalDateTime.now());

        Session savedSession = sessionRepository.save(session);

        // Add creator as host with DOCTOR role (host is always the doctor)
        SessionParticipant host = new SessionParticipant();
        host.setSession(savedSession);
        host.setUser(creator);
        host.setRole(SessionParticipant.Role.DOCTOR); // Changed from HOST to DOCTOR
        sessionParticipantRepository.save(host);

        return savedSession;
    }

    public Optional<Session> findSessionByCode(String code) {
        return sessionRepository.findByCode(code);
    }

    public List<String> getAvailableRoles(Session session) {
        // Only check ACTIVE participants
        List<SessionParticipant> activeParticipants = sessionParticipantRepository
                .findBySessionIdAndIsActive(session.getId(), true);
        List<SessionParticipant.Role> takenRoles = activeParticipants.stream()
                .map(SessionParticipant::getRole)
                .toList();

        List<String> availableRoles = new ArrayList<>();
        // DOCTOR role is never available for joiners - only host can be doctor
        // if (!takenRoles.contains(SessionParticipant.Role.DOCTOR)) {
        // availableRoles.add("DOCTOR");
        // }
        if (!takenRoles.contains(SessionParticipant.Role.PATIENT)) {
            availableRoles.add("PATIENT");
        }
        // Observer can always be added (multiple observers allowed)
        availableRoles.add("OBSERVER");

        return availableRoles;
    }

    public Session joinSessionWithRole(String sessionCode, String role, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            throw new RuntimeException("Session not found");
        }

        Session session = sessionOpt.get();

        // Convert role to uppercase for consistency
        String upperRole = role.toUpperCase();

        // Prevent non-hosts from selecting DOCTOR role
        if (upperRole.equals("DOCTOR") && !isUserHost(sessionCode, user)) {
            throw new RuntimeException("Only the session host can be assigned the Doctor role");
        }

        // Check if user has an existing participant record (active or inactive)
        Optional<SessionParticipant> existingParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(session.getId(), user.getId());

        if (existingParticipant.isPresent()) {
            // User has an existing record - reactivate and update role if needed
            SessionParticipant participant = existingParticipant.get();
            participant.setIsActive(true);

            if (!participant.getRole().toString().equals(upperRole)) {
                // Prevent changing to DOCTOR role if not host
                if (upperRole.equals("DOCTOR") && !isUserHost(sessionCode, user)) {
                    throw new RuntimeException("Only the session host can be assigned the Doctor role");
                }

                // Check if new role is available (except for Observer) - only check among
                // ACTIVE participants
                if (!upperRole.equals("OBSERVER")) {
                    List<String> availableRoles = getAvailableRoles(session);
                    if (!availableRoles.contains(upperRole)) {
                        throw new RuntimeException(
                                "Role '" + upperRole + "' is not available. Available roles: " + availableRoles);
                    }
                }
                participant.setRole(SessionParticipant.Role.valueOf(upperRole));
            }
            sessionParticipantRepository.save(participant);
        } else {
            // New user joining session
            // Prevent new users from selecting DOCTOR role
            if (upperRole.equals("DOCTOR")) {
                throw new RuntimeException("Only the session host can be assigned the Doctor role");
            }

            // Check if role is available (except for Observer)
            if (!upperRole.equals("OBSERVER")) {
                List<String> availableRoles = getAvailableRoles(session);
                if (!availableRoles.contains(upperRole)) {
                    throw new RuntimeException(
                            "Role '" + upperRole + "' is not available. Available roles: " + availableRoles);
                }
            }

            // Create new participant
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(session);
            participant.setUser(user);
            participant.setRole(SessionParticipant.Role.valueOf(upperRole));
            participant.setIsActive(true);
            sessionParticipantRepository.save(participant);
        }

        return session;
    }

    public Session configureSession(String sessionCode, Map<String, Object> config, Case selectedCase, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            throw new RuntimeException("Session not found");
        }

        Session session = sessionOpt.get();

        // Update session configuration
        if (config.containsKey("readingTime")) {
            session.setReadingTime((Integer) config.get("readingTime"));
        }
        if (config.containsKey("consultationTime")) {
            session.setConsultationTime((Integer) config.get("consultationTime"));
        }
        if (config.containsKey("timingType")) {
            session.setTimingType(Session.TimingType.valueOf((String) config.get("timingType")));
        }
        if (config.containsKey("sessionType")) {
            session.setSessionType(Session.SessionType.valueOf((String) config.get("sessionType")));
        }
        if (config.containsKey("selectedTopics")) {
            try {
                @SuppressWarnings("unchecked")
                List<String> topics = (List<String>) config.get("selectedTopics");
                session.setSelectedTopics(objectMapper.writeValueAsString(topics));
            } catch (JsonProcessingException e) {
                session.setSelectedTopics("[]");
            }
        }

        if (selectedCase != null) {
            session.setSelectedCase(selectedCase);

            // Track used case to prevent duplicates
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }
            if (!session.getUsedCaseIds().contains(selectedCase.getId())) {
                session.getUsedCaseIds().add(selectedCase.getId());
            }
        }

        // Store recall date range if provided
        if (config.containsKey("recallStartDate") && config.get("recallStartDate") != null) {
            try {
                session.setRecallStartDate(java.time.LocalDate.parse((String) config.get("recallStartDate")));
            } catch (Exception e) {
                // Log error but don't fail session creation
                System.err.println("Failed to parse recallStartDate: " + e.getMessage());
            }
        }
        if (config.containsKey("recallEndDate") && config.get("recallEndDate") != null) {
            try {
                session.setRecallEndDate(java.time.LocalDate.parse((String) config.get("recallEndDate")));
            } catch (Exception e) {
                // Log error but don't fail session creation
                System.err.println("Failed to parse recallEndDate: " + e.getMessage());
            }
        }

        // Keep session in WAITING phase after configuration
        // Host must explicitly start the session using the start endpoint
        session.setPhase(Session.Phase.WAITING);

        return sessionRepository.save(session);
    }

    public SessionParticipant getParticipantByUserAndSession(User user, Session session) {
        return sessionParticipantRepository.findBySessionIdAndUserId(session.getId(), user.getId())
                .orElse(null);
    }

    public List<Session> getUserSessions(User user) {
        List<SessionParticipant> participations = sessionParticipantRepository.findByUserId(user.getId());
        return participations.stream()
                .map(SessionParticipant::getSession)
                .toList();
    }

    public void deleteSession(Long sessionId, User user) {
        Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            // Check if user has permission to delete (is host/creator or admin)
            // Host is always the DOCTOR, so check for DOCTOR role
            SessionParticipant participant = getParticipantByUserAndSession(user, session);
            if (participant != null && (SessionParticipant.Role.DOCTOR.equals(participant.getRole())
                    || user.getRole().equals(User.Role.ADMIN))) {
                sessionRepository.delete(session);
            }
        }
    }

    public SessionDTO convertToDTO(Session session) {
        SessionDTO dto = new SessionDTO();
        dto.setId(session.getId());
        dto.setTitle(session.getTitle());
        dto.setCode(session.getCode());
        dto.setStatus(session.getStatus());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());

        // Set participant count
        List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(session.getId());
        dto.setParticipantCount(participants.size());

        return dto;
    }

    public boolean isUserHost(String sessionCode, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return false;
        }

        Session session = sessionOpt.get();

        // Check if this user is the session creator (preferred method)
        if (session.getCreatedBy() != null) {
            return session.getCreatedBy().getId().equals(user.getId());
        }

        // Fallback: check if user has DOCTOR role (since host is always doctor)
        SessionParticipant participant = getParticipantByUserAndSession(user, session);
        if (participant != null && participant.getRole() == SessionParticipant.Role.DOCTOR) {
            return true;
        }

        // Legacy fallback for existing sessions without createdBy field:
        // Check if user is the first participant (session creator)
        List<SessionParticipant> allParticipants = sessionParticipantRepository.findBySessionId(session.getId());
        if (!allParticipants.isEmpty()) {
            // Sort by ID to get the first participant (creator)
            SessionParticipant firstParticipant = allParticipants.stream()
                    .min((p1, p2) -> p1.getId().compareTo(p2.getId()))
                    .orElse(null);
            return firstParticipant != null && firstParticipant.getUser().getId().equals(user.getId());
        }

        return false;
    }

    public SessionParticipant.Role getUserRoleInSession(String sessionCode, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return null;
        }

        Session session = sessionOpt.get();
        SessionParticipant participant = getParticipantByUserAndSession(user, session);
        // Only return role if participant is active
        return (participant != null && participant.getIsActive()) ? participant.getRole() : null;
    }

    @Transactional
    public List<Session> leaveUserFromOtherActiveSessions(String currentSessionCode, User user) {
        // Get user's ACTIVE participations only
        List<SessionParticipant> userActiveParticipations = sessionParticipantRepository
                .findByUserIdAndIsActive(user.getId(), true);
        List<Session> otherActiveSessions = userActiveParticipations.stream()
                .map(SessionParticipant::getSession)
                .filter(session -> session.getStatus() == Session.Status.CREATED ||
                        session.getStatus() == Session.Status.IN_PROGRESS)
                .filter(session -> !session.getCode().equals(currentSessionCode)) // Exclude current session
                .toList();

        // Deactivate user from other active sessions (instead of deleting)
        List<Session> leftSessions = new ArrayList<>();
        for (Session session : otherActiveSessions) {
            Optional<SessionParticipant> participant = sessionParticipantRepository
                    .findBySessionIdAndUserId(session.getId(), user.getId());

            if (participant.isPresent() && participant.get().getIsActive()) {
                // Mark as inactive instead of deleting
                participant.get().setIsActive(false);
                sessionParticipantRepository.save(participant.get());
                leftSessions.add(session);
            }
        }

        return leftSessions;
    }

    /**
     * Start a phase and record the start time
     */
    public void startPhase(Session session, Session.Phase phase) {
        session.setPhase(phase);
        session.setPhaseStartTime(LocalDateTime.now());
        session.setTimerStartTimestamp(null); // Clear any stale timer timestamp

        // Set initial time remaining based on phase
        int totalTimeSeconds = 0;
        switch (phase) {
            case READING:
                totalTimeSeconds = session.getReadingTime() * 60;
                break;
            case CONSULTATION:
                totalTimeSeconds = session.getConsultationTime() * 60;
                break;
            default:
                totalTimeSeconds = 0;
        }
        session.setTimeRemaining(totalTimeSeconds);

        sessionRepository.save(session);
    }

    /**
     * Calculate remaining time for current phase
     */
    public int calculateRemainingTime(Session session) {
        if (session.getPhaseStartTime() == null) {
            return session.getTimeRemaining();
        }

        // Calculate elapsed time since phase started
        long elapsedSeconds = ChronoUnit.SECONDS.between(session.getPhaseStartTime(), LocalDateTime.now());

        // Get total time for current phase
        int totalTimeSeconds = 0;
        switch (session.getPhase()) {
            case READING:
                totalTimeSeconds = session.getReadingTime() * 60;
                break;
            case CONSULTATION:
                totalTimeSeconds = session.getConsultationTime() * 60;
                break;
            default:
                return 0; // No timer for other phases
        }

        // Calculate remaining time
        int remainingSeconds = Math.max(0, totalTimeSeconds - (int) elapsedSeconds);

        return remainingSeconds;
    }

    /**
     * Update session with current remaining time
     */
    public void updateSessionTimerInfo(Session session) {
        int remainingTime = calculateRemainingTime(session);
        session.setTimeRemaining(remainingTime);
        sessionRepository.save(session);
    }

    /**
     * Get session with updated timer information
     */
    public Session getSessionWithTimerInfo(String sessionCode) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            updateSessionTimerInfo(session);
            return session;
        }
        return null;
    }

    @Transactional
    public void markUserSessionCompleted(String sessionCode, User user) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            throw new RuntimeException("Session not found");
        }

        Session session = sessionOpt.get();
        Optional<SessionParticipant> participantOpt = sessionParticipantRepository
                .findBySessionIdAndUserId(session.getId(), user.getId());

        if (!participantOpt.isPresent()) {
            throw new RuntimeException("User is not a participant in this session");
        }

        SessionParticipant participant = participantOpt.get();
        participant.setHasCompleted(true);
        sessionParticipantRepository.save(participant);
    }

    @Transactional(readOnly = true)
    public boolean areAllUsersCompleted(String sessionCode) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return false;
        }

        Session session = sessionOpt.get();
        List<SessionParticipant> activeParticipants = sessionParticipantRepository
                .findBySessionIdAndIsActive(session.getId(), true);

        // Check if all active participants have completed their sessions
        return activeParticipants.stream()
                .allMatch(SessionParticipant::getHasCompleted);
    }

    @Transactional(readOnly = true)
    public boolean hasUserWithRoleGivenFeedback(String sessionCode, SessionParticipant.Role role) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return false;
        }

        Session session = sessionOpt.get();
        List<SessionParticipant> participantsWithRole = sessionParticipantRepository
                .findBySessionIdAndRole(session.getId(), role);

        // Check if any active participant with this role has given feedback for the
        // current round
        return participantsWithRole.stream()
                .filter(SessionParticipant::getIsActive)
                .anyMatch(participant -> hasUserGivenFeedbackForCurrentRound(sessionCode, participant.getUser()));
    }

    @Transactional(readOnly = true)
    public boolean hasUserGivenFeedbackForCurrentRound(String sessionCode, User user) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return false;
        }

        Session session = sessionOpt.get();

        // Check if user has given feedback for the current case and round
        List<Feedback> userFeedbackForSession = feedbackRepository.findBySessionIdAndSenderId(session.getId(),
                user.getId());

        return userFeedbackForSession.stream()
                .anyMatch(feedback -> feedback.getCaseId().equals(session.getSelectedCase().getId()) &&
                        feedback.getRoundNumber().equals(session.getCurrentRound()));
    }

    @Transactional(readOnly = true)
    public boolean hasUserCompleted(String sessionCode, User user) {
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return false;
        }

        Session session = sessionOpt.get();
        Optional<SessionParticipant> participantOpt = sessionParticipantRepository
                .findBySessionIdAndUserId(session.getId(), user.getId());

        return participantOpt.map(SessionParticipant::getHasCompleted).orElse(false);
    }

    @Transactional
    public void markUserFeedbackGiven(String sessionCode, User user) {
        // This method is kept for backwards compatibility but is no longer used
        // Feedback tracking is now done through the Feedback model with round numbers
        Optional<Session> sessionOpt = findSessionByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            throw new RuntimeException("Session not found");
        }

        Session session = sessionOpt.get();
        Optional<SessionParticipant> participantOpt = sessionParticipantRepository
                .findBySessionIdAndUserId(session.getId(), user.getId());

        if (!participantOpt.isPresent()) {
            throw new RuntimeException("User is not a participant in this session");
        }

        SessionParticipant participant = participantOpt.get();
        participant.setHasGivenFeedback(true);
        sessionParticipantRepository.save(participant);
    }

    private String generateSessionCode() {
        Random random = new Random();
        String code;
        do {
            code = String.format("%06d", random.nextInt(999999));
        } while (sessionRepository.findByCode(code).isPresent());
        return code;
    }

    public Case getRandomCase(List<String> topics) {
        if (topics == null || topics.isEmpty() || topics.contains("Random")) {
            // Use optimized native query instead of loading all cases
            Case randomCase = caseRepository.findRandomCase();
            if (randomCase == null) {
                throw new RuntimeException("No cases available");
            }
            return randomCase;
        } else {
            // Use optimized query for category-based selection
            Case randomCase = caseRepository.findRandomCaseByCategoryNames(topics);
            if (randomCase == null) {
                throw new RuntimeException("No cases available for selected topics");
            }
            return randomCase;
        }
    }

    public void resetParticipantStatus(String sessionCode) {
        Session session = findSessionByCode(sessionCode)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(session.getId());
        for (SessionParticipant participant : participants) {
            participant.setHasCompleted(false);
            participant.setHasGivenFeedback(false);
            sessionParticipantRepository.save(participant);
        }
    }

    // NEW: Optimized version of getUserSessions - prevents N+1 query problem
    public List<Session> getUserSessionsOptimized(Long userId) {
        List<SessionParticipant> participations = sessionParticipantRepository.findByUserIdWithSessions(userId);
        return participations.stream()
                .map(SessionParticipant::getSession)
                .toList();
    }

    // NEW: Optimized version using the new repository method
    public List<Session> getUserSessionsOptimized(User user) {
        return getUserSessionsOptimized(user.getId());
    }

    // NEW: Optimized random case selection - no longer loads all cases into memory
    public Case getRandomCaseOptimized(List<String> topics) {
        if (topics == null || topics.isEmpty() || topics.contains("Random")) {
            // Use optimized native query instead of loading all cases
            return caseRepository.findRandomCase();
        } else {
            // Use optimized query for category-based selection
            return caseRepository.findRandomCaseByCategoryNames(topics);
        }
    }

    // NEW: Optimized active sessions fetching
    public List<Session> getActiveSessionsOptimized() {
        // For simple lists, we can use the projection to avoid loading heavy data
        List<Object[]> projections = sessionRepository.findActiveSessionProjections();
        return projections.stream()
                .map(this::mapProjectionToSession)
                .toList();
    }

    // NEW: Helper method to map projection to Session entity
    private Session mapProjectionToSession(Object[] projection) {
        Session session = new Session();
        session.setId((Long) projection[0]);
        session.setTitle((String) projection[1]);
        session.setCode((String) projection[2]);
        session.setStatus((Session.Status) projection[3]);
        session.setPhase((Session.Phase) projection[4]);
        session.setCreatedAt((LocalDateTime) projection[5]);
        session.setStartTime((LocalDateTime) projection[6]);
        return session;
    }

    // NEW: Optimized session participant DTOs with reduced queries
    @Transactional(readOnly = true)
    public List<SessionParticipantDTO> getSessionParticipantDTOsOptimized(Long sessionId) {
        // Use the optimized query that already includes users
        List<SessionParticipant> activeParticipants = sessionParticipantRepository
                .findBySessionIdAndIsActiveWithUser(sessionId, true);

        return activeParticipants.stream()
                .map(participant -> {
                    SessionParticipantDTO dto = new SessionParticipantDTO();
                    dto.setId(participant.getId());
                    dto.setRole(participant.getRole());
                    // User is already eagerly loaded via JOIN FETCH, no additional query needed
                    if (participant.getUser() != null) {
                        UserDTO userDTO = new UserDTO();
                        userDTO.setId(participant.getUser().getId());
                        userDTO.setName(participant.getUser().getName());
                        userDTO.setEmail(participant.getUser().getEmail());
                        userDTO.setRole(participant.getUser().getRole());
                        dto.setUser(userDTO);
                    }
                    return dto;
                })
                .toList();
    }

    // NEW: Optimized method for getting session with case information
    public Optional<Session> findSessionByCodeWithCase(String code) {
        return sessionRepository.findByCodeWithCase(code);
    }

    // NEW: Optimized method for getting session with creator information
    public Optional<Session> findSessionByCodeWithCreator(String code) {
        return sessionRepository.findByCodeWithCreator(code);
    }

    // NEW: Optimized case selection for recall sessions
    public Case getRandomRecallCaseOptimized(String startDate, String endDate, List<Long> excludeIds) {
        return caseRepository.findRandomRecallCaseInDateRange(startDate, endDate, excludeIds);
    }

    // NEW: Count active sessions without loading data
    public long countActiveSessions() {
        return sessionRepository.countActiveSessions();
    }
}