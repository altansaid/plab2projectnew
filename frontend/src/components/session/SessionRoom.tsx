// @ts-nocheck
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";

/*
 * 🔧 PERSISTENT FEEDBACK STATE SOLUTION
 *
 * PROBLEM: Feedback notes were being lost when consultation ended (by button or timer)
 *
 * ROOT CAUSE: Even with always-mounted component design, subtle re-renders during
 * phase transitions could cause internal component state to reset.
 *
 * SOLUTION: Lifted feedback state up to parent component (SessionRoomMain)
 *
 * KEY IMPROVEMENTS:
 * ✅ Feedback state managed by parent - never gets lost during phase transitions
 * ✅ Debug logging to track state preservation across phase changes
 * ✅ All input handlers use persistent state setters from parent
 * ✅ Component props ensure state continuity even if component remounts
 * ✅ Comprehensive state tracking: feedback fields, rating, submission status
 *
 * ARCHITECTURE:
 * - Parent (SessionRoomMain) owns all feedback state
 * - Child (PersistentFeedbackComponent) receives state via props
 * - No internal state in feedback component = no state loss possible
 * - Same component stays mounted across consultation → feedback transition
 * - State persists even if WebSocket reconnects or parent re-renders
 *
 * DEBUGGING:
 * - Console logs track phase changes and state preservation
 * - Emojis make logs easy to spot: 🔄 phase, 📝 input, ⭐ rating, 🚀 submit
 */

// Client-side timer architecture - no global timer handlers needed
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  Chip,
  Divider,
  Avatar,
  AvatarGroup,
  IconButton,
  Alert,
  Paper,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ExitToApp as ExitIcon,
  SkipNext as SkipIcon,
  Refresh as NewCaseIcon,
  Feedback as FeedbackIcon,
  VolumeUp as AudioIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from "@mui/icons-material";
import { RootState } from "../../store";
import { SessionRole } from "../../features/session/sessionSlice";
import {
  getSessionByCode,
  skipPhase,
  startSession,
  connectWebSocket,
  disconnectWebSocket,
  leaveSession,
  submitFeedback,
} from "../../services/api";

interface SessionData {
  sessionCode: string;
  title: string;
  phase: "waiting" | "reading" | "consultation" | "feedback" | "completed";
  participants: Array<{
    id: string;
    name: string;
    role: SessionRole;
    isOnline: boolean;
  }>;
  // REMOVED: timeRemaining and totalTime - these belong in timerData to prevent re-renders
  config: {
    readingTime: number;
    consultationTime: number;
    timingType: "countdown" | "stopwatch";
    selectedTopics: string[];
  };
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    scenario: string;
    doctorRole: string;
    patientRole: string;
    doctorNotes: string;
    patientNotes: string;
    category: {
      id: number;
      name: string;
    };
    difficulty: string;
    duration: number;
  };
}

// Persistent Feedback State Interface
interface FeedbackState {
  overallPerformance: string;
  clinicalKnowledge: string;
  communicationSkills: string;
  professionalism: string;
  timeManagement: string;
  patientSafety: string;
  additionalComments: string;
}

// Client-Side Timer Hook - Handles local countdown calculation
const useClientTimer = () => {
  const [timerState, setTimerState] = useState({
    isActive: false,
    startTimestamp: 0,
    durationSeconds: 0,
    phase: "waiting",
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start client-side timer with given parameters
  const startClientTimer = useCallback(
    (durationSeconds: number, startTimestamp: number, phase: string) => {
      console.log("Starting client-side timer:", {
        durationSeconds,
        startTimestamp,
        phase,
      });

      setTimerState({
        isActive: true,
        startTimestamp,
        durationSeconds,
        phase,
      });

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start local countdown - updates every second for smooth display
      // This is LOCAL ONLY - no network requests or global state updates
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimestamp) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsed);

        if (remaining <= 0) {
          console.log("Client-side timer expired for phase:", phase);
          setTimerState((prev) => ({ ...prev, isActive: false }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Timer expiry is handled by backend scheduled task
          // No need for client to trigger phase transitions
        }
      }, 1000);
    },
    []
  );

  // Stop client-side timer
  const stopClientTimer = useCallback(() => {
    console.log("Stopping client-side timer");

    setTimerState((prev) => ({
      ...prev,
      isActive: false,
    }));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Get current remaining time (calculated locally)
  const getRemainingTime = useCallback(() => {
    if (!timerState.isActive || timerState.startTimestamp === 0) {
      return timerState.durationSeconds;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTimestamp) / 1000);
    const remaining = Math.max(0, timerState.durationSeconds - elapsed);

    return remaining;
  }, [
    timerState.isActive,
    timerState.startTimestamp,
    timerState.durationSeconds,
  ]);

  // Get total duration
  const getTotalTime = useCallback(() => {
    return timerState.durationSeconds;
  }, [timerState.durationSeconds]);

  // Get current phase
  const getPhase = useCallback(() => {
    return timerState.phase;
  }, [timerState.phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Return stable object to prevent infinite re-renders
  return useMemo(
    () => ({
      startClientTimer,
      stopClientTimer,
      getRemainingTime,
      getTotalTime,
      getPhase,
      isActive: timerState.isActive,
    }),
    [
      startClientTimer,
      stopClientTimer,
      getRemainingTime,
      getTotalTime,
      getPhase,
      timerState.isActive,
    ]
  );
};

// TimerDisplay Component - shows current timer status
const TimerDisplay = memo(({ clientTimer }: { clientTimer: any }) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);

  useEffect(() => {
    const updateDisplay = () => {
      setDisplayTime(clientTimer.getRemainingTime());
      setDisplayTotal(clientTimer.getTotalTime());
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [clientTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress =
    displayTotal > 0 ? ((displayTotal - displayTime) / displayTotal) * 100 : 0;

  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      <Typography variant="h4" component="div" sx={{ mb: 1 }}>
        {formatTime(displayTime)}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
});

// STABLE Feedback Component - uses single handler to prevent focus loss
const StableFeedbackComponent = memo(
  ({
    sessionCode,
    phase,
    onSubmitSuccess,
    visible = true,
    // STABLE PROPS FROM PARENT - prevent re-renders and focus loss
    feedbackState,
    rating,
    isSubmitting,
    hasSubmitted,
    onFieldChange, // Single stable handler
    onSubmit, // Single stable submit handler
  }: {
    sessionCode: string;
    phase: string;
    onSubmitSuccess?: () => void;
    visible?: boolean;
    feedbackState: FeedbackState;
    rating: number;
    isSubmitting: boolean;
    hasSubmitted: boolean;
    onFieldChange: (fieldName: string, value: string | number) => void;
    onSubmit: () => Promise<void>;
  }) => {
    // Debug logging to track component stability
    useEffect(() => {
      console.log("🔄 StableFeedbackComponent: Phase changed to", phase);
      console.log(
        "🔒 Component rendered with stable props - no focus loss expected"
      );
    }, [phase]);

    // SINGLE FIELD HANDLER - creates stable onChange functions that never change
    const createFieldHandler = useCallback(
      (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          fieldName === "rating"
            ? Number(event.target.value)
            : event.target.value;
        onFieldChange(fieldName, value);
      },
      [onFieldChange]
    );

    // STABLE FIELD HANDLERS - memoized to prevent recreation and focus loss
    const fieldHandlers = useMemo(
      () => ({
        overallPerformance: createFieldHandler("overallPerformance"),
        clinicalKnowledge: createFieldHandler("clinicalKnowledge"),
        communicationSkills: createFieldHandler("communicationSkills"),
        professionalism: createFieldHandler("professionalism"),
        timeManagement: createFieldHandler("timeManagement"),
        patientSafety: createFieldHandler("patientSafety"),
        additionalComments: createFieldHandler("additionalComments"),
        rating: createFieldHandler("rating"),
      }),
      [createFieldHandler]
    );

    // STABLE SUBMIT HANDLER - wrapped to include onSubmitSuccess callback
    const handleSubmit = useCallback(async () => {
      await onSubmit();
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    }, [onSubmit, onSubmitSuccess]);

    // Always render during consultation and feedback phases, but control visibility
    if (!visible || (phase !== "consultation" && phase !== "feedback")) {
      return null;
    }

    // During consultation, show a note-taking interface
    const isConsultationPhase = phase === "consultation";
    const isFeedbackPhase = phase === "feedback";

    if (hasSubmitted) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              Feedback Submitted
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thank you for your feedback! Your input has been recorded.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {isConsultationPhase
              ? "Feedback Notes (Take notes during consultation)"
              : "Consultation Feedback"}
          </Typography>

          {isConsultationPhase && (
            <Alert severity="info" sx={{ mb: 3 }}>
              You can take notes and prepare your feedback during the
              consultation. The Submit button will appear once the consultation
              ends.
            </Alert>
          )}

          {isFeedbackPhase && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Consultation has ended. Please review your notes and submit your
              feedback.
            </Alert>
          )}

          {/* Overall Rating */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Overall Performance Rating (1-10) {isFeedbackPhase && "*"}
            </Typography>
            <TextField
              type="number"
              value={rating}
              onChange={fieldHandlers.rating}
              inputProps={{ min: 1, max: 10 }}
              fullWidth
              size="small"
              placeholder="Rate from 1 to 10"
              disabled={isConsultationPhase}
              helperText={
                isConsultationPhase
                  ? "Rating will be enabled after consultation"
                  : ""
              }
            />
          </Box>

          {/* Detailed Feedback Fields - Using Stable Handlers */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Overall Performance"
                multiline
                rows={3}
                value={feedbackState.overallPerformance}
                onChange={fieldHandlers.overallPerformance}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Clinical Knowledge"
                multiline
                rows={3}
                value={feedbackState.clinicalKnowledge}
                onChange={fieldHandlers.clinicalKnowledge}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Communication Skills"
                multiline
                rows={3}
                value={feedbackState.communicationSkills}
                onChange={fieldHandlers.communicationSkills}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Professionalism"
                multiline
                rows={3}
                value={feedbackState.professionalism}
                onChange={fieldHandlers.professionalism}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Time Management"
                multiline
                rows={3}
                value={feedbackState.timeManagement}
                onChange={fieldHandlers.timeManagement}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Patient Safety"
                multiline
                rows={3}
                value={feedbackState.patientSafety}
                onChange={fieldHandlers.patientSafety}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Additional Comments"
                multiline
                rows={4}
                value={feedbackState.additionalComments}
                onChange={fieldHandlers.additionalComments}
                fullWidth
                size="small"
                placeholder="Any additional feedback or suggestions..."
              />
            </Grid>
          </Grid>

          {/* Submit Button - Only show during feedback phase */}
          {isFeedbackPhase && (
            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                size="large"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
              {rating === 0 && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{
                    mt: 1,
                    textAlign: "center",
                    display: "block",
                    width: "100%",
                  }}
                >
                  Please provide a rating before submitting
                </Typography>
              )}
            </Box>
          )}

          {/* Status message during consultation */}
          {isConsultationPhase && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Keep taking notes during the consultation. Submit button will
                appear when consultation ends.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }
);

// 🔧 MODULE-LEVEL PATIENT INFORMATION CARD - Extracted for reuse in ConsultationView
interface PatientInformationCardProps {
  userRole: SessionRole;
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    scenario: string;
    doctorRole: string;
    patientRole: string;
    doctorNotes: string;
    patientNotes: string;
    observerNotes?: string;
    category: {
      id: number;
      name: string;
    };
    difficulty: string;
    duration: number;
  } | null;
}

const PatientInformationCard: React.FC<PatientInformationCardProps> = memo(
  ({ userRole, selectedCase }) => {
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

    if (!selectedCase) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No patient information available
            </Typography>
          </CardContent>
        </Card>
      );
    }

    const caseData = selectedCase;

    // Get role-specific information
    const getPatientScenario = () => {
      return (
        caseData.scenario ||
        caseData.description ||
        `Patient presenting with ${
          caseData.title?.toLowerCase() || "medical condition"
        }`
      );
    };

    const getRoleSpecificNotes = () => {
      switch (userRole) {
        case "doctor":
          return caseData.doctorNotes || "No additional doctor notes provided";
        case "patient":
          return (
            caseData.patientNotes || "No additional patient notes provided"
          );
        case "observer":
          return (
            caseData.observerNotes || "No additional observer notes provided"
          );
        default:
          return "No additional notes provided";
      }
    };

    const getRoleSpecificInstructions = () => {
      switch (userRole) {
        case "doctor":
          return (
            caseData.doctorRole ||
            "Assess the patient and discuss management with them"
          );
        case "patient":
          return (
            caseData.patientRole ||
            "Present your symptoms and respond naturally to the doctor's questions"
          );
        case "observer":
          return "Observe the consultation and take notes on communication skills, clinical approach, and overall consultation flow";
        default:
          return "Participate in the consultation session";
      }
    };

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: getRoleColor(userRole),
                mr: 2,
              }}
            />
            <Typography variant="h6">
              {userRole === "doctor"
                ? "Doctor Information"
                : userRole === "patient"
                ? "Patient Information"
                : "Observer Information"}
            </Typography>
          </Box>

          {/* Case Title */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Case:
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "#e3f2fd",
                borderRadius: 1,
                color: "#1565c0",
                fontWeight: "medium",
              }}
            >
              {caseData.title}
            </Typography>
          </Box>

          {/* Patient Scenario */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Scenario:
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "#f5f5f5",
                borderRadius: 1,
              }}
            >
              {getPatientScenario()}
            </Typography>
          </Box>

          {/* Role-specific notes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              {userRole === "doctor"
                ? "Doctor Notes:"
                : userRole === "patient"
                ? "Patient Background:"
                : "Observer Notes:"}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "#fff3e0",
                borderRadius: 1,
              }}
            >
              {getRoleSpecificNotes()}
            </Typography>
          </Box>

          {/* Role-specific instructions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              What you must do:
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "#e3f2fd",
                borderRadius: 1,
                color: "#1565c0",
              }}
            >
              {getRoleSpecificInstructions()}
            </Typography>
          </Box>

          {/* Additional context for Doctor */}
          {userRole === "doctor" && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Setting:
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  p: 2,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                }}
              >
                FY2 in GP Surgery
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }
);

// 🔧 MODULE-LEVEL CONSULTATION VIEW - Prevents timer flicker by staying stable across parent re-renders
interface ConsultationViewProps {
  userRole: SessionRole;
  clientTimer: any;
  buttonStates: {
    giveFeedback: boolean;
  };
  onGiveFeedback: () => void;
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    scenario: string;
    doctorRole: string;
    patientRole: string;
    doctorNotes: string;
    patientNotes: string;
    observerNotes?: string;
    category: {
      id: number;
      name: string;
    };
    difficulty: string;
    duration: number;
  } | null;
}

const ConsultationView: React.FC<ConsultationViewProps> = memo(
  ({ userRole, clientTimer, buttonStates, onGiveFeedback, selectedCase }) => {
    return (
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {/* Patient Information Card for Patient and Observer */}
          {(userRole === "patient" || userRole === "observer") && (
            <Grid item xs={12} md={8}>
              <PatientInformationCard
                userRole={userRole}
                selectedCase={selectedCase}
              />
            </Grid>
          )}

          {/* Consultation Progress Card */}
          <Grid item xs={12} md={userRole === "doctor" ? 8 : 4}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Consultation in Progress
                </Typography>
                <Typography variant="body1" paragraph>
                  The consultation is now taking place. Follow your role
                  guidelines and participate actively.
                </Typography>

                {userRole === "doctor" && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Lead the consultation, ask appropriate questions, and manage
                    the time effectively.
                  </Alert>
                )}

                {userRole === "patient" && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Role-play as the patient. Respond naturally to the doctor's
                    questions based on your case information.
                  </Alert>
                )}

                {userRole === "observer" && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Observe the consultation and take notes for your feedback.
                    Focus on communication skills and clinical approach.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Timer and Controls Sidebar */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Consultation Timer
                </Typography>
                <TimerDisplay clientTimer={clientTimer} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", mt: 1 }}
                >
                  Time remaining for consultation
                </Typography>
              </CardContent>
            </Card>

            {userRole === "doctor" && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Doctor Controls
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<FeedbackIcon />}
                    onClick={onGiveFeedback}
                    disabled={buttonStates.giveFeedback}
                    sx={{ mb: 1 }}
                  >
                    End Consultation
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Click to end consultation and move to feedback phase
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>
    );
  }
);

// MAIN COMPONENT - Client-side timer architecture
const SessionRoomMain: React.FC = () => {
  const navigate = useNavigate();
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // Get data from previous screens
  const userRole = location.state?.role as SessionRole;
  const isHost = location.state?.isHost as boolean;
  const sessionConfig = location.state?.config;
  const sessionTitle = location.state?.sessionTitle || "Medical Consultation";

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // PERSISTENT FEEDBACK STATE - managed here to prevent loss during phase transitions
  const [persistentFeedbackState, setPersistentFeedbackState] =
    useState<FeedbackState>({
      overallPerformance: "",
      clinicalKnowledge: "",
      communicationSkills: "",
      professionalism: "",
      timeManagement: "",
      patientSafety: "",
      additionalComments: "",
    });
  const [persistentRating, setPersistentRating] = useState(0);
  const [persistentIsSubmitting, setPersistentIsSubmitting] = useState(false);
  const [persistentHasSubmitted, setPersistentHasSubmitted] = useState(false);

  // SINGLE MEMOIZED HANDLER - prevents focus loss by providing stable reference
  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number) => {
      console.log(`📝 Field changed: ${fieldName} = ${value}`);

      if (fieldName === "rating") {
        setPersistentRating(value as number);
      } else {
        // Handle all feedback text fields
        setPersistentFeedbackState((prev) => ({
          ...prev,
          [fieldName]: value as string,
        }));
      }
    },
    []
  ); // Empty dependency array = stable reference forever

  // SUBMISSION HANDLER - also memoized for stability
  const handleFeedbackSubmit = useCallback(async () => {
    if (
      persistentIsSubmitting ||
      persistentHasSubmitted ||
      persistentRating === 0
    ) {
      return;
    }

    console.log("🚀 Submitting feedback with stable handler...");
    setPersistentIsSubmitting(true);

    try {
      const feedbackData = {
        rating: persistentRating,
        feedback: persistentFeedbackState,
      };

      console.log("📤 Feedback data being submitted:", feedbackData);
      await submitFeedback(sessionCode!, feedbackData);

      setPersistentHasSubmitted(true);
      console.log("✅ Feedback submitted successfully");
    } catch (error) {
      console.error("❌ Failed to submit feedback:", error);
    } finally {
      setPersistentIsSubmitting(false);
    }
  }, [
    persistentIsSubmitting,
    persistentHasSubmitted,
    persistentRating,
    persistentFeedbackState,
    sessionCode,
  ]);

  // STABLE PROPS OBJECT - memoized to prevent unnecessary re-renders
  const stableFeedbackProps = useMemo(
    () => ({
      feedbackState: persistentFeedbackState,
      rating: persistentRating,
      isSubmitting: persistentIsSubmitting,
      hasSubmitted: persistentHasSubmitted,
      onFieldChange: handleFieldChange,
      onSubmit: handleFeedbackSubmit,
    }),
    [
      persistentFeedbackState,
      persistentRating,
      persistentIsSubmitting,
      persistentHasSubmitted,
      handleFieldChange,
      handleFeedbackSubmit,
    ]
  );

  // Debug: Track feedback state preservation (reduced logging to prevent spam)
  useEffect(() => {
    if (sessionData?.phase) {
      console.log("🔄 Main component: Phase changed to", sessionData.phase);
      console.log(
        "💾 Persistent feedback state preserved:",
        Object.keys(persistentFeedbackState).some(
          (key) => persistentFeedbackState[key as keyof FeedbackState]
        )
      );
      console.log("⭐ Persistent rating:", persistentRating);
    }
  }, [sessionData?.phase]);

  // CLIENT-SIDE TIMER - No per-second WebSocket updates, no UI re-renders
  const clientTimer = useClientTimer();

  // Button state management for better UX
  const [buttonStates, setButtonStates] = useState({
    skipToConsultation: false,
    newCase: false,
    giveFeedback: false,
    startSession: false,
  });

  // Refs for cleanup and debouncing
  const debounceTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const isCleaningUp = useRef(false);
  const hasUnloaded = useRef(false);
  const previousPhase = useRef<string>("");

  // Track phase changes
  useEffect(() => {
    if (sessionData?.phase) {
      previousPhase.current = sessionData.phase;
    }
  }, [sessionData?.phase]);

  // Essential session handlers (restored after refactor)
  const handleStartSession = useCallback(async () => {
    if (!sessionCode || !user) return;

    // Set button loading state
    setButtonStates((prev) => ({ ...prev, startSession: true }));

    try {
      console.log("Starting session:", sessionCode);
      await startSession(sessionCode);
      console.log("Session started successfully");

      // If WebSocket is not working, poll for session updates
      setTimeout(async () => {
        try {
          const response = await getSessionByCode(sessionCode);
          const session = response.data;
          setSessionData((prev) =>
            prev
              ? {
                  ...prev,
                  phase: session.phase?.toLowerCase() || prev.phase,
                  participants: session.participants || prev.participants,
                }
              : null
          );
        } catch (pollError) {
          console.error("Failed to poll session updates:", pollError);
        }
      }, 1000);
    } catch (error: any) {
      console.error("Failed to start session:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to start session"
      );
    } finally {
      // Reset button loading state
      setButtonStates((prev) => ({ ...prev, startSession: false }));
    }
  }, [sessionCode, user]);

  const handleSkipToConsultation = useCallback(async () => {
    if (!sessionCode || !sessionData) return;
    try {
      console.log("Skipping to consultation phase:", sessionCode);
      await skipPhase(sessionCode);
      console.log("Phase skipped successfully");
    } catch (error: any) {
      console.error("Failed to skip phase:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to skip to consultation"
      );
    }
  }, [sessionCode, sessionData]);

  const handleNewCase = useCallback(async () => {
    if (!sessionData) return;
    setSessionData((prev) => {
      if (!prev) return prev;
      return { ...prev, phase: "reading" };
    });
    const durationSeconds = sessionData.config.readingTime * 60;
    const startTimestamp = Date.now();
    clientTimer.startClientTimer(durationSeconds, startTimestamp, "reading");
  }, [sessionData]); // Removed clientTimer dependency to prevent infinite loops

  const handleGiveFeedback = useCallback(async () => {
    if (!sessionData) return;
    try {
      console.log("Doctor ending consultation and moving to feedback phase");
      await skipPhase(sessionData.sessionCode);
      console.log("Successfully transitioned to feedback phase");
    } catch (error) {
      console.error("Failed to transition to feedback phase:", error);
    }
  }, [sessionData]);

  const handleSubmitFeedback = useCallback(async () => {
    // This is a placeholder - the actual feedback submission is handled by IndependentFeedbackComponent
    console.log("Submit feedback called from main component");
  }, []);

  const handleExit = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const confirmExit = useCallback(async () => {
    setShowExitDialog(false);
    try {
      if (sessionCode) {
        await leaveSession(sessionCode);
      }
      disconnectWebSocket();
    } catch (error) {
      console.error("Error leaving session:", error);
    }
    navigate("/dashboard");
  }, [sessionCode, navigate]);

  // WebSocket message handlers
  const handleSessionEnded = useCallback(
    (reason: string) => {
      setSessionEnded(true);
      setError(`Session ended: ${reason}`);
      setTimeout(() => navigate("/dashboard"), 3000);
    },
    [navigate]
  );

  // Load session data and set up WebSocket
  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionCode) {
        setError("No session code provided");
        setLoading(false);
        return;
      }

      try {
        const response = await getSessionByCode(sessionCode);
        const session = response.data;

        console.log("Session data received:", session);

        const initialSessionData = {
          sessionCode: session.code,
          title: session.title,
          phase: session.phase?.toLowerCase() || "waiting",
          participants: session.participants || [],
          config: {
            readingTime: session.readingTime || 2,
            consultationTime: session.consultationTime || 8,
            timingType: session.timingType?.toLowerCase() || "countdown",
            selectedTopics: session.selectedTopics
              ? JSON.parse(session.selectedTopics)
              : ["Random"],
          },
          selectedCase: session.selectedCase || null,
        };

        setSessionData(initialSessionData);

        // Initialize client-side timer if session has a timer phase
        if (
          initialSessionData.phase === "reading" ||
          initialSessionData.phase === "consultation"
        ) {
          const durationSeconds =
            initialSessionData.phase === "reading"
              ? session.readingTime * 60
              : session.consultationTime * 60;
          const startTimestamp = Date.now();
          clientTimer.startClientTimer(
            durationSeconds,
            startTimestamp,
            initialSessionData.phase
          );
        }

        // Set up WebSocket connection with error handling
        console.log("Setting up WebSocket for session:", sessionCode);
        try {
          connectWebSocket(sessionCode, {
            onSessionUpdate: (data) => {
              console.log("Session update received:", data);
              setSessionData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  phase: data.phase?.toLowerCase() || prev.phase,
                  participants: data.participants || prev.participants,
                };
              });
            },
            onParticipantUpdate: (participants) => {
              console.log("Participant update received:", participants);
              setSessionData((prev) =>
                prev ? { ...prev, participants } : null
              );
            },
            onPhaseChange: (data) => {
              console.log("Phase change received:", data);
              setSessionData((prev) =>
                prev ? { ...prev, phase: data.phase.toLowerCase() } : null
              );

              if (data.durationSeconds && data.durationSeconds > 0) {
                console.log(
                  "Starting client-side timer for phase:",
                  data.phase
                );
                clientTimer.startClientTimer(
                  data.durationSeconds,
                  data.startTimestamp,
                  data.phase
                );
              } else {
                console.log("No timer for phase:", data.phase);
                clientTimer.stopClientTimer();
              }
            },
            onTimerStart: (data) => {
              console.log("Timer start received:", data);
              if (data.durationSeconds && data.startTimestamp) {
                clientTimer.startClientTimer(
                  data.durationSeconds,
                  data.startTimestamp,
                  data.phase
                );
              }
            },
            onSessionEnded: (data) => {
              console.log("Session ended message received:", data);
              clientTimer.stopClientTimer();
              handleSessionEnded(data.reason || "Session has ended");
            },
          });
        } catch (wsError) {
          console.error(
            "Failed to setup WebSocket, continuing without real-time updates:",
            wsError
          );
          // Continue without WebSocket - session will still work with manual refresh
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        setError("Failed to load session data");
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();

    return () => {
      try {
        disconnectWebSocket();
      } catch (error) {
        console.error("Error during WebSocket cleanup:", error);
      }
    };
  }, [sessionCode, handleSessionEnded]); // Removed clientTimer dependency to prevent infinite loops

  const getPhaseLabel = useCallback((): string => {
    if (!sessionData) return "Loading";
    switch (sessionData.phase) {
      case "waiting":
        return "Waiting";
      case "reading":
        return "Reading";
      case "consultation":
        return "Consultation";
      case "feedback":
        return "Feedback";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  }, [sessionData?.phase]);

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

  // Parse doctor information from case data
  const getDoctorInfo = () => {
    if (!sessionData?.selectedCase) {
      return {
        whereAreYou: "FY2 in GP Surgery",
        whoThePatientIs: "No patient information available",
        otherInformation: "No additional background information provided",
        whatYouMustDo: "Assess the patient and discuss management with them",
      };
    }

    const caseData = sessionData.selectedCase;

    return {
      whereAreYou: "FY2 in GP Surgery",
      whoThePatientIs:
        caseData.scenario ||
        caseData.description ||
        `Patient presenting with ${
          caseData.title?.toLowerCase() || "medical condition"
        }`,
      otherInformation:
        caseData.doctorNotes || "No additional background information provided",
      whatYouMustDo:
        caseData.doctorRole ||
        "Assess the patient and discuss management with them",
    };
  };

  // 🔧 MEMOIZED VIEW COMPONENTS - Prevents recreation on every render to fix focus loss
  // Previously these were recreated on every SessionRoomMain render, causing component tree
  // to be unmounted/remounted and losing TextField focus
  const WaitingView = useMemo(
    () => () => {
      return (
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h4" gutterBottom>
                    Waiting Room
                  </Typography>
                  <Typography variant="h6" color="text.secondary" paragraph>
                    {isHost
                      ? "Start the session when all participants are ready."
                      : "Waiting for the host to start the session..."}
                  </Typography>

                  {/* Participants List */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Participants ({sessionData?.participants?.length || 0})
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    {sessionData?.participants?.map((participant) => (
                      <Chip
                        key={participant.id}
                        label={`${participant.name} (${
                          participant.role?.charAt(0).toUpperCase() +
                          participant.role?.slice(1)
                        })`}
                        color={participant.isOnline ? "success" : "default"}
                        variant={participant.isOnline ? "filled" : "outlined"}
                        sx={{
                          mr: 1,
                          mb: 1,
                          backgroundColor: participant.isOnline
                            ? getRoleColor(participant.role)
                            : undefined,
                          color: participant.isOnline ? "white" : undefined,
                        }}
                      />
                    )) || []}
                    {(!sessionData?.participants ||
                      sessionData.participants.length === 0) && (
                      <Typography variant="body2" color="text.secondary">
                        No participants yet
                      </Typography>
                    )}
                  </Box>

                  {/* Host Controls */}
                  {isHost && (
                    <Box sx={{ mt: 4 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<PlayIcon />}
                        onClick={handleStartSession}
                        disabled={
                          buttonStates.startSession ||
                          !sessionData?.participants?.length
                        }
                        sx={{ py: 1.5, px: 4 }}
                      >
                        {buttonStates.startSession
                          ? "Starting Session..."
                          : "Start Session"}
                      </Button>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {!sessionData?.participants?.length
                          ? "Waiting for participants to join..."
                          : "Click to begin the practice session"}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Session Information
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>Session Code:</strong> {sessionData?.sessionCode}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Your Role:</strong>{" "}
                      {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {isHost ? "Host" : "Participant"}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    {isHost
                      ? "You can start the session once all expected participants have joined."
                      : "The session will begin automatically when the host starts it."}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      );
    },
    [
      sessionData,
      isHost,
      userRole,
      buttonStates.startSession,
      handleStartSession,
    ]
  );

  const DoctorReadingView = memo(() => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PatientInformationCard
            userRole="doctor"
            selectedCase={sessionData?.selectedCase}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Session Controls
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<SkipIcon />}
                  onClick={handleSkipToConsultation}
                  disabled={buttonStates.skipToConsultation}
                  sx={{ py: 1.5 }}
                >
                  {buttonStates.skipToConsultation
                    ? "Skipping..."
                    : "Skip to Consultation"}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<NewCaseIcon />}
                  onClick={handleNewCase}
                  disabled={buttonStates.newCase}
                  sx={{ py: 1.5 }}
                >
                  {buttonStates.newCase ? "Loading..." : "New Case"}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<FeedbackIcon />}
                  onClick={handleGiveFeedback}
                  disabled={buttonStates.giveFeedback}
                  sx={{ py: 1.5 }}
                >
                  {buttonStates.giveFeedback ? "Loading..." : "Give Feedback"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Role
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lead the consultation, manage timing, and provide feedback.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  });

  const PatientObserverReadingView = useMemo(
    () => () => {
      return (
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <PatientInformationCard
                userRole={userRole!}
                selectedCase={sessionData?.selectedCase}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Reading Phase
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Review the patient information and prepare for the
                    consultation
                  </Typography>

                  <TimerDisplay clientTimer={clientTimer} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    Time until consultation begins
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Your Role:{" "}
                    {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userRole === "patient"
                      ? "You will role-play as the patient during the consultation. Review your background and symptoms above."
                      : userRole === "observer"
                      ? "You will observe the consultation and provide feedback. Review the case details above."
                      : "You are participating in this practice session"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      );
    },
    [sessionData, userRole, clientTimer]
  );

  // Memoized doctor feedback view to prevent re-creation
  const DoctorFeedbackView = useMemo(
    () => () => {
      return (
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h4" gutterBottom align="center">
                    Consultation Complete
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    align="center"
                    paragraph
                  >
                    Waiting for feedback from Patient and Observer...
                  </Typography>

                  <Box sx={{ textAlign: "center", mb: 4 }}>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body1" align="center">
                        The consultation has ended successfully. Patient and
                        Observer are now providing their feedback on the
                        session. You will be able to see their feedback once
                        they submit it.
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      );
    },
    []
  );

  // Main render logic based on phase and role
  const renderMainContent = () => {
    if (!sessionData) return null;

    if (sessionData.phase === "waiting") {
      return <WaitingView />;
    } else if (sessionData.phase === "reading") {
      if (userRole === "doctor") {
        return <DoctorReadingView />;
      } else {
        // Patient and Observer now see patient information during reading phase
        return <PatientObserverReadingView />;
      }
    } else if (sessionData.phase === "consultation") {
      return (
        <>
          <ConsultationView
            userRole={userRole!}
            clientTimer={clientTimer}
            buttonStates={buttonStates}
            onGiveFeedback={handleGiveFeedback}
            selectedCase={sessionData.selectedCase}
          />
          {/* STABLE Feedback Component for Patient and Observer - Rendered separately to prevent parent re-renders */}
          {(userRole === "patient" || userRole === "observer") && (
            <Container maxWidth="lg" sx={{ mt: 2 }}>
              <StableFeedbackComponent
                key={`stable-feedback-${sessionData.sessionCode}`}
                sessionCode={sessionData.sessionCode}
                phase={sessionData.phase}
                onSubmitSuccess={handleSubmitFeedback}
                visible={true}
                {...stableFeedbackProps}
              />
            </Container>
          )}
        </>
      );
    } else if (sessionData.phase === "feedback") {
      // Role-based feedback phase rendering
      if (userRole === "doctor") {
        // Doctor sees waiting message instead of feedback form
        return <DoctorFeedbackView />;
      } else {
        // Patient and Observer: Continue to show ConsultationView + StableFeedbackComponent
        // StableFeedbackComponent remains mounted across phase transitions for perfect focus preservation
        return (
          <>
            <ConsultationView
              userRole={userRole!}
              clientTimer={clientTimer}
              buttonStates={buttonStates}
              onGiveFeedback={handleGiveFeedback}
              selectedCase={sessionData.selectedCase}
            />
            {/* ALWAYS MOUNTED feedback component - preserves focus across phase transitions */}
            <Container maxWidth="lg" sx={{ mt: 2 }}>
              <StableFeedbackComponent
                key={`stable-feedback-${sessionData.sessionCode}`}
                sessionCode={sessionData.sessionCode}
                phase={sessionData.phase}
                onSubmitSuccess={handleSubmitFeedback}
                visible={true}
                {...stableFeedbackProps}
              />
            </Container>
          </>
        );
      }
    } else if (sessionData.phase === "completed") {
      return (
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h4" gutterBottom>
              Session Complete
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Thank you for participating in this practice session
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/dashboard")}
              sx={{ mt: 4 }}
            >
              Return to Dashboard
            </Button>
          </Box>
        </Container>
      );
    }

    return null;
  };

  // Session ended screen
  if (sessionEnded) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Session has ended
          </Alert>
          <Typography variant="h6" paragraph>
            {error || "The session has been terminated."}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You will be redirected to the dashboard automatically.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Typography variant="h6">Loading session...</Typography>
        </Box>
      </Container>
    );
  }

  // Handle error state
  if (error && !sessionEnded) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  // Handle missing session data
  if (!sessionData) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Session data not found
          </Alert>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 0 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="medium">
              {sessionData.title}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Role: {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Session: {sessionData.sessionCode}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phase: {getPhaseLabel()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Participants */}
            <AvatarGroup max={4}>
              {sessionData.participants?.map((participant) => (
                <Avatar
                  key={participant.id}
                  sx={{
                    bgcolor: getRoleColor(participant.role),
                    width: 32,
                    height: 32,
                    fontSize: "0.8rem",
                  }}
                >
                  {participant.name?.charAt(0) || "?"}
                </Avatar>
              )) || []}
            </AvatarGroup>

            <Button
              variant="contained"
              color="error"
              startIcon={<ExitIcon />}
              onClick={handleExit}
            >
              Exit
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>{renderMainContent()}</Box>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>Exit Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this session? Other participants will
            be notified and the session may end if there aren't enough
            participants remaining.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>Cancel</Button>
          <Button onClick={confirmExit} color="error" variant="contained">
            Exit Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Main Session Room Component with Client-Side Timer Architecture
const SessionRoom: React.FC = () => {
  return <SessionRoomMain />;
};

export default SessionRoom;
