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
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
@Transactional
public class SessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository sessionParticipantRepository;

    @Autowired
    private ObjectMapper objectMapper;

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

            // Check if user is already in session
            if (!sessionParticipantRepository.existsBySessionIdAndUserId(session.getId(), user.getId())) {
                SessionParticipant participant = new SessionParticipant();
                participant.setSession(session);
                participant.setUser(user);
                participant.setRole(SessionParticipant.Role.PARTICIPANT);
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
        List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(sessionId);
        return participants.stream()
                .map(participant -> {
                    SessionParticipantDTO dto = new SessionParticipantDTO();
                    dto.setId(participant.getId());
                    dto.setRole(participant.getRole());
                    // Create UserDTO within transaction scope
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
        List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(session.getId());
        List<SessionParticipant.Role> takenRoles = participants.stream()
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

        // Check if user is already in session
        Optional<SessionParticipant> existingParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(session.getId(), user.getId());

        if (existingParticipant.isPresent()) {
            // User is already in session, update their role if different
            SessionParticipant participant = existingParticipant.get();
            if (!participant.getRole().toString().equals(upperRole)) {
                // Prevent changing to DOCTOR role if not host
                if (upperRole.equals("DOCTOR") && !isUserHost(sessionCode, user)) {
                    throw new RuntimeException("Only the session host can be assigned the Doctor role");
                }

                // Check if new role is available (except for Observer)
                if (!upperRole.equals("OBSERVER")) {
                    List<String> availableRoles = getAvailableRoles(session);
                    if (!availableRoles.contains(upperRole)) {
                        throw new RuntimeException(
                                "Role '" + upperRole + "' is not available. Available roles: " + availableRoles);
                    }
                }
                participant.setRole(SessionParticipant.Role.valueOf(upperRole));
                sessionParticipantRepository.save(participant);
            }
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
        return participant != null ? participant.getRole() : null;
    }

    private String generateSessionCode() {
        Random random = new Random();
        String code;
        do {
            code = String.format("%06d", random.nextInt(999999));
        } while (sessionRepository.findByCode(code).isPresent());
        return code;
    }
}