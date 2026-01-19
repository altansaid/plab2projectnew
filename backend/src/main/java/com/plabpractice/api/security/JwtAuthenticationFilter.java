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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Key;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;

    @Value("${supabase.jwt.secret:}")
    private String supabaseJwtSecret;

    // Constructor injection
    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
            CustomUserDetailsService customUserDetailsService,
            UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (jwt != null) {
                // First try Supabase JWT validation
                String email = validateSupabaseToken(jwt);

                if (email != null) {
                    // Supabase token is valid
                    UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
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
     * Validate Supabase JWT token and return the user's email if valid.
     * Returns null if the token is not a valid Supabase token.
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

            // Supabase tokens have 'email' in the claims
            String email = claims.get("email", String.class);

            // Also check for 'sub' which is the Supabase user ID
            String supabaseId = claims.getSubject();

            if (email != null && !email.isEmpty()) {
                // Try to find user by email first
                Optional<User> userOpt = userRepository.findByEmail(email);

                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    // Update supabaseId if not set
                    if (user.getSupabaseId() == null && supabaseId != null) {
                        user.setSupabaseId(supabaseId);
                        user.setMigratedToSupabase(true);
                        userRepository.save(user);
                    }
                    return email;
                }

                // If user not found by email, try by supabaseId
                if (supabaseId != null) {
                    Optional<User> userBySupabase = userRepository.findBySupabaseId(supabaseId);
                    if (userBySupabase.isPresent()) {
                        return userBySupabase.get().getEmail();
                    }
                }
            }

            return email;
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