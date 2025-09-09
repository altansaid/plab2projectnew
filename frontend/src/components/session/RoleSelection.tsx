import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  IconButton,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Person as DoctorIcon,
  PersonOutline as PatientIcon,
  Visibility as ObserverIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { RootState } from "../../store";
import { SessionRole } from "../../features/session/sessionSlice";
import { api } from "../../services/api";
import { Helmet } from "react-helmet-async";

interface RoleOption {
  id: SessionRole;
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  color: string;
}

interface SessionParticipant {
  userId: string;
  username: string;
  role: SessionRole;
}

interface SessionInfo {
  id: string;
  sessionCode: string;
  title: string;
  participants: SessionParticipant[];
  status: string;
}

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedRole, setSelectedRole] = useState<SessionRole | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const roleOptions: RoleOption[] = [
    // Doctor role removed - only host can be doctor, and they skip this screen
    // {
    //   id: "doctor",
    //   title: "Doctor",
    //   icon: <DoctorIcon sx={{ fontSize: 48, color: "#1976d2" }} />,
    //   description:
    //     "Lead the consultation, control session flow, and provide feedback",
    //   features: [
    //     "See doctor notes only",
    //     "Control session timing",
    //     "Manage case progression",
    //     "Lead feedback discussions",
    //   ],
    //   color: "#1976d2",
    // },
    {
      id: "patient",
      title: "Patient",
      icon: <PatientIcon sx={{ fontSize: 48, color: "#2e7d32" }} />,
      description:
        "Role-play as the patient, follow your character brief, and engage naturally",
      features: [
        "See patient notes only",
        "View consultation timer",
        "Follow character guidelines",
        "Participate in feedback",
      ],
      color: "#2e7d32",
    },
    {
      id: "observer",
      title: "Observer",
      icon: <ObserverIcon sx={{ fontSize: 48, color: "#7b1fa2" }} />,
      description:
        "Watch the consultation, learn from both perspectives, and contribute to feedback",
      features: [
        "See both sets of notes",
        "View full timer display",
        "Observe consultation flow",
        "Provide external feedback",
      ],
      color: "#7b1fa2",
    },
  ];

  // Fetch session information and participants
  useEffect(() => {
    const fetchSessionInfo = async () => {
      if (!sessionCode) {
        setError("Invalid session code");
        setLoading(false);
        return;
      }

      try {
        // Get session information from backend
        const response = await api.get(`/sessions/${sessionCode}`);

        setSessionInfo({
          id: response.data.id,
          sessionCode: response.data.code,
          title: response.data.title || "PLAB 2 Practice Session",
          participants: response.data.participants || [],
          status: response.data.status || "waiting",
        });
      } catch (error: any) {
        setError("Failed to load session information");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionInfo();

    // Set up real-time updates for participant changes
    const fetchParticipants = () => fetchSessionInfo();
    const interval = setInterval(fetchParticipants, 2000); // Poll every 2 seconds for updates

    return () => clearInterval(interval);
  }, [sessionCode]);

  const handleCopySessionCode = () => {
    if (sessionInfo?.sessionCode) {
      navigator.clipboard.writeText(sessionInfo.sessionCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleRoleSelect = (role: SessionRole) => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!selectedRole || !sessionInfo || !user) {
      return;
    }

    try {
      // Join session with the selected role
      const response = await api.post(
        `/sessions/${sessionInfo.sessionCode}/join-with-role`,
        {
          role: selectedRole,
        }
      );

      const { isHost } = response.data;

      // Route based on whether user is HOST or not
      if (isHost) {
        // HOST goes to configure session
        navigate(`/session/${sessionInfo.sessionCode}/configure`, {
          state: {
            role: selectedRole,
            isHost: true,
            ...location.state,
          },
        });
      } else {
        // Non-HOST participants go directly to session room in waiting state
        navigate(`/session/${sessionInfo.sessionCode}/room`, {
          state: {
            role: selectedRole,
            isHost: false,
            ...location.state,
          },
        });
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to join session with selected role";
      setError(errorMessage);
    }
  };

  // Get taken roles - properly handle role formats
  const takenRoles =
    sessionInfo?.participants
      .map((p) => String(p.role).toLowerCase())
      .filter(Boolean) || [];

  // Check if a role is available
  const isRoleAvailable = (role: SessionRole) => {
    if (role === "observer") {
      return true; // Multiple observers allowed
    }
    return !takenRoles.includes(role.toLowerCase());
  };

  // Get role counts for status display
  const getRoleCount = (role: SessionRole) => {
    return (
      sessionInfo?.participants.filter(
        (p) => String(p.role).toLowerCase() === role.toLowerCase()
      ).length || 0
    );
  };

  const getRoleStatus = (role: SessionRole) => {
    const count = getRoleCount(role);
    if (role === "observer") {
      return count.toString();
    }
    return count > 0 ? "Selected" : "Available";
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !sessionInfo) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error || "Session not found"}</Alert>
          <Button
            variant="outlined"
            onClick={() => navigate("/")}
            sx={{ mt: 2 }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <Helmet>
        <title>Select Role – PLAB 2 Practice</title>
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="canonical"
          href={`https://plab2practice.com/session/${sessionCode || ""}/role`}
        />
      </Helmet>
      <Box
        className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
        sx={{ py: 0 }}
      >
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Join Session - Select Your Role
          </Typography>

          {/* Session Code */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ mr: 1 }}>
              Session Code:
            </Typography>
            <Chip
              label={sessionInfo.sessionCode}
              sx={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                px: 1,
              }}
            />
            <IconButton
              onClick={handleCopySessionCode}
              size="small"
              sx={{ ml: 1 }}
            >
              <CopyIcon />
            </IconButton>
          </Box>

          {copySuccess && (
            <Typography variant="body2" color="success.main">
              Session code copied to clipboard!
            </Typography>
          )}

          <Typography variant="body1" color="text.secondary">
            The session host is the Doctor. Choose your role from the available
            options below.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Role Cards */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            mb: 4,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {roleOptions.map((role) => {
            const isDisabled = !isRoleAvailable(role.id);
            const isSelected = selectedRole === role.id;

            return (
              <Card
                key={role.id}
                sx={{
                  minWidth: 300,
                  maxWidth: 320,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.5 : 1,
                  border: isSelected
                    ? `2px solid ${role.color}`
                    : "1px solid #e5e7eb",
                  transform: isSelected ? "translateY(-4px)" : "none",
                  transition: "all 0.2s ease-in-out",
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": {
                    transform: isDisabled ? "none" : "translateY(-2px)",
                    boxShadow: isDisabled ? "none" : 3,
                  },
                }}
                onClick={() => !isDisabled && handleRoleSelect(role.id)}
              >
                <CardContent
                  sx={{
                    textAlign: "center",
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  {/* Role Icon */}
                  <Box sx={{ mb: 2 }}>{role.icon}</Box>

                  {/* Role Title */}
                  <Typography variant="h5" component="h2" gutterBottom>
                    {role.title}
                  </Typography>

                  {/* Role Description */}
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {role.description}
                  </Typography>

                  {/* Role Features */}
                  <Box sx={{ textAlign: "left", mb: 3, flexGrow: 1 }}>
                    {role.features.map((feature, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        sx={{
                          mb: 0.5,
                          "&::before": {
                            content: '"• "',
                            color: role.color,
                            fontWeight: "bold",
                          },
                        }}
                      >
                        {feature}
                      </Typography>
                    ))}
                  </Box>

                  {/* Select Button */}
                  <Button
                    variant={isSelected ? "contained" : "outlined"}
                    fullWidth
                    disabled={isDisabled}
                    sx={{
                      borderRadius: 999,
                      textTransform: "none",
                      fontWeight: 700,
                      borderColor: role.color,
                      color: isSelected ? "#fff" : role.color,
                      background: isSelected
                        ? `linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)`
                        : "transparent",
                      boxShadow: isSelected
                        ? "0 8px 16px rgba(59,130,246,0.20)"
                        : "none",
                      "&:hover": {
                        background: isSelected
                          ? `linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)`
                          : "#eff6ff",
                        borderColor: role.color,
                      },
                      mt: "auto",
                    }}
                  >
                    {isDisabled
                      ? "Role Taken"
                      : isSelected
                      ? "Selected"
                      : "Select Role"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Session Status */}

        {/* Continue Button */}
        <Box sx={{ textAlign: "center" }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleContinue}
            disabled={!selectedRole}
            sx={{
              minWidth: 200,
              py: 1.5,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
              boxShadow: "0 10px 20px rgba(59,130,246,0.25)",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 14px 24px rgba(59,130,246,0.3)",
                background: "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
              },
            }}
          >
            Join Session
          </Button>
        </Box>
      </Box>
    </div>
  );
};

export default RoleSelection;
