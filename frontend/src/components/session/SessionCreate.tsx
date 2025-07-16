import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  SelectChangeEvent,
  Chip,
  CircularProgress,
} from "@mui/material";
import { createSession } from "../../services/api";

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Case {
  id: number;
  title: string;
  description: string;
  category: Category;
  duration: number;
}

const SessionCreate: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | "">("");
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/api/sessions/categories"
        );
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setError("Failed to load categories");
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryChange = async (event: SelectChangeEvent<number>) => {
    const categoryId = event.target.value as number;
    setSelectedCategoryId(categoryId);
    setSelectedCaseId(""); // Reset case selection

    if (categoryId) {
      try {
        const response = await fetch(
          `http://localhost:8080/api/sessions/categories/${categoryId}/cases`
        );
        const data = await response.json();
        setCases(data);
      } catch (error) {
        console.error("Failed to fetch cases:", error);
        setError("Failed to load cases");
      }
    } else {
      setCases([]);
    }
  };

  const handleSubmit = async () => {
    if (!sessionTitle.trim()) {
      setError("Please enter a session title");
      return;
    }

    if (!selectedCaseId) {
      setError("Please select a case");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createSession({
        title: sessionTitle,
        sessionType: "CASE",
        readingTime: 5,
        consultationTime: 15,
        timingType: "COUNTDOWN",
        selectedTopics: selectedCase?.category
          ? [selectedCase.category.name]
          : [],
      });

      if (response.data.sessionCode) {
        navigate(`/session/${response.data.sessionCode}/select-role`, {
          state: { caseId: selectedCaseId, sessionTitle },
        });
      } else {
        setError("Failed to create session");
      }
    } catch (error: any) {
      console.error("Failed to create session:", error);
      setError(error.response?.data?.error || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New PLAB 2 Practice Session
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Select a clinical scenario to practice with your colleagues
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Session Title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Enter a title for your session"
                variant="outlined"
                helperText="Give your session a descriptive name"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Medical Category</InputLabel>
                <Select
                  value={selectedCategoryId}
                  onChange={handleCategoryChange}
                  label="Medical Category"
                >
                  <MenuItem value="">
                    <em>Select a category</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedCategory && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {selectedCategory.description}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth disabled={!selectedCategoryId}>
                <InputLabel>Clinical Case</InputLabel>
                <Select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value as number)}
                  label="Clinical Case"
                >
                  <MenuItem value="">
                    <em>Select a case</em>
                  </MenuItem>
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem.id} value={caseItem.id}>
                      <Box>
                        <Typography variant="body1">
                          {caseItem.title}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          <Chip
                            label={`${caseItem.duration} min`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedCase && (
              <Card
                variant="outlined"
                sx={{ mb: 3, p: 2, backgroundColor: "grey.50" }}
              >
                <Typography variant="h6" gutterBottom>
                  Case Preview: {selectedCase.title}
                </Typography>
                <Typography variant="body2" paragraph>
                  {selectedCase.description}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip
                    label={`Duration: ${selectedCase.duration} minutes`}
                    variant="outlined"
                  />
                </Box>
              </Card>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!sessionTitle.trim() || !selectedCaseId || loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? "Creating..." : "Create Session"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SessionCreate;
