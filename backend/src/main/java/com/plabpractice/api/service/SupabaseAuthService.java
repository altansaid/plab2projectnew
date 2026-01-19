package com.plabpractice.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class SupabaseAuthService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service_key}")
    private String serviceKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Fetches all users from Supabase Auth using the Admin API.
     * Returns a list of user maps containing id, email, name, provider, and createdAt.
     */
    public List<Map<String, Object>> getAllSupabaseUsers() {
        if (supabaseUrl == null || supabaseUrl.isEmpty() || serviceKey == null || serviceKey.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> allUsers = new ArrayList<>();
        int page = 1;
        int perPage = 100;

        try {
            while (true) {
                String url = supabaseUrl + "/auth/v1/admin/users?page=" + page + "&per_page=" + perPage;

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + serviceKey);
                headers.set("apikey", serviceKey);
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode usersNode = root.has("users") ? root.get("users") : root;

                    if (usersNode.isArray()) {
                        for (JsonNode userNode : usersNode) {
                            Map<String, Object> user = parseSupabaseUser(userNode);
                            if (user != null) {
                                allUsers.add(user);
                            }
                        }

                        // Check if we got less users than per_page, meaning we're done
                        if (usersNode.size() < perPage) {
                            break;
                        }
                        page++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch Supabase users: " + e.getMessage());
        }

        return allUsers;
    }

    private Map<String, Object> parseSupabaseUser(JsonNode userNode) {
        try {
            Map<String, Object> user = new HashMap<>();

            // Basic fields
            user.put("supabaseId", userNode.has("id") ? userNode.get("id").asText() : null);
            user.put("email", userNode.has("email") ? userNode.get("email").asText() : null);

            // Get name from user_metadata
            String name = null;
            if (userNode.has("user_metadata") && !userNode.get("user_metadata").isNull()) {
                JsonNode metadata = userNode.get("user_metadata");
                if (metadata.has("name")) {
                    name = metadata.get("name").asText();
                } else if (metadata.has("full_name")) {
                    name = metadata.get("full_name").asText();
                }
            }
            // Fallback to email prefix if no name
            if (name == null || name.isEmpty()) {
                String email = (String) user.get("email");
                if (email != null && email.contains("@")) {
                    name = email.split("@")[0];
                } else {
                    name = "User";
                }
            }
            user.put("name", name);

            // Get provider from app_metadata or identities
            String provider = "LOCAL";
            if (userNode.has("app_metadata") && !userNode.get("app_metadata").isNull()) {
                JsonNode appMetadata = userNode.get("app_metadata");
                if (appMetadata.has("provider")) {
                    String prov = appMetadata.get("provider").asText();
                    if ("google".equalsIgnoreCase(prov)) {
                        provider = "GOOGLE";
                    }
                }
            }
            user.put("provider", provider);

            // Parse created_at
            if (userNode.has("created_at") && !userNode.get("created_at").isNull()) {
                String createdAt = userNode.get("created_at").asText();
                user.put("createdAt", createdAt);
            }

            // Default role (Supabase doesn't have roles, we'll handle this separately)
            user.put("role", "USER");

            // Email confirmed status
            if (userNode.has("email_confirmed_at") && !userNode.get("email_confirmed_at").isNull()) {
                user.put("emailConfirmed", true);
            } else {
                user.put("emailConfirmed", false);
            }

            return user;
        } catch (Exception e) {
            System.err.println("Failed to parse Supabase user: " + e.getMessage());
            return null;
        }
    }
}
