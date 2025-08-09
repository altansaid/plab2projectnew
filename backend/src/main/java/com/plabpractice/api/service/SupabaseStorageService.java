package com.plabpractice.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service_key}")
    private String serviceKey;

    @Value("${supabase.bucket}")
    private String bucketName;

    @Value("${supabase.public:true}")
    private boolean isPublicBucket;

    @Value("${supabase.prefix:}")
    private String pathPrefix;

    @Value("${supabase.signed_url_ttl_seconds:604800}")
    private long signedUrlTtlSeconds;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String uploadImageAndGetUrl(MultipartFile file) {
        if (isBlank(supabaseUrl) || isBlank(serviceKey) || isBlank(bucketName)) {
            throw new IllegalStateException(
                    "Supabase configuration is missing. Please set SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET.");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String uniqueFilename = UUID.randomUUID() + fileExtension;
            String normalizedPrefix = (pathPrefix == null) ? "" : pathPrefix.trim();
            if (normalizedPrefix.startsWith("/")) {
                normalizedPrefix = normalizedPrefix.substring(1);
            }
            if (normalizedPrefix.endsWith("/")) {
                normalizedPrefix = normalizedPrefix.substring(0, normalizedPrefix.length() - 1);
            }
            String objectPath = normalizedPrefix.isEmpty() ? uniqueFilename : normalizedPrefix + "/" + uniqueFilename;

            // Upload the file
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + urlEncodePath(objectPath);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + serviceKey);
            headers.set("apikey", serviceKey);

            // Determine correct image content type for Supabase (rejects octet-stream)
            String detectedContentType = file.getContentType();
            if (isBlank(detectedContentType) || !detectedContentType.startsWith("image/")) {
                // Fallback by file extension
                String fallback = mimeTypeFromExtension(fileExtension);
                if (fallback == null) {
                    throw new RestClientException("Unsupported or unknown image MIME type");
                }
                detectedContentType = fallback;
            }
            headers.setContentType(MediaType.parseMediaType(detectedContentType));

            HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);
            ResponseEntity<String> uploadResponse = restTemplate.exchange(uploadUrl, HttpMethod.POST, requestEntity,
                    String.class);

            if (!uploadResponse.getStatusCode().is2xxSuccessful()) {
                throw new RestClientException("Supabase upload failed with status: " + uploadResponse.getStatusCode());
            }

            // Public bucket: construct public URL
            if (isPublicBucket) {
                return supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + objectPath;
            }

            // Private bucket: create signed URL
            String signUrl = supabaseUrl + "/storage/v1/object/sign/" + bucketName + "/" + urlEncodePath(objectPath);

            HttpHeaders signHeaders = new HttpHeaders();
            signHeaders.set("Authorization", "Bearer " + serviceKey);
            signHeaders.set("apikey", serviceKey);
            signHeaders.setContentType(MediaType.APPLICATION_JSON);

            String payload = "{\"expiresIn\":" + signedUrlTtlSeconds + "}";
            HttpEntity<String> signEntity = new HttpEntity<>(payload, signHeaders);

            ResponseEntity<String> signResponse = restTemplate.exchange(signUrl, HttpMethod.POST, signEntity,
                    String.class);
            if (!signResponse.getStatusCode().is2xxSuccessful() || signResponse.getBody() == null) {
                throw new RestClientException("Failed to create signed URL: " + signResponse.getStatusCode());
            }

            String signedUrl = parseSignedUrl(signResponse.getBody());
            if (isBlank(signedUrl)) {
                throw new RestClientException("Signed URL not found in response: " + signResponse.getBody());
            }

            // If Supabase returns a path-only, prefix base URL
            if (signedUrl.startsWith("/")) {
                return supabaseUrl + signedUrl;
            }
            return signedUrl;

        } catch (Exception ex) {
            throw new RuntimeException("Supabase upload error: " + ex.getMessage(), ex);
        }
    }

    private String parseSignedUrl(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            String url = null;
            if (node.has("signedURL")) {
                url = node.get("signedURL").asText(null);
            }
            if (isBlank(url) && node.has("url")) {
                url = node.get("url").asText(null);
            }
            return url;
        } catch (Exception e) {
            return null;
        }
    }

    private String urlEncodePath(String value) {
        // Encode each segment to preserve '/'
        return Arrays.stream(value.split("/"))
                .map(segment -> URLEncoder.encode(segment, StandardCharsets.UTF_8))
                .collect(Collectors.joining("/"));
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String mimeTypeFromExtension(String extensionWithDot) {
        if (extensionWithDot == null) return null;
        String ext = extensionWithDot.toLowerCase();
        switch (ext) {
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".png":
                return "image/png";
            case ".gif":
                return "image/gif";
            case ".webp":
                return "image/webp";
            default:
                return null;
        }
    }
}
