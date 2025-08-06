package com.plabpractice.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.service.UserSyncService;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Component
public class SupabaseJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseJwtAuthenticationFilter.class);

    private final SupabaseJwtTokenProvider supabaseJwtTokenProvider;
    private final JwtTokenProvider legacyJwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final UserSyncService userSyncService;

    @Autowired
    public SupabaseJwtAuthenticationFilter(
            SupabaseJwtTokenProvider supabaseJwtTokenProvider,
            JwtTokenProvider legacyJwtTokenProvider,
            CustomUserDetailsService customUserDetailsService,
            UserRepository userRepository,
            UserSyncService userSyncService) {
        this.supabaseJwtTokenProvider = supabaseJwtTokenProvider;
        this.legacyJwtTokenProvider = legacyJwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
        this.userRepository = userRepository;
        this.userSyncService = userSyncService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (jwt != null) {
                // Try Supabase token first
                if (supabaseJwtTokenProvider.validateSupabaseToken(jwt)) {
                    handleSupabaseToken(jwt, request);
                }
                // Fallback to legacy token validation
                else if (legacyJwtTokenProvider.validateToken(jwt)) {
                    handleLegacyToken(jwt, request);
                } else {
                    logger.debug("Invalid JWT token received");
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private void handleSupabaseToken(String jwt, HttpServletRequest request) {
        try {
            String supabaseUserId = supabaseJwtTokenProvider.getUserIdFromSupabaseToken(jwt);
            String email = supabaseJwtTokenProvider.getEmailFromSupabaseToken(jwt);

            if (supabaseUserId != null && email != null) {
                // Try to find existing user by Supabase ID or email
                Optional<User> userOpt = userRepository.findBySupabaseId(supabaseUserId);

                if (userOpt.isEmpty()) {
                    userOpt = userRepository.findByEmail(email);
                }

                User user;
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                    // Update Supabase ID if not set
                    if (user.getSupabaseId() == null) {
                        user.setSupabaseId(supabaseUserId);
                        userRepository.save(user);
                    }
                } else {
                    // Create new user from Supabase token
                    user = userSyncService.createUserFromSupabaseToken(jwt);
                    if (user == null) {
                        logger.warn("Failed to create user from Supabase token");
                        return;
                    }
                }

                // Create UserDetails and set authentication
                UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password("") // No password needed for Supabase users
                        .authorities(
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                        .build();

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.debug("Set authentication for Supabase user: {}", user.getEmail());
            }
        } catch (Exception e) {
            logger.error("Error handling Supabase token", e);
        }
    }

    private void handleLegacyToken(String jwt, HttpServletRequest request) {
        try {
            String username = legacyJwtTokenProvider.getUsernameFromToken(jwt);

            UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            logger.debug("Set authentication for legacy user: {}", username);
        } catch (Exception e) {
            logger.error("Error handling legacy token", e);
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