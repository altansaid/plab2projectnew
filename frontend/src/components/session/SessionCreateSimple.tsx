import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { createSession } from "../../services/api";
import { Helmet } from "react-helmet-async";

const SessionCreateSimple: React.FC = () => {
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sessionTitle.trim()) {
      setError("Please enter a session title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create session using the real API
      const response = await createSession({
        title: sessionTitle,
        sessionType: "TOPIC",
        readingTime: 2,
        consultationTime: 8,
        timingType: "COUNTDOWN",
        selectedTopics: ["Random"],
      });

      if (response.data.sessionCode) {
        // Navigate directly to configuration since host is automatically the doctor
        navigate(`/session/${response.data.sessionCode}/configure`, {
          state: {
            sessionTitle,
            role: "doctor", // Host is always the doctor
            isHost: true,
          },
        });
      } else {
        setError("Failed to create session");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create session";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Helmet>
        <title>Create Session – PLAB 2 Practice</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://plab2practice.com/session/create" />
      </Helmet>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New PLAB 2 Practice Session
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Enter a title for your practice session
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
                autoFocus
              />
            </Box>

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
                disabled={!sessionTitle.trim() || loading}
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

export default SessionCreateSimple;
