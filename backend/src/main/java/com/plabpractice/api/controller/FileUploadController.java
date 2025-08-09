package com.plabpractice.api.controller;

import com.plabpractice.api.service.SupabaseStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
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

    public FileUploadController(SupabaseStorageService supabaseStorageService) {
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("error", "Dosya boş olamaz");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("error", "Sadece resim dosyaları yüklenebilir");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file size (max 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                response.put("error", "Dosya boyutu 5MB'dan büyük olamaz");
                return ResponseEntity.badRequest().body(response);
            }

            // Upload to Supabase and return the public/signed URL
            String publicUrl = supabaseStorageService.uploadImageAndGetUrl(file);

            String originalFilename = file.getOriginalFilename();
            response.put("url", publicUrl);
            if (originalFilename != null) {
                response.put("originalName", originalFilename);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Dosya yüklenirken hata oluştu: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}