package com.plabpractice.api.controller;

import com.plabpractice.api.service.SupabaseStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://plab2projectnew.vercel.app",
        "https://plab2practice.com"
})
public class FileUploadController {

    private final SupabaseStorageService supabaseStorageService;
    
    // Allowed MIME types for image uploads
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg",
            "image/jpg", 
            "image/png",
            "image/gif",
            "image/webp"
    );
    
    // Allowed file extensions
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
    );
    
    // Maximum file size: 5MB
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    public FileUploadController(SupabaseStorageService supabaseStorageService) {
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        try {
            // Validate file is not empty
            if (file.isEmpty()) {
                response.put("error", "File cannot be empty");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file type (MIME type validation)
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
                response.put("error", "Only image files are allowed (JPEG, PNG, GIF, WebP)");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file extension
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !hasAllowedExtension(originalFilename)) {
                response.put("error", "Invalid file extension. Allowed: jpg, jpeg, png, gif, webp");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Sanitize filename to prevent path traversal attacks
            String sanitizedFilename = sanitizeFilename(originalFilename);
            if (sanitizedFilename.isEmpty()) {
                response.put("error", "Invalid filename");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file size (max 5MB)
            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("error", "File size cannot exceed 5MB");
                return ResponseEntity.badRequest().body(response);
            }

            // Upload to Supabase and return the public/signed URL
            String publicUrl = supabaseStorageService.uploadImageAndGetUrl(file);

            response.put("url", publicUrl);
            response.put("originalName", sanitizedFilename);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Error uploading file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Check if filename has an allowed extension.
     */
    private boolean hasAllowedExtension(String filename) {
        String lowerFilename = filename.toLowerCase();
        return ALLOWED_EXTENSIONS.stream().anyMatch(lowerFilename::endsWith);
    }
    
    /**
     * Sanitize filename to prevent path traversal and other attacks.
     * Removes path separators and null bytes, keeps only safe characters.
     */
    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return "";
        }
        
        // Remove path separators and null bytes
        String sanitized = filename
                .replace("..", "")
                .replace("/", "")
                .replace("\\", "")
                .replace("\0", "");
        
        // Keep only alphanumeric, dots, hyphens, and underscores
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        // Limit filename length
        if (sanitized.length() > 255) {
            String extension = "";
            int lastDot = sanitized.lastIndexOf('.');
            if (lastDot > 0) {
                extension = sanitized.substring(lastDot);
                sanitized = sanitized.substring(0, Math.min(250 - extension.length(), lastDot)) + extension;
            } else {
                sanitized = sanitized.substring(0, 255);
            }
        }
        
        return sanitized;
    }
}