package com.plabpractice.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GoogleTokenVerifierTest {

    private GoogleTokenVerifier googleTokenVerifier;

    @BeforeEach
    void setUp() {
        googleTokenVerifier = new GoogleTokenVerifier();
    }

    @Test
    void verify_MockMode_ReturnsDefaultUser() throws Exception {
        // Arrange - OAuth disabled (mock mode)
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", false);
        ReflectionTestUtils.setField(googleTokenVerifier, "googleClientId", "");

        // Act
        Map<String, Object> result = googleTokenVerifier.verify("any_token");

        // Assert
        assertNotNull(result);
        assertEquals("mock_google_id_123", result.get("sub"));
        assertEquals("admin@plab.com", result.get("email"));
        assertEquals("Admin User", result.get("name"));
        assertTrue((Boolean) result.get("email_verified"));
    }

    @Test
    void isGoogleOAuthEnabled_WhenDisabled_ReturnsFalse() {
        // Arrange
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", false);

        // Act
        boolean result = googleTokenVerifier.isGoogleOAuthEnabled();

        // Assert
        assertFalse(result);
    }

    @Test
    void isGoogleOAuthEnabled_WhenEnabled_ReturnsTrue() {
        // Arrange
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", true);

        // Act
        boolean result = googleTokenVerifier.isGoogleOAuthEnabled();

        // Assert
        assertTrue(result);
    }

    @Test
    void getGoogleClientId_ReturnsConfiguredId() {
        // Arrange
        String expectedClientId = "test-client-id.apps.googleusercontent.com";
        ReflectionTestUtils.setField(googleTokenVerifier, "googleClientId", expectedClientId);

        // Act
        String result = googleTokenVerifier.getGoogleClientId();

        // Assert
        assertEquals(expectedClientId, result);
    }

    @Test
    void verify_EnabledWithoutClientId_ThrowsException() {
        // Arrange
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", true);
        ReflectionTestUtils.setField(googleTokenVerifier, "googleClientId", "");

        // Act & Assert
        Exception exception = assertThrows(IllegalStateException.class, () -> {
            googleTokenVerifier.verify("some_token");
        });

        assertTrue(exception.getMessage().contains("GOOGLE_CLIENT_ID is not configured"));
    }

    @Test
    void verify_EnabledWithNullClientId_ThrowsException() {
        // Arrange
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", true);
        ReflectionTestUtils.setField(googleTokenVerifier, "googleClientId", null);

        // Act & Assert
        Exception exception = assertThrows(IllegalStateException.class, () -> {
            googleTokenVerifier.verify("some_token");
        });

        assertTrue(exception.getMessage().contains("GOOGLE_CLIENT_ID is not configured"));
    }

    @Test
    void verify_InvalidTokenFormat_ThrowsSecurityException() {
        // Arrange
        ReflectionTestUtils.setField(googleTokenVerifier, "googleOAuthEnabled", true);
        ReflectionTestUtils.setField(googleTokenVerifier, "googleClientId", "valid-client-id");

        // Act & Assert - Invalid token will fail verification
        assertThrows(SecurityException.class, () -> {
            googleTokenVerifier.verify("not.a.valid.jwt.token");
        });
    }
}

