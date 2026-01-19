package com.plabpractice.api.security;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Key;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${supabase.jwt.secret:}")
    private String supabaseJwtSecret;

    // Constructor injection
    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
            CustomUserDetailsService customUserDetailsService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (jwt != null) {
                // First try Supabase JWT validation
                SupabaseUserInfo supabaseUser = validateSupabaseTokenAndGetInfo(jwt);

                if (supabaseUser != null && supabaseUser.email != null) {
                    // Supabase token is valid - get or create user
                    UserDetails userDetails = getOrCreateSupabaseUser(supabaseUser);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else if (jwtTokenProvider.validateToken(jwt)) {
                    // Fallback to legacy JWT validation
                    String username = jwtTokenProvider.getUsernameFromToken(jwt);

                    UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }
    
    /**
     * Get existing user or auto-create for Supabase authenticated users.
     */
    private UserDetails getOrCreateSupabaseUser(SupabaseUserInfo supabaseUser) {
        // Try to find existing user
        Optional<User> existingUser = userRepository.findByEmail(supabaseUser.email);
        
        if (existingUser.isEmpty() && supabaseUser.supabaseId != null) {
            existingUser = userRepository.findBySupabaseId(supabaseUser.supabaseId);
        }
        
        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            // Update supabaseId if not set
            if (user.getSupabaseId() == null && supabaseUser.supabaseId != null) {
                user.setSupabaseId(supabaseUser.supabaseId);
                user.setMigratedToSupabase(true);
                userRepository.save(user);
            }
        } else {
            // Auto-create new user from Supabase data
            user = new User();
            user.setEmail(supabaseUser.email);
            user.setName(supabaseUser.name != null ? supabaseUser.name : supabaseUser.email.split("@")[0]);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // Random password
            user.setRole(User.Role.USER);
            user.setSupabaseId(supabaseUser.supabaseId);
            user.setMigratedToSupabase(true);
            user.setProvider(supabaseUser.isGoogle ? User.AuthProvider.GOOGLE : User.AuthProvider.LOCAL);
            user = userRepository.save(user);
            logger.info("Auto-created user from Supabase: " + supabaseUser.email);
        }
        
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .build();
    }

    /**
     * Helper class to hold Supabase user info extracted from JWT.
     */
    private static class SupabaseUserInfo {
        String email;
        String name;
        String supabaseId;
        boolean isGoogle;
    }
    
    /**
     * Validate Supabase JWT token and return user info if valid.
     * Returns null if the token is not a valid Supabase token.
     */
    private SupabaseUserInfo validateSupabaseTokenAndGetInfo(String token) {
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

            SupabaseUserInfo info = new SupabaseUserInfo();
            
            // Extract email
            info.email = claims.get("email", String.class);
            
            // Extract supabase user ID (sub claim)
            info.supabaseId = claims.getSubject();
            
            // Try to extract name from user_metadata
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> userMetadata = claims.get("user_metadata", java.util.Map.class);
            if (userMetadata != null) {
                if (userMetadata.containsKey("name")) {
                    info.name = (String) userMetadata.get("name");
                } else if (userMetadata.containsKey("full_name")) {
                    info.name = (String) userMetadata.get("full_name");
                }
            }
            
            // Check if Google provider from app_metadata
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> appMetadata = claims.get("app_metadata", java.util.Map.class);
            if (appMetadata != null && "google".equals(appMetadata.get("provider"))) {
                info.isGoogle = true;
            }

            if (info.email == null || info.email.isEmpty()) {
                return null;
            }

            return info;
        } catch (JwtException | IllegalArgumentException e) {
            // Token is not a valid Supabase JWT, will try legacy validation
            logger.debug("Token is not a valid Supabase JWT: " + e.getMessage());
            return null;
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}