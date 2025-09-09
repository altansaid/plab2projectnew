import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../services/api";
import { Helmet } from "react-helmet-async";

const SessionJoin: React.FC = () => {
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/sessions/join", { code: sessionCode });
      navigate(`/session/${sessionCode}/role`);
    } catch (error) {
      setError("Invalid session code or session is full");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <Helmet>
        <title>Join Session – PLAB 2 Practice</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://plab2practice.com/session/join" />
      </Helmet>
      <Box className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        <Typography variant="h4" component="h1" gutterBottom>
          Join Session
        </Typography>

        <Card
          sx={{
            mt: 3,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            backgroundColor: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
          }}
        >
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="sessionCode"
                label="Session Code"
                name="sessionCode"
                autoFocus
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                error={!!error}
                helperText={error}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "& fieldset": { borderColor: "#93c5fd" },
                    "&:hover fieldset": { borderColor: "#6366f1" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#3b82f6",
                      borderWidth: 2,
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!sessionCode.trim()}
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#fff",
                    background:
                      "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                    boxShadow: "0 10px 20px rgba(59,130,246,0.25)",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 14px 24px rgba(59,130,246,0.3)",
                      background:
                        "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
                    },
                  }}
                >
                  Join Session
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </div>
  );
};

export default SessionJoin;
