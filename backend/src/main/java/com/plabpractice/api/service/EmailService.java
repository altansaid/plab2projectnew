package com.plabpractice.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Value("${APP_FRONTEND_URL:${app.frontend.url:http://localhost:3000}}")
    private String frontendUrl;

    // Read directly from environment to avoid extra property plumbing
    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    // Set a default, but ideally provide a verified sender via APP_EMAIL_FROM
    @Value("${APP_EMAIL_FROM:no-reply@plab2practice.com}")
    private String fromEmail;

    @Value("${APP_EMAIL_REPLY_TO:}")
    private String replyToEmail;

    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            String subject = "Password Reset Request - PLAB Practice Platform";
            String resetLink = String.format("%s/reset-password?token=%s", frontendUrl, resetToken);
            String textBody = buildPasswordResetMessage(resetToken);
            String htmlBody = buildPasswordResetHtml(resetLink);

            if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
                sendViaResend(toEmail, subject, textBody, htmlBody);
            } else {
                // Fallback: log-only (development)
                logger.info("=== MOCK EMAIL SERVICE ===");
                logger.info("To: {}", toEmail);
                logger.info("Subject: {}", subject);
                logger.info("Reset Link: {}", resetLink);
                logger.info("Message: {}", textBody);
                logger.info("=== END MOCK EMAIL ===");
            }

        } catch (Exception e) {
            logger.error("Failed to send password reset email to: {}", toEmail, e);
            // Don't throw exception to prevent information disclosure
        }
    }

    private void sendViaResend(String toEmail, String subject, String textBody, String htmlBody) {
        try {
            HttpClient client = HttpClient.newHttpClient();

            Map<String, Object> payload = new HashMap<>();
            // Use a branded from if possible (must be a verified sender in Resend)
            payload.put("from", String.format("PLAB Practice <%s>", fromEmail));
            payload.put("to", List.of(toEmail));
            payload.put("subject", subject);
            payload.put("text", textBody);
            payload.put("html", htmlBody);
            if (replyToEmail != null && !replyToEmail.trim().isEmpty()) {
                payload.put("reply_to", replyToEmail);
            }

            ObjectMapper mapper = new ObjectMapper();
            String json = mapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                logger.error("Resend API returned non-2xx status: {} body: {}", status, response.body());
            } else {
                logger.info("Password reset email queued via Resend for {}", toEmail);
            }
        } catch (Exception ex) {
            logger.error("Error sending email via Resend", ex);
        }
    }

    private String buildPasswordResetMessage(String resetToken) {
        return String.format(
                "Hello,\n\n" +
                        "You have requested to reset your password for the PLAB Practice Platform.\n\n" +
                        "Please click the following link to reset your password:\n" +
                        "%s/reset-password?token=%s\n\n" +
                        "This link will expire in 15 minutes.\n\n" +
                        "If you didn't request this password reset, please ignore this email.\n\n" +
                        "Best regards,\n" +
                        "PLAB Practice Platform Team",
                frontendUrl, resetToken);
    }

    private String buildPasswordResetHtml(String resetLink) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #222;\">");
        sb.append("<p>Hello,</p>");
        sb.append("<p>You have requested to reset your password for the <strong>PLAB Practice Platform</strong>.</p>");
        sb.append("<p>Please click the button below to reset your password:</p>");
        sb.append(String.format(
                "<p><a href=\"%s\" style=\"display:inline-block;padding:10px 16px;background:#1976d2;color:#fff;text-decoration:none;border-radius:4px;\">Reset Password</a></p>",
                resetLink));
        sb.append("<p>If the button doesn't work, copy and paste this link into your browser:</p>");
        sb.append(String.format("<p><a href=\"%s\">%s</a></p>", resetLink, resetLink));
        sb.append(
                "<p style=\"color:#555; font-size: 13px;\">This link will expire in 15 minutes. If you didn't request this password reset, you can safely ignore this email.</p>");
        sb.append("<p>Best regards,<br/>PLAB Practice Platform Team</p>");
        sb.append("</div>");
        return sb.toString();
    }
}