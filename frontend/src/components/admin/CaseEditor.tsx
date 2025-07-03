import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Delete,
} from "@mui/icons-material";

interface CaseSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface FeedbackSubCriterion {
  id: string;
  name: string;
  order: number;
}

interface FeedbackCriterion {
  id: string;
  name: string;
  order: number;
  hasSubCriteria: boolean;
  subCriteria: FeedbackSubCriterion[];
}

interface CaseData {
  id?: number;
  title: string;
  description: string;
  category: any;
  scenario?: string;
  doctorRole?: string;
  patientRole?: string;
  observerNotes?: string;
  learningObjectives?: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration?: number;
  doctorNotes?: string;
  patientNotes?: string;
  imageUrl?: string;
  sections: CaseSection[];
  feedbackCriteria: FeedbackCriterion[];
}

interface CaseEditorProps {
  open: boolean;
  onClose: () => void;
  caseData?: CaseData | null;
  categories: any[];
  onSave: (caseData: CaseData) => Promise<void>;
}

const CaseEditor: React.FC<CaseEditorProps> = ({
  open,
  onClose,
  caseData,
  categories,
  onSave,
}) => {
  const [formData, setFormData] = useState<CaseData>({
    title: "",
    description: "",
    category: null,
    sections: [],
    feedbackCriteria: [],
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (caseData) {
      setFormData({
        ...caseData,
        sections: caseData.sections || [],
        feedbackCriteria: caseData.feedbackCriteria || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: null,
        sections: [],
        feedbackCriteria: [],
      });
    }
    // Reset error states when opening/closing modal or changing case data
    setImageError(false);
    setUploadError(null);
  }, [caseData, open]);

  const handleBasicFieldChange = (field: keyof CaseData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    const maxSizeInMB = 5; // 5MB limit
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    // Check file size
    if (file.size > maxSizeInBytes) {
      setUploadError(
        `File size too large. Maximum allowed size is ${maxSizeInMB}MB.`
      );
      event.target.value = "";
      return;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      );
      event.target.value = "";
      return;
    }

    // Check image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const maxWidth = 2048;
      const maxHeight = 2048;

      if (img.width > maxWidth || img.height > maxHeight) {
        setUploadError(
          `Image dimensions too large. Maximum allowed size is ${maxWidth}x${maxHeight} pixels.`
        );
        event.target.value = "";
        return;
      }

      // Proceed with upload if all validations pass
      setUploading(true);
      setUploadError(null);

      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:8080/api";

        // Get auth token from localStorage
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/upload/image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        const result = await response.json();

        if (response.ok) {
          handleBasicFieldChange("imageUrl", result.url);
          setImageError(false); // Reset error state on successful upload
        } else {
          setUploadError(result.error || "Error occurred while uploading file");
        }
      } catch (error) {
        setUploadError("Error occurred while uploading file");
        console.error("Upload error:", error);
      } finally {
        setUploading(false);
        // Reset input value so same file can be selected again
        event.target.value = "";
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setUploadError("Invalid image file. Please select a valid image.");
      event.target.value = "";
    };

    img.src = objectUrl;
  };

  const addSection = () => {
    const newSection: CaseSection = {
      id: `section-${Date.now()}`,
      title: "",
      content: "",
      order: formData.sections.length,
    };
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (
    sectionId: string,
    field: keyof CaseSection,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const handleSave = async () => {
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save case:", error);
    }
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    const currentSections = [...formData.sections];
    const currentIndex = currentSections.findIndex(
      (section) => section.id === sectionId
    );

    if (
      (direction === "up" && currentIndex > 0) ||
      (direction === "down" && currentIndex < currentSections.length - 1)
    ) {
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      // Swap sections
      [currentSections[currentIndex], currentSections[targetIndex]] = [
        currentSections[targetIndex],
        currentSections[currentIndex],
      ];

      // Update order values
      currentSections.forEach((section, index) => {
        section.order = index;
      });

      setFormData((prev) => ({
        ...prev,
        sections: currentSections,
      }));
    }
  };

  // Feedback Criteria Management Functions
  const addFeedbackCriterion = () => {
    const newCriterion: FeedbackCriterion = {
      id: `criterion-${Date.now()}`,
      name: "",
      order: formData.feedbackCriteria.length,
      hasSubCriteria: false,
      subCriteria: [],
    };
    setFormData((prev) => ({
      ...prev,
      feedbackCriteria: [...prev.feedbackCriteria, newCriterion],
    }));
  };

  const updateFeedbackCriterion = (
    criterionId: string,
    field: keyof FeedbackCriterion,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      feedbackCriteria: prev.feedbackCriteria.map((criterion) =>
        criterion.id === criterionId
          ? { ...criterion, [field]: value }
          : criterion
      ),
    }));
  };

  const deleteFeedbackCriterion = (criterionId: string) => {
    setFormData((prev) => ({
      ...prev,
      feedbackCriteria: prev.feedbackCriteria.filter(
        (criterion) => criterion.id !== criterionId
      ),
    }));
  };

  const moveFeedbackCriterion = (
    criterionId: string,
    direction: "up" | "down"
  ) => {
    const currentCriteria = [...formData.feedbackCriteria];
    const currentIndex = currentCriteria.findIndex(
      (criterion) => criterion.id === criterionId
    );

    if (
      (direction === "up" && currentIndex > 0) ||
      (direction === "down" && currentIndex < currentCriteria.length - 1)
    ) {
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      // Swap criteria
      [currentCriteria[currentIndex], currentCriteria[targetIndex]] = [
        currentCriteria[targetIndex],
        currentCriteria[currentIndex],
      ];

      // Update order values
      currentCriteria.forEach((criterion, index) => {
        criterion.order = index;
      });

      setFormData((prev) => ({
        ...prev,
        feedbackCriteria: currentCriteria,
      }));
    }
  };

  const addSubCriterion = (criterionId: string) => {
    const criterion = formData.feedbackCriteria.find(
      (c) => c.id === criterionId
    );
    if (!criterion) return;

    const newSubCriterion: FeedbackSubCriterion = {
      id: `sub-${Date.now()}`,
      name: "",
      order: criterion.subCriteria.length,
    };

    updateFeedbackCriterion(criterionId, "subCriteria", [
      ...criterion.subCriteria,
      newSubCriterion,
    ]);
  };

  const updateSubCriterion = (
    criterionId: string,
    subCriterionId: string,
    field: keyof FeedbackSubCriterion,
    value: any
  ) => {
    const criterion = formData.feedbackCriteria.find(
      (c) => c.id === criterionId
    );
    if (!criterion) return;

    const updatedSubCriteria = criterion.subCriteria.map((sub) =>
      sub.id === subCriterionId ? { ...sub, [field]: value } : sub
    );

    updateFeedbackCriterion(criterionId, "subCriteria", updatedSubCriteria);
  };

  const deleteSubCriterion = (criterionId: string, subCriterionId: string) => {
    const criterion = formData.feedbackCriteria.find(
      (c) => c.id === criterionId
    );
    if (!criterion) return;

    const updatedSubCriteria = criterion.subCriteria.filter(
      (sub) => sub.id !== subCriterionId
    );

    updateFeedbackCriterion(criterionId, "subCriteria", updatedSubCriteria);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ "& .MuiDialog-paper": { height: "90vh" } }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {caseData?.id ? "Edit Case" : "Add New Case"}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save Case
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ overflow: "auto", p: 3 }}>
        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Case Title"
                value={formData.title}
                onChange={(e) =>
                  handleBasicFieldChange("title", e.target.value)
                }
                required
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  handleBasicFieldChange("description", e.target.value)
                }
              />

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category?.id || ""}
                  onChange={(e) => {
                    const selectedCategory = categories.find(
                      (cat) => cat.id === e.target.value
                    );
                    handleBasicFieldChange("category", selectedCategory);
                  }}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Image Upload Section */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Patient Image
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={1}
                >
                  Visual representation of patient's symptoms or body region to
                  show during consultation
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={2}
                  sx={{
                    fontSize: "0.7rem",
                    fontStyle: "italic",
                    backgroundColor: "#f5f5f5",
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  • Maximum file size: 5MB
                  <br />
                  • Allowed formats: JPEG, PNG, GIF, WebP
                  <br />• Maximum dimensions: 2048x2048 pixels
                </Typography>

                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    disabled={uploading}
                    sx={{ minWidth: 140 }}
                  >
                    {uploading ? "Loading..." : "Upload Image"}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </Button>

                  {formData.imageUrl && (
                    <>
                      <Chip
                        icon={<ImageIcon />}
                        label="Image Uploaded"
                        color="success"
                        variant="outlined"
                      />
                      <Button
                        size="small"
                        startIcon={<Delete />}
                        onClick={() => {
                          handleBasicFieldChange("imageUrl", "");
                          setImageError(false);
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </Box>

                {uploadError && (
                  <Typography
                    color="error"
                    variant="caption"
                    display="block"
                    mt={1}
                  >
                    {uploadError}
                  </Typography>
                )}

                {formData.imageUrl && (
                  <Box mt={2}>
                    {!imageError ? (
                      <img
                        src={
                          formData.imageUrl?.startsWith("http")
                            ? formData.imageUrl
                            : `${
                                import.meta.env.VITE_API_URL ||
                                "http://localhost:8080/api"
                              }${formData.imageUrl}`
                        }
                        alt="Uploaded Image"
                        style={{
                          maxWidth: "200px",
                          maxHeight: "150px",
                          objectFit: "contain",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                        onError={() => {
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "200px",
                          height: "150px",
                          backgroundColor: "#f5f5f5",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 32, color: "#999" }} />
                        <Typography variant="caption" color="text.secondary">
                          Image preview failed
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Modular Sections */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Content Sections</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSection}
              >
                Add Section
              </Button>
            </Box>

            {formData.sections.length === 0 ? (
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  borderRadius: 1,
                  p: 4,
                  textAlign: "center",
                  bgcolor: "#f9f9f9",
                }}
              >
                <Typography color="textSecondary" variant="body1">
                  No sections added yet. Click "Add Section" to start building
                  your case content.
                </Typography>
              </Box>
            ) : (
              formData.sections.map((section, index) => (
                <Card
                  key={section.id}
                  variant="outlined"
                  sx={{ mb: 2, border: "1px solid #e0e0e0" }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <DragIcon sx={{ color: "#888", cursor: "grab" }} />
                      <Typography variant="subtitle2" sx={{ mr: "auto" }}>
                        Section {index + 1}
                      </Typography>

                      <Button
                        size="small"
                        onClick={() => moveSection(section.id, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="small"
                        onClick={() => moveSection(section.id, "down")}
                        disabled={index === formData.sections.length - 1}
                      >
                        ↓
                      </Button>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteSection(section.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <TextField
                      fullWidth
                      label="Section Title"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(section.id, "title", e.target.value)
                      }
                      placeholder="e.g., Doctor Information, Patient Background, etc."
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Section Content"
                      value={section.content}
                      onChange={(e) =>
                        updateSection(section.id, "content", e.target.value)
                      }
                      placeholder="Enter the content for this section..."
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Feedback Criteria */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Feedback Criteria</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addFeedbackCriterion}
              >
                Add Criterion
              </Button>
            </Box>

            {/* Overall Performance Info */}
            <Box
              sx={{
                bgcolor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                p: 2,
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Overall Performance
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This will be automatically calculated as the average of all
                defined criteria. If a criterion has sub-criteria, its score
                will be the average of its sub-criteria.
              </Typography>
            </Box>

            {/* Additional Comment Info */}
            <Box
              sx={{
                bgcolor: "#e3f2fd",
                border: "1px solid #bbdefb",
                borderRadius: 1,
                p: 2,
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Additional Comment
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This field will be automatically included in all feedback forms
                for this case.
              </Typography>
            </Box>

            {formData.feedbackCriteria.length === 0 ? (
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  borderRadius: 1,
                  p: 4,
                  textAlign: "center",
                  bgcolor: "#f9f9f9",
                }}
              >
                <Typography color="textSecondary" variant="body1">
                  No feedback criteria defined yet. Click "Add Criterion" to
                  start creating your custom feedback structure.
                </Typography>
              </Box>
            ) : (
              formData.feedbackCriteria.map((criterion, index) => (
                <Card
                  key={criterion.id}
                  variant="outlined"
                  sx={{ mb: 2, border: "1px solid #e0e0e0" }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <DragIcon sx={{ color: "#888", cursor: "grab" }} />
                      <Typography variant="subtitle2" sx={{ mr: "auto" }}>
                        Criterion {index + 1}
                      </Typography>

                      <Button
                        size="small"
                        onClick={() =>
                          moveFeedbackCriterion(criterion.id, "up")
                        }
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          moveFeedbackCriterion(criterion.id, "down")
                        }
                        disabled={
                          index === formData.feedbackCriteria.length - 1
                        }
                      >
                        ↓
                      </Button>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteFeedbackCriterion(criterion.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <TextField
                      fullWidth
                      label="Criterion Name"
                      value={criterion.name}
                      onChange={(e) =>
                        updateFeedbackCriterion(
                          criterion.id,
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Communication Skills, Clinical Knowledge, etc."
                      sx={{ mb: 2 }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={criterion.hasSubCriteria}
                          onChange={(e) => {
                            updateFeedbackCriterion(
                              criterion.id,
                              "hasSubCriteria",
                              e.target.checked
                            );
                            if (!e.target.checked) {
                              updateFeedbackCriterion(
                                criterion.id,
                                "subCriteria",
                                []
                              );
                            }
                          }}
                        />
                      }
                      label="Has Sub-Criteria"
                      sx={{ mb: 2 }}
                    />

                    {criterion.hasSubCriteria && (
                      <Box
                        sx={{
                          ml: 2,
                          border: "1px solid #f0f0f0",
                          borderRadius: 1,
                          p: 2,
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={2}
                        >
                          <Typography variant="subtitle2">
                            Sub-Criteria
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => addSubCriterion(criterion.id)}
                          >
                            Add Sub-Criterion
                          </Button>
                        </Box>

                        {criterion.subCriteria.length === 0 ? (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ textAlign: "center", py: 2 }}
                          >
                            No sub-criteria defined. Add one to get started.
                          </Typography>
                        ) : (
                          criterion.subCriteria.map(
                            (subCriterion, subIndex) => (
                              <Box
                                key={subCriterion.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                  p: 1,
                                  border: "1px solid #e8e8e8",
                                  borderRadius: 1,
                                  bgcolor: "#fafafa",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ minWidth: "60px" }}
                                >
                                  Sub {subIndex + 1}:
                                </Typography>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Sub-criterion name"
                                  value={subCriterion.name}
                                  onChange={(e) =>
                                    updateSubCriterion(
                                      criterion.id,
                                      subCriterion.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                />
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    deleteSubCriterion(
                                      criterion.id,
                                      subCriterion.id
                                    )
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )
                          )
                        )}

                        {criterion.subCriteria.length > 0 && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 1,
                              bgcolor: "#fff3e0",
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="caption" color="textSecondary">
                              💡 This criterion's score will be calculated as
                              the average of its sub-criteria.
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {!criterion.hasSubCriteria && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 1,
                          bgcolor: "#e8f5e8",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          ⭐ This criterion will have a direct 1-5 rating scale.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save Case
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseEditor;
