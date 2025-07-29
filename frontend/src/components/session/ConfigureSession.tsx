import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Grid,
  Divider,
  Alert,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import {
  Groups as GroupsIcon,
  Timer as TimerIcon,
  DateRange as DateRangeIcon,
} from "@mui/icons-material";
import { RootState } from "../../store";
import { SessionRole } from "../../features/session/sessionSlice";
import {
  getCategories,
  configureSession,
  getAllRecallDates,
} from "../../services/api";

interface SessionConfig {
  sessionType: "topic" | "recall";
  selectedTopics: string[];
  recallDate?: string; // Keep for backward compatibility
  recallStartDate?: Date | null;
  recallEndDate?: Date | null;
  readingTime: number;
  consultationTime: number;
  timingType: "countdown" | "stopwatch";
}

interface Participant {
  username: string;
  role: SessionRole;
}

const ConfigureSession: React.FC = () => {
  const navigate = useNavigate();
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const location = useLocation();
  const { user, token, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Get role from location state (passed from role selection)
  const selectedRole = location.state?.role as SessionRole;
  const sessionTitle =
    location.state?.sessionTitle || "PLAB 2 Practice Session";

  const [config, setConfig] = useState<SessionConfig>({
    sessionType: "topic",
    selectedTopics: [],
    recallDate: "",
    recallStartDate: null,
    recallEndDate: null,
    readingTime: 2,
    consultationTime: 8,
    timingType: "countdown",
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { username: user?.name || "test1", role: selectedRole || "doctor" },
  ]);

  const [error, setError] = useState<string | null>(null);

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [availableRecallDates, setAvailableRecallDates] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load topics first
        const topicsResponse = await getCategories();
        const topics = topicsResponse.data.map(
          (category: any) => category.name
        );
        setAvailableTopics([...topics, "Random"]);

        // Load recall dates with proper error handling
        try {
          const recallDatesResponse = await getAllRecallDates();
          setAvailableRecallDates(recallDatesResponse.data || []);
        } catch (recallError: any) {
          // Check if it's an authentication error
          if (recallError.response?.status === 403) {
            // Authentication error - handle silently or show user message
          }
          setAvailableRecallDates([]);
        }
      } catch (error) {
        // Fallback to default topics
        setAvailableTopics([
          "Cardiology",
          "Respiratory",
          "Gastroenterology",
          "Neurology",
          "Endocrinology",
          "Rheumatology",
          "Dermatology",
          "Psychiatry",
          "Pediatrics",
          "Obstetrics & Gynecology",
          "Surgery",
          "Emergency Medicine",
          "Random",
        ]);
        setAvailableRecallDates([]);
      } finally {
        setLoading(false);
      }
    };

    // Only load data if user is authenticated and has a token
    if (isAuthenticated && user && token) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, token, isAuthenticated]);

  const readingTimeOptions = [1, 1.5, 2, 3, 5];
  const consultationTimeOptions = [5, 7, 7.5, 8, 10, 12, 15];

  const handleSessionTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newType = event.target.value as "topic" | "recall";
    setConfig((prev) => ({
      ...prev,
      sessionType: newType,
      selectedTopics: newType === "recall" ? [] : prev.selectedTopics,
      recallDate: newType === "topic" ? "" : prev.recallDate,
      recallStartDate: newType === "topic" ? null : prev.recallStartDate,
      recallEndDate: newType === "topic" ? null : prev.recallEndDate,
    }));
  };

  const handleTopicChange = (event: SelectChangeEvent<string>) => {
    const topic = event.target.value;
    if (topic && !config.selectedTopics.includes(topic)) {
      setConfig((prev) => ({
        ...prev,
        selectedTopics: [...prev.selectedTopics, topic],
      }));
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedTopics: prev.selectedTopics.filter(
        (topic) => topic !== topicToRemove
      ),
    }));
  };

  const handleTimingChange = (field: keyof SessionConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getTotalSessionTime = () => {
    return config.readingTime + config.consultationTime;
  };

  const isFormValid = () => {
    if (config.sessionType === "topic") {
      return config.selectedTopics.length > 0;
    } else if (config.sessionType === "recall") {
      // Check if either date range is set OR single date is set (backward compatibility)
      return (
        (config.recallStartDate && config.recallEndDate) ||
        (config.recallDate && config.recallDate.length > 0)
      );
    }
    return true;
  };

  const handleStartSession = async () => {
    if (!isFormValid()) {
      if (config.sessionType === "topic") {
        setError("Please select at least one topic for topic-based practice");
      } else {
        setError(
          "Please select a date range for recall practice (both start and end dates are required)"
        );
      }
      return;
    }

    setError(null);

    try {
      const configData = {
        sessionType: config.sessionType.toUpperCase(),
        selectedTopics: config.selectedTopics,
        recallDate: config.recallDate,
        recallStartDate: config.recallStartDate
          ? config.recallStartDate.toISOString().split("T")[0]
          : undefined,
        recallEndDate: config.recallEndDate
          ? config.recallEndDate.toISOString().split("T")[0]
          : undefined,
        readingTime: config.readingTime,
        consultationTime: config.consultationTime,
        timingType: config.timingType.toUpperCase(),
      };

      // Configure session with backend
      await configureSession(sessionCode!, configData);

      // Navigate to session room
      navigate(`/session/${sessionCode}/room`, {
        state: {
          role: selectedRole,
          isHost: true,
          config,
          sessionTitle,
        },
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to start session";
      setError(errorMessage);
    }
  };

  const getRoleColor = (role: SessionRole) => {
    switch (role) {
      case "doctor":
        return "#1976d2";
      case "patient":
        return "#2e7d32";
      case "observer":
        return "#7b1fa2";
      default:
        return "#666";
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes === 1) return "1 minute";
    if (minutes % 1 === 0) return `${minutes} minutes`;
    return `${minutes} minutes`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Configure Session
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up the consultation timing and select a topic for optimal
            practice experience
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Session Participants */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <GroupsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Session Participants</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {participants.map((participant, index) => (
                <Chip
                  key={index}
                  label={`${participant.username} (${
                    participant.role.charAt(0).toUpperCase() +
                    participant.role.slice(1)
                  })`}
                  sx={{
                    backgroundColor: `${getRoleColor(participant.role)}20`,
                    color: getRoleColor(participant.role),
                    fontWeight: "medium",
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            {/* Session Type */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session Type
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Choose between topic-based practice or recall practice
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: "pointer",
                        border:
                          config.sessionType === "topic"
                            ? "2px solid #1976d2"
                            : "1px solid #e0e0e0",
                        backgroundColor:
                          config.sessionType === "topic"
                            ? "#1976d220"
                            : "transparent",
                      }}
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, sessionType: "topic" }))
                      }
                    >
                      <CardContent sx={{ textAlign: "center", py: 3 }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Select Topic
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Practice by medical specialty
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: "pointer",
                        border:
                          config.sessionType === "recall"
                            ? "2px solid #1976d2"
                            : "1px solid #e0e0e0",
                        backgroundColor:
                          config.sessionType === "recall"
                            ? "#1976d220"
                            : "transparent",
                      }}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          sessionType: "recall",
                        }))
                      }
                    >
                      <CardContent sx={{ textAlign: "center", py: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Select Recall
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Practice by exam date
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Topic Selection */}
            {config.sessionType === "topic" && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Choose Medical Topics
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select a topic to add</InputLabel>
                    <Select
                      value=""
                      onChange={handleTopicChange}
                      label="Select a topic to add"
                    >
                      {availableTopics
                        .filter(
                          (topic) => !config.selectedTopics.includes(topic)
                        )
                        .map((topic) => (
                          <MenuItem key={topic} value={topic}>
                            {topic}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {config.selectedTopics.map((topic) => (
                      <Chip
                        key={topic}
                        label={
                          topic === "Random"
                            ? `Random (${availableTopics.length - 1})`
                            : topic
                        }
                        onDelete={() => handleRemoveTopic(topic)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Recall Date Range Selection */}
            {config.sessionType === "recall" && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <DateRangeIcon color="primary" />
                    <Typography variant="h6">
                      Choose Recall Date Range
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Select a date range to practice cases that fall within this
                    period. This allows you to practice multiple related cases
                    from a specific time frame.
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Start Date"
                        type="date"
                        fullWidth
                        value={
                          config.recallStartDate
                            ? config.recallStartDate.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          setConfig((prev) => ({
                            ...prev,
                            recallStartDate: date,
                          }));
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          max: config.recallEndDate
                            ? config.recallEndDate.toISOString().split("T")[0]
                            : undefined,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="End Date"
                        type="date"
                        fullWidth
                        value={
                          config.recallEndDate
                            ? config.recallEndDate.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          setConfig((prev) => ({
                            ...prev,
                            recallEndDate: date,
                          }));
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          min: config.recallStartDate
                            ? config.recallStartDate.toISOString().split("T")[0]
                            : undefined,
                        }}
                      />
                    </Grid>
                  </Grid>

                  {config.recallStartDate && config.recallEndDate && (
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#e3f2fd",
                        borderRadius: 1,
                        border: "1px solid #bbdefb",
                      }}
                    >
                      <Typography variant="body2" color="primary">
                        📅 Selected Range:{" "}
                        {config.recallStartDate.toLocaleDateString()} to{" "}
                        {config.recallEndDate.toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cases with recall dates in this range will be available
                        for practice
                      </Typography>
                    </Box>
                  )}

                  {loading && (
                    <Box
                      sx={{
                        p: 3,
                        textAlign: "center",
                        backgroundColor: "#f5f5f5",
                        borderRadius: 1,
                        mt: 2,
                      }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        Loading available recall dates...
                      </Typography>
                    </Box>
                  )}

                  {!loading && availableRecallDates.length === 0 && (
                    <Box
                      sx={{
                        p: 3,
                        textAlign: "center",
                        backgroundColor: "#f5f5f5",
                        borderRadius: 1,
                        mt: 2,
                      }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        No recall dates available yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cases need to be marked for recall practice in the admin
                        panel
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timing Configuration */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Grid container spacing={4}>
                  {/* Reading Time */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Reading Time
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Time for participants to read their notes before
                      consultation begins
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {readingTimeOptions.map((time) => (
                        <Button
                          key={time}
                          variant={
                            config.readingTime === time
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() =>
                            handleTimingChange("readingTime", time)
                          }
                          sx={{ minWidth: 80 }}
                        >
                          <Box textAlign="center">
                            <Typography variant="h6">{time}</Typography>
                            <Typography variant="caption">
                              {time === 1 ? "minute" : "minutes"}
                            </Typography>
                          </Box>
                        </Button>
                      ))}
                    </Box>
                  </Grid>

                  {/* Consultation Time */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Consultation Time
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Duration for the actual consultation practice
                    </Typography>

                    {/* Timing Type Selection */}
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant={
                          config.timingType === "countdown"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() =>
                          handleTimingChange("timingType", "countdown")
                        }
                        sx={{ mr: 1 }}
                        startIcon={<TimerIcon />}
                      >
                        Countdown
                      </Button>
                      <Button
                        variant={
                          config.timingType === "stopwatch"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() =>
                          handleTimingChange("timingType", "stopwatch")
                        }
                        startIcon={<TimerIcon />}
                      >
                        Stopwatch
                      </Button>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {consultationTimeOptions.map((time) => (
                        <Button
                          key={time}
                          variant={
                            config.consultationTime === time
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() =>
                            handleTimingChange("consultationTime", time)
                          }
                          sx={{
                            minWidth: 80,
                            backgroundColor:
                              config.consultationTime === time &&
                              config.timingType === "countdown"
                                ? "#4caf50"
                                : undefined,
                            "&:hover": {
                              backgroundColor:
                                config.consultationTime === time &&
                                config.timingType === "countdown"
                                  ? "#45a049"
                                  : undefined,
                            },
                          }}
                        >
                          <Box textAlign="center">
                            <Typography variant="h6">{time}</Typography>
                            <Typography variant="caption">minutes</Typography>
                          </Box>
                        </Button>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Session Summary */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ position: "sticky", top: 20 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Session Type:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {config.sessionType === "topic"
                      ? "Topic-Based Practice"
                      : "Recall Practice"}
                  </Typography>
                </Box>

                {config.sessionType === "topic" && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Selected Topics:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {config.selectedTopics.length > 0
                        ? config.selectedTopics.join(", ")
                        : "None selected"}
                    </Typography>
                  </Box>
                )}

                {config.sessionType === "recall" && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Recall Date Range:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {config.recallStartDate && config.recallEndDate
                        ? `${config.recallStartDate.toLocaleDateString()} - ${config.recallEndDate.toLocaleDateString()}`
                        : "Not selected"}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Reading Phase:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatTime(config.readingTime)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Consultation Timer:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatTime(config.consultationTime)} {config.timingType}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Session Time:
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatTime(getTotalSessionTime())}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleStartSession}
                  disabled={!isFormValid()}
                  startIcon={<TimerIcon />}
                  sx={{ py: 1.5 }}
                >
                  Start Practice Session
                </Button>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block", textAlign: "center" }}
                >
                  A random case from the selected topic(s) will be assigned once
                  you start
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ConfigureSession;
