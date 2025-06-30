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

const SessionJoin: React.FC = () => {
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/sessions/join", { code: sessionCode });
      navigate(`/session/${sessionCode}/select-role`);
    } catch (error) {
      setError("Invalid session code or session is full");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Join Session
        </Typography>

        <Card sx={{ mt: 3 }}>
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
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!sessionCode.trim()}
                >
                  Join Session
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SessionJoin;
