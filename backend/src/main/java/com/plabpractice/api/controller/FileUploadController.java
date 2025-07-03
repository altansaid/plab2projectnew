package com.plabpractice.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://plab2projectnew.vercel.app"
})
public class FileUploadController {

    private final String UPLOAD_DIR = "uploads/images/";

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

            // Create upload directory if not exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(uniqueFilename);

            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Return file URL (without /api prefix since frontend will add it)
            String fileUrl = "/uploads/images/" + uniqueFilename;
            response.put("url", fileUrl);
            response.put("filename", uniqueFilename);
            response.put("originalName", originalFilename);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("error", "Dosya yüklenirken hata oluştu: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}