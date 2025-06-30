import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
} from "@mui/material";
import { Add, Login, Group } from "@mui/icons-material";
import { RootState } from "../../store";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  const handleStartSession = () => {
    if (isAuthenticated) {
      navigate("/session/create");
    } else {
      // Store the intended destination and redirect to login
      sessionStorage.setItem("redirectAfterLogin", "/session/create");
      navigate("/login");
    }
  };

  const handleJoinSession = () => {
    if (isAuthenticated) {
      navigate("/session/join");
    } else {
      // Store the intended destination and redirect to login
      sessionStorage.setItem("redirectAfterLogin", "/session/join");
      navigate("/login");
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom color="primary">
          PLAB 2 Practice Platform
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Collaborative clinical skills practice for medical professionals
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          Practice clinical scenarios with colleagues in real-time sessions.
          Take on roles as Doctor, Patient, or Observer and improve your PLAB 2
          exam preparation.
        </Typography>
      </Box>

      {isAuthenticated && user && (
        <Box textAlign="center" mb={4}>
          <Typography variant="h6" gutterBottom>
            Welcome back, {user.name}!
          </Typography>
          <Button
            variant="outlined"
            onClick={handleGoToDashboard}
            sx={{ mb: 3 }}
          >
            Go to Dashboard
          </Button>
        </Box>
      )}

      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={6} lg={4}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: "center", p: 4 }}>
              <Add sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Start New Session
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create a new practice session and invite colleagues to join.
                Choose from various clinical scenarios and assign roles.
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleStartSession}
                sx={{ mt: 2 }}
              >
                Start Session
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: "center", p: 4 }}>
              <Group sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Join Session
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Join an existing practice session using a session code.
                Participate as Doctor, Patient, or Observer.
              </Typography>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={handleJoinSession}
                sx={{ mt: 2 }}
              >
                Join Session
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isAuthenticated && (
        <Box textAlign="center" mt={6}>
          <Typography variant="body2" color="text.secondary" paragraph>
            New to PLAB 2 Practice? Create an account to get started.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="text"
              startIcon={<Login />}
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button variant="text" onClick={() => navigate("/register")}>
              Sign Up
            </Button>
          </Stack>
        </Box>
      )}
    </Container>
  );
};

export default HomePage;
