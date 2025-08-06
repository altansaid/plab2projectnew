package com.plabpractice.api.config;

import com.plabpractice.api.security.JwtAuthenticationFilter;
import com.plabpractice.api.security.SupabaseJwtAuthenticationFilter;
import com.plabpractice.api.security.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security configuration for the PLab Practice Platform.
 * Supports both legacy JWT and Supabase authentication.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SupabaseJwtAuthenticationFilter supabaseJwtAuthenticationFilter;
    private final JwtAuthenticationFilter legacyJwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    public SecurityConfig(
            SupabaseJwtAuthenticationFilter supabaseJwtAuthenticationFilter,
            JwtAuthenticationFilter legacyJwtAuthenticationFilter,
            CustomUserDetailsService userDetailsService) {
        this.supabaseJwtAuthenticationFilter = supabaseJwtAuthenticationFilter;
        this.legacyJwtAuthenticationFilter = legacyJwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    // Public endpoints
                    auth.requestMatchers("/api/auth/**").permitAll()
                            .requestMatchers("/api/ping").permitAll()
                            .requestMatchers("/ping").permitAll()

                            // File uploads and public assets
                            .requestMatchers("/api/upload/**").permitAll()
                            .requestMatchers("/api/uploads/**").permitAll()

                            // WebSocket endpoints
                            .requestMatchers("/ws/**").permitAll()

                            // Health checks and documentation
                            .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();

                    // H2 Console (development only)
                    if (h2ConsoleEnabled) {
                        auth.requestMatchers("/h2-console/**").permitAll();
                    }

                    // Admin endpoints
                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

                    // All other API endpoints require authentication
                    auth.requestMatchers("/api/**").authenticated()
                            .anyRequest().permitAll();
                })
                .authenticationProvider(authenticationProvider())
                // Supabase filter first (primary authentication)
                .addFilterBefore(supabaseJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Legacy filter as fallback
                .addFilterAfter(legacyJwtAuthenticationFilter, SupabaseJwtAuthenticationFilter.class)
                .headers(headers -> {
                    headers.frameOptions(frameOptions -> frameOptions.deny())
                            .contentTypeOptions(contentTypeOptions -> {
                            })
                            .httpStrictTransportSecurity(
                                    hstsConfig -> hstsConfig.maxAgeInSeconds(31536000).includeSubdomains(true));

                    // Allow H2 Console frames in development
                    if (h2ConsoleEnabled) {
                        headers.frameOptions(frameOptions -> frameOptions.sameOrigin());
                    }
                });

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Parse allowed origins from configuration
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);

        // Allow common HTTP methods
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Allow common headers
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "X-Requested-With",
                "Accept", "Origin", "Access-Control-Request-Method",
                "Access-Control-Request-Headers"));

        // Allow credentials for authenticated requests
        configuration.setAllowCredentials(true);

        // Cache preflight requests for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}