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
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { api } from "../../services/api";

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

interface CaseVisualData {
  type: "image" | "text";
  content: string; // URL for image, text content for text type
}

interface CaseData {
  id?: number;
  title: string;
  description: string;
  category: any;
  // Doctor role specific content
  doctorSections: CaseSection[];
  // Patient/Observer role specific content
  patientSections: CaseSection[];
  // Common fields
  doctorNotes?: string;
  patientNotes?: string;
  visualData?: CaseVisualData;
  feedbackCriteria: FeedbackCriterion[];
  imageUrl?: string; // Backward compatibility
  isRecallCase?: boolean;
  recallDates?: string[];
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
    doctorSections: [],
    patientSections: [],
    visualData: { type: "image", content: "" },
    feedbackCriteria: [],
    isRecallCase: false,
    recallDates: [],
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (caseData) {
      // Handle backward compatibility with cases that might only have imageUrl
      let visualData = caseData.visualData;
      if (!visualData && caseData.imageUrl) {
        // Convert old imageUrl to new visualData format
        visualData = { type: "image", content: caseData.imageUrl };
      } else if (!visualData) {
        // Default to empty image type
        visualData = { type: "image", content: "" };
      }

      setFormData({
        ...caseData,
        doctorSections: caseData.doctorSections || [],
        patientSections: caseData.patientSections || [],
        feedbackCriteria: caseData.feedbackCriteria || [],
        visualData: visualData,
        isRecallCase: caseData.isRecallCase || false,
        recallDates: caseData.recallDates || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: null,
        doctorSections: [],
        patientSections: [],
        visualData: { type: "image", content: "" },
        feedbackCriteria: [],
        isRecallCase: false,
        recallDates: [],
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
          handleBasicFieldChange("visualData", {
            type: "image",
            content: result.url,
          });
          setImageError(false); // Reset error state on successful upload
        } else {
          setUploadError(result.error || "Error occurred while uploading file");
        }
      } catch (error) {
        setUploadError("Error occurred while uploading file");
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

  const addSection = (type: "doctor" | "patient") => {
    const newSection: CaseSection = {
      id: `section-${Date.now()}`,
      title: "",
      content: "",
      order:
        type === "doctor"
          ? formData.doctorSections.length
          : formData.patientSections.length,
    };
    setFormData((prev) => ({
      ...prev,
      [type === "doctor" ? "doctorSections" : "patientSections"]: [
        ...(type === "doctor" ? prev.doctorSections : prev.patientSections),
        newSection,
      ],
    }));
  };

  const updateSection = (
    type: "doctor" | "patient",
    sectionId: string,
    field: keyof CaseSection,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [type === "doctor" ? "doctorSections" : "patientSections"]: (type ===
      "doctor"
        ? prev.doctorSections
        : prev.patientSections
      ).map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      ),
    }));
  };

  const deleteSection = (type: "doctor" | "patient", sectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      [type === "doctor" ? "doctorSections" : "patientSections"]: (type ===
      "doctor"
        ? prev.doctorSections
        : prev.patientSections
      ).filter((section) => section.id !== sectionId),
    }));
  };

  const moveSection = (
    type: "doctor" | "patient",
    sectionId: string,
    direction: "up" | "down"
  ) => {
    const sections =
      type === "doctor" ? formData.doctorSections : formData.patientSections;
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);
    if (
      (direction === "up" && sectionIndex === 0) ||
      (direction === "down" && sectionIndex === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex =
      direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    [newSections[sectionIndex], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[sectionIndex],
    ];

    // Update order values
    newSections.forEach((section, index) => {
      section.order = index;
    });

    setFormData((prev) => ({
      ...prev,
      [type === "doctor" ? "doctorSections" : "patientSections"]: newSections,
    }));
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

  const handleSave = async () => {
    try {
      await onSave(formData);
      onClose();
    } catch (error) {}
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 20px rgba(2,6,23,0.08)",
        },
      }}
    >
      <DialogTitle>{caseData ? "Edit Case" : "Create New Case"}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Basic Information */}
          <Card sx={{ mb: 4 }}>
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

                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category?.id || ""}
                    onChange={(e) =>
                      handleBasicFieldChange(
                        "category",
                        categories.find((c) => c.id === e.target.value)
                      )
                    }
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Recall Settings */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recall Settings
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isRecallCase || false}
                      onChange={(e) =>
                        handleBasicFieldChange("isRecallCase", e.target.checked)
                      }
                    />
                  }
                  label="Mark this case for recall practice"
                />

                {formData.isRecallCase && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recall Dates
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Select the dates when this case should be available for
                      recall practice. You can add multiple dates.
                    </Typography>

                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <TextField
                        type="date"
                        label="Add Recall Date"
                        InputLabelProps={{ shrink: true }}
                        onChange={(e) => {
                          const date = e.target.value;
                          if (date && !formData.recallDates?.includes(date)) {
                            handleBasicFieldChange("recallDates", [
                              ...(formData.recallDates || []),
                              date,
                            ]);
                          }
                        }}
                        value=""
                      />
                      <Button
                        variant="outlined"
                        startIcon={<CalendarIcon />}
                        onClick={() => {
                          // This could be enhanced with a date picker library
                        }}
                      >
                        Add Date
                      </Button>
                    </Box>

                    {formData.recallDates &&
                      formData.recallDates.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Selected Dates:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {formData.recallDates.map((date, index) => {
                              // Format date without timezone issues
                              const formatDateLocal = (dateStr: string) => {
                                const [year, month, day] = dateStr.split("-");
                                return new Date(
                                  parseInt(year),
                                  parseInt(month) - 1,
                                  parseInt(day)
                                ).toLocaleDateString();
                              };

                              return (
                                <Chip
                                  key={index}
                                  label={formatDateLocal(date)}
                                  onDelete={() => {
                                    const updatedDates =
                                      formData.recallDates?.filter(
                                        (d) => d !== date
                                      );
                                    handleBasicFieldChange(
                                      "recallDates",
                                      updatedDates
                                    );
                                  }}
                                  deleteIcon={<DeleteIcon />}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Doctor's View */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Doctor's View
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Doctor's Sections
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addSection("doctor")}
                >
                  Add Doctor Section
                </Button>
                {formData.doctorSections.map((section, index) => (
                  <Card
                    key={section.id}
                    variant="outlined"
                    sx={{ mb: 2, border: "1px solid #e0e0e0" }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <DragIcon sx={{ color: "#888", cursor: "grab" }} />
                        <Typography variant="subtitle2" sx={{ mr: "auto" }}>
                          Doctor Section {index + 1}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() =>
                            moveSection("doctor", section.id, "up")
                          }
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="small"
                          onClick={() =>
                            moveSection("doctor", section.id, "down")
                          }
                          disabled={
                            index === formData.doctorSections.length - 1
                          }
                        >
                          ↓
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteSection("doctor", section.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        fullWidth
                        label="Section Title"
                        value={section.title}
                        onChange={(e) =>
                          updateSection(
                            "doctor",
                            section.id,
                            "title",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Medical History, Examination Notes, etc."
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Section Content"
                        value={section.content}
                        onChange={(e) =>
                          updateSection(
                            "doctor",
                            section.id,
                            "content",
                            e.target.value
                          )
                        }
                        placeholder="Enter the content for this section..."
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Patient/Observer's View */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient/Observer's View
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Patient's Sections
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addSection("patient")}
                >
                  Add Patient Section
                </Button>
                {formData.patientSections.map((section, index) => (
                  <Card
                    key={section.id}
                    variant="outlined"
                    sx={{ mb: 2, border: "1px solid #e0e0e0" }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <DragIcon sx={{ color: "#888", cursor: "grab" }} />
                        <Typography variant="subtitle2" sx={{ mr: "auto" }}>
                          Patient Section {index + 1}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() =>
                            moveSection("patient", section.id, "up")
                          }
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="small"
                          onClick={() =>
                            moveSection("patient", section.id, "down")
                          }
                          disabled={
                            index === formData.patientSections.length - 1
                          }
                        >
                          ↓
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteSection("patient", section.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        fullWidth
                        label="Section Title"
                        value={section.title}
                        onChange={(e) =>
                          updateSection(
                            "patient",
                            section.id,
                            "title",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Symptoms, Medical History, etc."
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Section Content"
                        value={section.content}
                        onChange={(e) =>
                          updateSection(
                            "patient",
                            section.id,
                            "content",
                            e.target.value
                          )
                        }
                        placeholder="Enter the content for this section..."
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Visual Information Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Visual Information
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={1}
            >
              Add visual information or text details about the patient's
              condition
            </Typography>

            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <Box display="flex" gap={2}>
                <Button
                  variant={
                    formData.visualData?.type === "image"
                      ? "contained"
                      : "outlined"
                  }
                  onClick={() =>
                    handleBasicFieldChange("visualData", {
                      type: "image",
                      content:
                        formData.visualData?.type === "image"
                          ? formData.visualData.content
                          : "",
                    })
                  }
                >
                  Image
                </Button>
                <Button
                  variant={
                    formData.visualData?.type === "text"
                      ? "contained"
                      : "outlined"
                  }
                  onClick={() =>
                    handleBasicFieldChange("visualData", {
                      type: "text",
                      content:
                        formData.visualData?.type === "text"
                          ? formData.visualData.content
                          : "",
                    })
                  }
                >
                  Text
                </Button>
              </Box>
            </FormControl>

            {formData.visualData?.type === "image" ? (
              <>
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

                  {formData.visualData?.content && (
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
                          handleBasicFieldChange("visualData", {
                            type: "image",
                            content: "",
                          });
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

                {formData.visualData?.content && (
                  <Box mt={2}>
                    {!imageError ? (
                      <img
                        src={
                          formData.visualData.content.startsWith("http")
                            ? formData.visualData.content
                            : `${
                                import.meta.env.VITE_API_URL ||
                                "http://localhost:8080/api"
                              }${formData.visualData.content}`
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
              </>
            ) : (
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Text Information"
                value={formData.visualData?.content || ""}
                onChange={(e) =>
                  handleBasicFieldChange("visualData", {
                    type: "text",
                    content: e.target.value,
                  })
                }
                placeholder="Enter additional information about the patient's condition..."
              />
            )}
          </Box>

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
                  This field will be automatically included in all feedback
                  forms for this case.
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
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
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
                            ⭐ This criterion will have a direct 0-4 rating
                            scale.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Save Case
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseEditor;
