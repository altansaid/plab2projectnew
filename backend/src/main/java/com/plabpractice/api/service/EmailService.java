package com.plabpractice.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            // Mock email service for development - logs to console
            logger.info("=== MOCK EMAIL SERVICE ===");
            logger.info("To: {}", toEmail);
            logger.info("Subject: Password Reset Request - PLAB Practice Platform");
            logger.info("Reset Link: {}/reset-password?token={}", frontendUrl, resetToken);
            logger.info("Message: {}", buildPasswordResetMessage(resetToken));
            logger.info("=== END MOCK EMAIL ===");

        } catch (Exception e) {
            logger.error("Failed to send password reset email to: {}", toEmail, e);
            // Don't throw exception to prevent information disclosure
        }
    }

    private String buildPasswordResetMessage(String resetToken) {
        return String.format(
                "Hello,\n\n" +
                        "You have requested to reset your password for the PLAB Practice Platform.\n\n" +
                        "Please click the following link to reset your password:\n" +
                        "%s/reset-password?token=%s\n\n" +
                        "This link will expire in 24 hours.\n\n" +
                        "If you didn't request this password reset, please ignore this email.\n\n" +
                        "Best regards,\n" +
                        "PLAB Practice Platform Team",
                frontendUrl, resetToken);
    }
}