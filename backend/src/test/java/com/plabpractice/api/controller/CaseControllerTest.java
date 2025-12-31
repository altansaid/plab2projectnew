package com.plabpractice.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CaseRepository caseRepository;

    @MockBean
    private CategoryRepository categoryRepository;

    @MockBean
    private SessionRepository sessionRepository;

    private Category testCategory;
    private Case testCase;

    @BeforeEach
    void setUp() {
        testCategory = new Category();
        testCategory.setId(1L);
        testCategory.setName("Cardiology");

        testCase = new Case();
        testCase.setId(1L);
        testCase.setTitle("Test Case");
        testCase.setDescription("Test Description");
        testCase.setCategory(testCategory);
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getAllCases_Success() throws Exception {
        // Arrange
        when(caseRepository.findAll()).thenReturn(Arrays.asList(testCase));

        // Act & Assert
        mockMvc.perform(get("/api/cases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Test Case"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getCaseById_Success() throws Exception {
        // Arrange
        when(caseRepository.findById(1L)).thenReturn(Optional.of(testCase));

        // Act & Assert
        mockMvc.perform(get("/api/cases/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Case"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getCaseById_NotFound() throws Exception {
        // Arrange
        when(caseRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/api/cases/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void createCase_Success() throws Exception {
        // Arrange
        Case newCase = new Case();
        newCase.setTitle("New Case");
        newCase.setDescription("New Description");
        newCase.setCategory(testCategory);

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(caseRepository.save(any(Case.class))).thenAnswer(invocation -> {
            Case c = invocation.getArgument(0);
            c.setId(2L);
            return c;
        });

        // Act & Assert
        mockMvc.perform(post("/api/cases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCase)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Case"));
    }

    @Test
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void createCase_Forbidden_NonAdmin() throws Exception {
        // Arrange
        Case newCase = new Case();
        newCase.setTitle("New Case");
        newCase.setDescription("New Description");
        newCase.setCategory(testCategory);

        // Act & Assert - Regular users cannot create cases
        mockMvc.perform(post("/api/cases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCase)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void updateCase_Success() throws Exception {
        // Arrange
        Case updatedCase = new Case();
        updatedCase.setTitle("Updated Case");
        updatedCase.setDescription("Updated Description");
        updatedCase.setCategory(testCategory);

        when(caseRepository.findById(1L)).thenReturn(Optional.of(testCase));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(caseRepository.save(any(Case.class))).thenReturn(testCase);

        // Act & Assert
        mockMvc.perform(put("/api/cases/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedCase)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void deleteCase_Success() throws Exception {
        // Arrange
        when(caseRepository.findById(1L)).thenReturn(Optional.of(testCase));
        when(sessionRepository.findBySelectedCaseId(1L)).thenReturn(List.of());
        doNothing().when(caseRepository).delete(any(Case.class));

        // Act & Assert
        mockMvc.perform(delete("/api/cases/1"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void deleteCase_Forbidden_NonAdmin() throws Exception {
        // Act & Assert - Regular users cannot delete cases
        mockMvc.perform(delete("/api/cases/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getCasesByCategory_Success() throws Exception {
        // Arrange
        when(caseRepository.findByCategoryId(1L)).thenReturn(Arrays.asList(testCase));

        // Act & Assert
        mockMvc.perform(get("/api/cases/by-category/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Test Case"));
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = {"USER"})
    void getRandomCase_Success() throws Exception {
        // Arrange
        when(caseRepository.findAll()).thenReturn(Arrays.asList(testCase));

        // Act & Assert
        mockMvc.perform(get("/api/cases/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Case"));
    }
}

