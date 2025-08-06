package com.plabpractice.api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
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
import org.springframework.http.HttpHeaders;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SupabaseJwtAuthenticationFilter supabaseJwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    public WebSecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
            SupabaseJwtAuthenticationFilter supabaseJwtAuthenticationFilter,
            CustomUserDetailsService userDetailsService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.supabaseJwtAuthenticationFilter = supabaseJwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    // Public auth endpoints
                    auth.requestMatchers("/api/auth/login").permitAll()
                            .requestMatchers("/api/auth/register").permitAll()
                            .requestMatchers("/api/auth/google").permitAll()
                            .requestMatchers("/api/auth/forgot-password").permitAll()
                            .requestMatchers("/api/auth/reset-password").permitAll()
                            .requestMatchers("/api/auth/ping").permitAll()
                            .requestMatchers("/api/auth/test-google-config").permitAll()

                            // Protected profile endpoints
                            .requestMatchers("/api/auth/profile").authenticated()
                            .requestMatchers("/api/auth/change-password").authenticated()

                            // Admin endpoints
                            .requestMatchers("/api/admin/**").hasRole("ADMIN")

                            // Other endpoints
                            .requestMatchers("/api/upload/**").permitAll()
                            .requestMatchers("/api/uploads/**").permitAll()
                            .requestMatchers("/ws/**").permitAll()
                            .requestMatchers("/ping").permitAll()
                            .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();

                    if (h2ConsoleEnabled) {
                        auth.requestMatchers("/h2-console/**").permitAll();
                    }

                    auth.anyRequest().authenticated();
                })
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(supabaseJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(jwtAuthenticationFilter, SupabaseJwtAuthenticationFilter.class)
                .headers(headers -> {
                    headers.frameOptions().deny();
                    headers.contentTypeOptions();
                    headers.xssProtection();
                    headers.cacheControl();

                    // Add security headers
                    headers.addHeaderWriter((request, response) -> {
                        response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
                    });

                    headers.httpStrictTransportSecurity(hstsConfig -> {
                        hstsConfig.maxAgeInSeconds(31536000)
                                .includeSubDomains(true);
                    });

                    if (h2ConsoleEnabled) {
                        headers.frameOptions().sameOrigin();
                    }
                });

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        String[] origins = allowedOrigins.split(",");
        configuration.setAllowedOrigins(Arrays.asList(origins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setExposedHeaders(Arrays.asList("Cross-Origin-Opener-Policy"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}