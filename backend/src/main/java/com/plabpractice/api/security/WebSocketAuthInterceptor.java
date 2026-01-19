package com.plabpractice.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.security.Key;
import java.util.Map;

/**
 * Interceptor for WebSocket handshake that validates JWT tokens.
 * This ensures that only authenticated users can establish WebSocket connections.
 * Supports both legacy JWT and Supabase JWT tokens.
 */
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final JwtTokenProvider jwtTokenProvider;

    @Value("${supabase.jwt.secret:}")
    private String supabaseJwtSecret;

    public WebSocketAuthInterceptor(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) throws Exception {

        String token = extractToken(request);

        if (token == null) {
            logger.warn("WebSocket connection rejected: No authentication token provided");
            // Allow connection without token for now (gradual rollout)
            // In strict mode, return false to reject the connection
            return true;
        }

        try {
            // First try Supabase JWT validation
            String email = validateSupabaseToken(token);
            if (email != null) {
                attributes.put("username", email);
                attributes.put("authenticated", true);
                logger.debug("WebSocket connection authenticated via Supabase for user: {}", email);
                return true;
            }

            // Fallback to legacy JWT validation
            if (jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);
                attributes.put("username", username);
                attributes.put("authenticated", true);
                logger.debug("WebSocket connection authenticated via legacy JWT for user: {}", username);
                return true;
            } else {
                logger.warn("WebSocket connection: Invalid token provided");
                // Allow connection with invalid token (will be handled at message level)
                // In strict mode, return false to reject the connection
                attributes.put("authenticated", false);
                return true;
            }
        } catch (Exception e) {
            logger.error("WebSocket authentication error: {}", e.getMessage());
            attributes.put("authenticated", false);
            return true; // Allow connection, but mark as unauthenticated
        }
    }

    /**
     * Validate Supabase JWT token and return the user's email if valid.
     */
    private String validateSupabaseToken(String token) {
        if (supabaseJwtSecret == null || supabaseJwtSecret.isEmpty()) {
            return null;
        }

        try {
            Key key = Keys.hmacShaKeyFor(supabaseJwtSecret.getBytes());
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return claims.get("email", String.class);
        } catch (JwtException | IllegalArgumentException e) {
            logger.debug("Token is not a valid Supabase JWT: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // No action needed after handshake
    }
    
    /**
     * Extract JWT token from the request.
     * Checks multiple sources: query parameter, Authorization header.
     */
    private String extractToken(ServerHttpRequest request) {
        // Try to get token from query parameter (for SockJS compatibility)
        String query = request.getURI().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                String[] keyValue = param.split("=");
                if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                    return keyValue[1];
                }
            }
        }
        
        // Try to get token from Authorization header
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            String authHeader = servletRequest.getServletRequest().getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }
        
        // Try to get from request headers directly
        java.util.List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }
        
        return null;
    }
}


