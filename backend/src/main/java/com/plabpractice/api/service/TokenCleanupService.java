package com.plabpractice.api.service;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TokenCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(TokenCleanupService.class);

    private final UserRepository userRepository;

    public TokenCleanupService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Run every hour
    @Scheduled(cron = "0 0 * * * *")
    public void clearExpiredResetTokens() {
        try {
            List<User> expired = userRepository.findUsersWithExpiredResetTokens(LocalDateTime.now());
            if (!expired.isEmpty()) {
                expired.forEach(User::clearResetToken);
                userRepository.saveAll(expired);
                logger.info("Cleared {} expired password reset tokens", expired.size());
            }
        } catch (Exception e) {
            logger.error("Error while clearing expired reset tokens", e);
        }
    }
}

