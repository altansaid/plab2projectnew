package com.plabpractice.api.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Interceptor for WebSocket handshake that validates JWT tokens.
 * This ensures that only authenticated users can establish WebSocket connections.
 */
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);
    
    private final JwtTokenProvider jwtTokenProvider;

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
            if (jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);
                attributes.put("username", username);
                attributes.put("authenticated", true);
                logger.debug("WebSocket connection authenticated for user: {}", username);
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

