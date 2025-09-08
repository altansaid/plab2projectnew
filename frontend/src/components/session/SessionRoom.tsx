// @ts-nocheck
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

// Logger utility for development - removed for production

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
  CircularProgress,
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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  ExitToApp as ExitIcon,
  SkipNext as SkipIcon,
  Refresh as NewCaseIcon,
  Feedback as FeedbackIcon,
  VolumeUp as AudioIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeOff as MuteIcon,
  Image as ImageIcon,
  Close as CloseIcon,
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
  completeSession,
  requestNewCase,
  selectNewTopic,
  endSession,
  getObserverFeedbackStatus,
} from "../../services/api";
import { Helmet } from "react-helmet-async";

interface SessionData {
  sessionCode: string;
  title: string;
  phase: "waiting" | "reading" | "consultation" | "feedback" | "completed";
  currentRound?: number; // Track which round/case iteration we're on
  participants: Array<{
    id: string;
    name: string;
    role: SessionRole;
    isOnline: boolean;
    hasCompleted?: boolean;
    hasGivenFeedback?: boolean;
  }>;
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
    // Doctor role specific content
    doctorSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Patient/Observer role specific content
    patientSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Common fields
    doctorNotes?: string;
    patientNotes?: string;
    imageUrl?: string;
    visualData?: {
      type: "image" | "text";
      content: string;
    };
    category: {
      id: number;
      name: string;
    };
    duration?: number;
    feedbackCriteria?: Array<{
      id: string;
      name: string;
      order: number;
      hasSubCriteria: boolean;
      subCriteria: Array<{
        id: string;
        name: string;
        order: number;
      }>;
    }>;
  };
}

// Persistent Feedback State Interface
interface FeedbackCriteriaScore {
  criterionId: string;
  criterionName: string;
  score: number | null;
  subScores: Array<{
    subCriterionId: string;
    subCriterionName: string;
    score: number | null;
  }>;
}

interface FeedbackState {
  criteriaScores: FeedbackCriteriaScore[];
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
      formatTime: (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      },
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
const StableFeedbackComponent = ({
  sessionCode,
  phase,
  onSubmitSuccess,
  visible = true,
  // STABLE PROPS FROM PARENT - prevent re-renders and focus loss
  feedbackState,
  isSubmitting,
  hasSubmitted,
  selectedCase,
  userRole,
  onFieldChange, // Single stable handler
  onSubmit, // Single stable submit handler
  onSubmitWithRoleChange, // New handler for role change
  validateObserverFeedback, // Observer feedback validation
}: {
  sessionCode: string;
  phase: string;
  onSubmitSuccess?: () => void;
  visible?: boolean;
  feedbackState: FeedbackState;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  selectedCase?: {
    feedbackCriteria?: Array<{
      id: string;
      name: string;
      order: number;
      hasSubCriteria: boolean;
      subCriteria: Array<{
        id: string;
        name: string;
        order: number;
      }>;
    }>;
  };
  userRole?: string;
  onFieldChange: (
    fieldName: string,
    value: string | number,
    subFieldId?: string
  ) => void;
  onSubmit: (startNewCase?: boolean) => Promise<void>;
  onSubmitWithRoleChange?: () => Promise<void>;
  validateObserverFeedback?: (
    actionType: "newCase" | "roleChange"
  ) => Promise<boolean>;
}) => {
  // Debug logging to track component stability
  useEffect(() => {
    // Component stability tracking
  }, [phase]);

  // Note: createCriteriaHandler removed - using direct onFieldChange calls with rating buttons

  // STABLE COMMENT HANDLER
  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("additionalComments", event.target.value);
    },
    [onFieldChange]
  );

  // Calculate overall performance from current scores
  const calculateOverallPerformance = useCallback(() => {
    if (!feedbackState.criteriaScores.length) return 0;

    let totalScore = 0;
    let count = 0;

    feedbackState.criteriaScores.forEach((criteria) => {
      if (criteria.score !== null) {
        totalScore += criteria.score;
        count++;
      } else if (criteria.subScores.length > 0) {
        const validSubScores = criteria.subScores.filter(
          (sub) => sub.score !== null
        );
        if (validSubScores.length > 0) {
          const subAverage =
            validSubScores.reduce((sum, sub) => sum + (sub.score || 0), 0) /
            validSubScores.length;
          totalScore += subAverage;
          count++;
        }
      }
    });

    return totalScore; // Return sum of all main criteria scores
  }, [feedbackState.criteriaScores]);

  // Calculate maximum possible score for X/Y format display
  const calculateMaxPossibleScore = useCallback(() => {
    if (!selectedCase?.feedbackCriteria?.length) return 0;
    return selectedCase.feedbackCriteria.length * 4; // Each criterion can score up to 4
  }, [selectedCase?.feedbackCriteria]);

  // Check if all criteria have scores
  const isComplete = useCallback(() => {
    if (!selectedCase?.feedbackCriteria?.length) return false;

    return feedbackState.criteriaScores.every((criteria) => {
      if (criteria.subScores.length > 0) {
        return criteria.subScores.every((sub) => sub.score !== null);
      }
      return criteria.score !== null;
    });
  }, [feedbackState.criteriaScores, selectedCase?.feedbackCriteria]);

  // Rating Button Component
  const RatingButtons = ({
    value,
    onChange,
    disabled = false,
    label,
  }: {
    value: number | null;
    onChange: (rating: number) => void;
    disabled?: boolean;
    label: string;
  }) => {
    const theme = useTheme();

    // Debug: Log the current value prop

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={(_, newValue) => {
            // Prevent deselection - only allow changes to valid ratings
            if (newValue !== null) {
              onChange(newValue);
            } else {
            }
          }}
          disabled={disabled}
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            "& .MuiToggleButton-root": {
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "8px !important",
              px: 2,
              py: 1,
              "&.Mui-selected": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                borderColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                },
              },
            },
          }}
        >
          {[0, 1, 2, 3, 4].map((rating) => (
            <ToggleButton
              key={rating}
              value={rating}
              aria-label={`${rating} stars`}
            >
              {rating}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    );
  };

  // STABLE SUBMIT HANDLER - wrapped to include onSubmitSuccess callback
  const handleSubmit = useCallback(
    async (startNewCase = false) => {
      await onSubmit(startNewCase);
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    },
    [onSubmit, onSubmitSuccess]
  );

  // SUBMIT WITH NEW CASE HANDLER - includes observer validation
  const handleSubmitWithNewCase = useCallback(async () => {
    if (validateObserverFeedback) {
      const canProceed = await validateObserverFeedback("newCase");
      if (!canProceed) {
        return; // Validation will handle showing dialog and eventual submission
      }
    }
    await handleSubmit(true);
  }, [validateObserverFeedback, handleSubmit]);

  // SUBMIT WITH ROLE CHANGE HANDLER - includes observer validation
  const handleSubmitWithRoleChangeValidated = useCallback(async () => {
    if (validateObserverFeedback) {
      const canProceed = await validateObserverFeedback("roleChange");
      if (!canProceed) {
        return; // Validation will handle showing dialog and eventual submission
      }
    }
    if (onSubmitWithRoleChange) {
      await onSubmitWithRoleChange();
    }
  }, [validateObserverFeedback, onSubmitWithRoleChange]);

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
            ? "Live Feedback Rating"
            : "Consultation Feedback"}
        </Typography>

        {isConsultationPhase && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You can rate in real-time during the consultation. Your ratings are
            automatically saved. The Submit button will appear once the
            consultation ends.
          </Alert>
        )}

        {isFeedbackPhase && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Consultation has ended. Please review your ratings and submit your
            feedback.
          </Alert>
        )}

        {/* Overall Performance Display */}
        {selectedCase?.feedbackCriteria &&
          selectedCase.feedbackCriteria.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Overall Performance: {calculateOverallPerformance().toFixed(1)}/
                {calculateMaxPossibleScore()}
              </Typography>
            </Box>
          )}

        {/* Dynamic Feedback Criteria */}
        {selectedCase?.feedbackCriteria &&
        selectedCase.feedbackCriteria.length > 0 ? (
          <Grid container spacing={3}>
            {selectedCase.feedbackCriteria
              .sort((a, b) => a.order - b.order)
              .map((criterion) => {
                const criteriaScore = feedbackState.criteriaScores.find(
                  (score) => score.criterionId === criterion.id
                );

                return (
                  <Grid item xs={12} key={criterion.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {criterion.name}
                        </Typography>

                        {criterion.hasSubCriteria ? (
                          // Render sub-criteria
                          <Grid container spacing={2}>
                            {criterion.subCriteria
                              .sort((a, b) => a.order - b.order)
                              .map((subCriterion) => {
                                const subScore = criteriaScore?.subScores.find(
                                  (sub) =>
                                    sub.subCriterionId === subCriterion.id
                                );

                                return (
                                  <Grid
                                    item
                                    xs={12}
                                    md={6}
                                    key={subCriterion.id}
                                  >
                                    <Box sx={{ mb: 2 }}>
                                      <RatingButtons
                                        value={subScore?.score ?? null}
                                        onChange={(rating) =>
                                          onFieldChange(
                                            criterion.id,
                                            rating,
                                            subCriterion.id
                                          )
                                        }
                                        disabled={false}
                                        label={subCriterion.name}
                                      />
                                    </Box>
                                  </Grid>
                                );
                              })}

                            {criterion.subCriteria.length > 0 && (
                              <Grid item xs={12}>
                                <Box
                                  sx={{
                                    mt: 1,
                                    p: 1,
                                    bgcolor: "#fff3e0",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    💡 This criterion's score will be calculated
                                    as the average of its sub-criteria
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        ) : (
                          // Direct rating for criterion without sub-criteria
                          <Box sx={{ mb: 2 }}>
                            <RatingButtons
                              value={criteriaScore?.score ?? null}
                              onChange={(rating) =>
                                onFieldChange(criterion.id, rating)
                              }
                              disabled={false}
                              label="Rating"
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No feedback criteria defined for this case. Please contact the
            administrator.
          </Alert>
        )}

        {/* Additional Comments */}
        <Box sx={{ mt: 3 }}>
          <TextField
            label="Additional Comments"
            multiline
            rows={4}
            value={feedbackState.additionalComments}
            onChange={handleCommentChange}
            fullWidth
            size="small"
            placeholder="Any additional feedback or suggestions..."
          />
        </Box>

        {/* Submit Button - Only show during feedback phase */}
        {isFeedbackPhase && (
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                onClick={() => handleSubmit(false)}
                disabled={!isComplete() || isSubmitting}
                size="large"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback & Close"}
              </Button>
              {userRole !== "observer" && (
                <Button
                  variant="contained"
                  onClick={handleSubmitWithNewCase}
                  disabled={!isComplete() || isSubmitting}
                  size="large"
                  startIcon={<NewCaseIcon />}
                >
                  {isSubmitting ? "Submitting..." : "Submit & New Case"}
                </Button>
              )}
              {userRole === "patient" && onSubmitWithRoleChange && (
                <Button
                  variant="contained"
                  onClick={handleSubmitWithRoleChangeValidated}
                  disabled={!isComplete() || isSubmitting}
                  size="large"
                  startIcon={<NewCaseIcon />}
                  sx={{ bgcolor: "secondary.main" }}
                >
                  {isSubmitting ? "Submitting..." : "Submit & Role Change"}
                </Button>
              )}
            </Box>
            {!isComplete() && (
              <Typography
                variant="caption"
                color="error"
                sx={{
                  textAlign: "center",
                }}
              >
                Please provide ratings for all criteria before submitting
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 🔧 MODULE-LEVEL PATIENT INFORMATION CARD - Extracted for reuse in ConsultationView
interface PatientInformationCardProps {
  userRole: SessionRole;
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    // Doctor role specific content
    doctorSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Patient/Observer role specific content
    patientSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Common fields
    doctorNotes?: string;
    patientNotes?: string;
    imageUrl?: string;
    visualData?: {
      type: "image" | "text";
      content: string;
    };
    category: {
      id: number;
      name: string;
    };
    duration?: number;
  } | null;
}

const PatientInformationCard: React.FC<PatientInformationCardProps> = ({
  userRole,
  selectedCase,
}) => {
  const theme = useTheme();
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!selectedCase) return null;

  // Get role-specific content
  const sections =
    userRole.toLowerCase() === "doctor"
      ? selectedCase.doctorSections
      : selectedCase.patientSections;
  const roleSpecificNotes =
    userRole.toLowerCase() === "doctor"
      ? selectedCase.doctorNotes
      : userRole.toLowerCase() === "patient"
      ? selectedCase.patientNotes
      : "";

  return (
    <Card>
      <CardContent>
        <Box>
          {userRole.toLowerCase() !== "doctor" && (
            <Typography variant="h6" gutterBottom>
              {selectedCase.title}
            </Typography>
          )}

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
            ></Typography>
            <Typography variant="body2">{selectedCase.description}</Typography>
          </Box>

          {roleSpecificNotes && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Notes
              </Typography>
              <Typography variant="body2">{roleSpecificNotes}</Typography>
            </Box>
          )}

          {sections && sections.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              ></Typography>
              {sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <Box key={section.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">{section.title}</Typography>
                    <Typography variant="body2">{section.content}</Typography>
                  </Box>
                ))}
            </Box>
          )}
        </Box>
      </CardContent>

      <Dialog
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          Case Image
          <IconButton
            onClick={() => setShowImageModal(false)}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": { color: theme.palette.text.primary },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="img"
            src={selectedCase.imageUrl}
            alt="Case Image"
            sx={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// 🔧 MODULE-LEVEL CONSULTATION VIEW - Prevents timer flicker by staying stable across parent re-renders
interface ConsultationViewProps {
  userRole: SessionRole;
  clientTimer: any;
  buttonStates: {
    giveFeedback: boolean;
  };
  onGiveFeedback: () => void;
  showContentModal: boolean;
  setShowContentModal: (show: boolean) => void;
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    // Doctor role specific content
    doctorSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Patient/Observer role specific content
    patientSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    // Common fields
    doctorNotes?: string;
    patientNotes?: string;
    imageUrl?: string;
    visualData?: {
      type: "image" | "text";
      content: string;
    };
    category: {
      id: number;
      name: string;
    };
    duration?: number;
  } | null;
}

const ConsultationView: React.FC<ConsultationViewProps> = ({
  userRole,
  clientTimer,
  buttonStates,
  onGiveFeedback,
  showContentModal,
  setShowContentModal,
  selectedCase,
}) => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg">
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PatientInformationCard
            userRole={userRole}
            selectedCase={selectedCase}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consultation Phase
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The consultation is now in progress
              </Typography>

              {userRole !== "doctor" && (
                <>
                  <TimerDisplay clientTimer={clientTimer} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    Time remaining for consultation
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Session Controls */}
          {(userRole === "doctor" ||
            selectedCase?.visualData?.content ||
            selectedCase?.imageUrl) && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session Controls
                </Typography>
                {(selectedCase?.visualData?.content ||
                  selectedCase?.imageUrl) && (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ImageIcon />}
                    onClick={() => setShowContentModal(true)}
                    sx={{ py: 1.5, mb: 1 }}
                  >
                    Examination Findings
                  </Button>
                )}
                {userRole === "doctor" && (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<FeedbackIcon />}
                    onClick={onGiveFeedback}
                    disabled={buttonStates.giveFeedback}
                    sx={{ py: 1.5 }}
                  >
                    {buttonStates.giveFeedback
                      ? "Ending..."
                      : "End Consultation"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

// MAIN COMPONENT - Client-side timer architecture
const SessionRoomMain: React.FC = () => {
  const navigate = useNavigate();
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // Get data from previous screens with fallback
  const [userRole, setUserRole] = useState<SessionRole>(
    (location.state?.role as SessionRole) || "observer"
  );
  const isHost = location.state?.isHost as boolean;
  const sessionConfig = location.state?.config;
  const sessionTitle = location.state?.sessionTitle || "Medical Consultation";

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showObserverWarningDialog, setShowObserverWarningDialog] =
    useState(false);
  const [showTopicSelectionDialog, setShowTopicSelectionDialog] =
    useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [completedTopic, setCompletedTopic] = useState<string>("");
  const [pendingSubmissionAction, setPendingSubmissionAction] = useState<
    "newCase" | "roleChange" | null
  >(null);

  // Global audio mute toggle and audio elements
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const audioEnterRef = useRef<HTMLAudioElement | null>(null);
  const audioTwoMinRef = useRef<HTMLAudioElement | null>(null);
  const audioMoveOnRef = useRef<HTMLAudioElement | null>(null);
  const audioBeginRef = useRef<HTMLAudioElement | null>(null);
  const twoMinPlayedForConsultation = useRef<boolean>(false);

  // Preload audio elements on mount
  useEffect(() => {
    audioEnterRef.current = new Audio("/enterroom.mp3");
    audioTwoMinRef.current = new Audio("/2min.mp3");
    audioMoveOnRef.current = new Audio("/moveon.mp3");
    audioBeginRef.current = new Audio("/Begin1.mp3");
  }, []);

  const playSound = useCallback(
    (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
      if (!audioEnabled) return;
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {});
        }
      } catch (_) {}
    },
    [audioEnabled]
  );

  // PERSISTENT FEEDBACK STATE - managed here to prevent loss during phase transitions
  const [persistentFeedbackState, setPersistentFeedbackState] =
    useState<FeedbackState>({
      criteriaScores: [],
      additionalComments: "",
    });
  const [persistentIsSubmitting, setPersistentIsSubmitting] = useState(false);
  const [persistentHasSubmitted, setPersistentHasSubmitted] = useState(false);

  // Track current round and case for feedback state reset
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [prevPhaseForReset, setPrevPhaseForReset] = useState<string>("");

  // Helper function to reset feedback state
  const resetFeedbackState = useCallback(() => {
    // Force immediate state updates
    setPersistentHasSubmitted(false);
    setPersistentIsSubmitting(false);
    setPersistentFeedbackState({
      criteriaScores: [],
      additionalComments: "",
    });

    // Additional safety: Force re-render after a small delay
    setTimeout(() => {
      setPersistentHasSubmitted(false);
    }, 10);
  }, [persistentHasSubmitted]);

  // Reset feedback state when new round starts
  useEffect(() => {
    if (
      sessionData?.currentRound &&
      sessionData.currentRound !== currentRound
    ) {
      resetFeedbackState();
      setCurrentRound(sessionData.currentRound);
    }
  }, [sessionData?.currentRound, currentRound, resetFeedbackState]);

  // Reset feedback state when case changes (backup mechanism)
  useEffect(() => {
    const newCaseId = sessionData?.selectedCase?.id;
    if (newCaseId && newCaseId !== currentCaseId && currentCaseId !== null) {
      resetFeedbackState();
    }
    if (newCaseId) {
      setCurrentCaseId(newCaseId);
    }
  }, [sessionData?.selectedCase?.id, currentCaseId, resetFeedbackState]);

  // Reset feedback state when phase changes to READING (indicating new case start)
  useEffect(() => {
    const currentPhase = sessionData?.phase;
    if (
      currentPhase === "reading" &&
      prevPhaseForReset !== "reading" &&
      prevPhaseForReset !== ""
    ) {
      resetFeedbackState();
    }
    if (currentPhase) {
      setPrevPhaseForReset(currentPhase);
    }
  }, [sessionData?.phase, prevPhaseForReset, resetFeedbackState]);

  // Initialize feedback criteria scores when session data loads
  useEffect(() => {
    // Always reinitialize if the criteria IDs don't match what we have in state
    const currentCriteriaIds =
      sessionData?.selectedCase?.feedbackCriteria?.map((c) => c.id) || [];
    const stateCriteriaIds = persistentFeedbackState.criteriaScores.map(
      (s) => s.criterionId
    );
    const idsMatch =
      currentCriteriaIds.length > 0 &&
      currentCriteriaIds.length === stateCriteriaIds.length &&
      currentCriteriaIds.every((id) => stateCriteriaIds.includes(id));

    if (
      sessionData?.selectedCase?.feedbackCriteria &&
      (!idsMatch || persistentFeedbackState.criteriaScores.length === 0)
    ) {
      const initialScores: FeedbackCriteriaScore[] =
        sessionData.selectedCase.feedbackCriteria.map((criterion) => ({
          criterionId: criterion.id,
          criterionName: criterion.name,
          score: criterion.hasSubCriteria ? null : null,
          subScores: criterion.subCriteria.map((sub) => ({
            subCriterionId: sub.id,
            subCriterionName: sub.name,
            score: null,
          })),
        }));

      setPersistentFeedbackState((prev) => ({
        ...prev,
        criteriaScores: initialScores,
      }));
    }
  }, [
    sessionData?.selectedCase?.feedbackCriteria,
    persistentFeedbackState.criteriaScores.length,
  ]);

  // SINGLE MEMOIZED HANDLER - prevents focus loss by providing stable reference
  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number, subFieldId?: string) => {
      if (fieldName === "additionalComments") {
        setPersistentFeedbackState((prev) => ({
          ...prev,
          additionalComments: value as string,
        }));
      } else {
        // Handle criteria scores
        setPersistentFeedbackState((prev) => ({
          ...prev,
          criteriaScores: prev.criteriaScores.map((criteria) => {
            if (criteria.criterionId === fieldName) {
              if (subFieldId) {
                // Update sub-score
                return {
                  ...criteria,
                  subScores: criteria.subScores.map((sub) =>
                    sub.subCriterionId === subFieldId
                      ? { ...sub, score: value as number }
                      : sub
                  ),
                };
              } else {
                // Update main score
                return {
                  ...criteria,
                  score: value as number,
                };
              }
            }
            return criteria;
          }),
        }));
      }
    },
    []
  ); // Empty dependency array = stable reference forever

  // SUBMISSION HANDLER - also memoized for stability
  const handleFeedbackSubmit = useCallback(
    async (startNewCase = false) => {
      if (persistentIsSubmitting || persistentHasSubmitted) {
        return;
      }

      // Check if all criteria have scores
      const isComplete = persistentFeedbackState.criteriaScores.every(
        (criteria) => {
          if (criteria.subScores.length > 0) {
            return criteria.subScores.every((sub) => sub.score !== null);
          }
          return criteria.score !== null;
        }
      );

      if (!isComplete) {
        return;
      }

      setPersistentIsSubmitting(true);

      try {
        const feedbackData = {
          comment: persistentFeedbackState.additionalComments,
          criteriaScores: persistentFeedbackState.criteriaScores.map(
            (criteria) => ({
              criterionId: criteria.criterionId,
              criterionName: criteria.criterionName,
              score: criteria.score,
              subScores: criteria.subScores.map((sub) => ({
                subCriterionId: sub.subCriterionId,
                subCriterionName: sub.subCriterionName,
                score: sub.score,
              })),
            })
          ),
          requestNewCase: startNewCase, // Add flag to indicate new case request
        };

        await submitFeedback(sessionCode!, feedbackData);

        setPersistentHasSubmitted(true);

        // Handle the flow based on startNewCase flag
        if (startNewCase) {
          // If patient triggered new case, play Begin sound
          if (userRole === "patient") {
            playSound(audioBeginRef);
          }
          // Stay in session to see the new case (for all roles)
          // Reset feedback state after a short delay for new case
          setTimeout(() => {
            setPersistentHasSubmitted(false);
            setPersistentIsSubmitting(false);
            setPersistentFeedbackState({
              criteriaScores: [],
              additionalComments: "",
            });
          }, 500); // Wait a bit for backend to process

          return;
        }

        // Normal submission flow - navigate to dashboard
        disconnectWebSocket();
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } catch (error) {
        // Handle feedback submission error
      } finally {
        setPersistentIsSubmitting(false);
      }
    },
    [
      persistentIsSubmitting,
      persistentHasSubmitted,
      persistentFeedbackState,
      sessionCode,
      navigate,
      userRole,
      playSound,
    ]
  );

  // ROLE CHANGE SUBMISSION HANDLER - specifically for role swapping
  const handleFeedbackSubmitWithRoleChange = useCallback(async () => {
    if (persistentIsSubmitting || persistentHasSubmitted) {
      return;
    }

    // Check if all criteria have scores
    const isComplete = persistentFeedbackState.criteriaScores.every(
      (criteria) => {
        if (criteria.subScores.length > 0) {
          return criteria.subScores.every((sub) => sub.score !== null);
        }
        return criteria.score !== null;
      }
    );

    if (!isComplete) {
      return;
    }

    setPersistentIsSubmitting(true);

    try {
      const feedbackData = {
        comment: persistentFeedbackState.additionalComments,
        criteriaScores: persistentFeedbackState.criteriaScores.map(
          (criteria) => ({
            criterionId: criteria.criterionId,
            criterionName: criteria.criterionName,
            score: criteria.score,
            subScores: criteria.subScores.map((sub) => ({
              subCriterionId: sub.subCriterionId,
              subCriterionName: sub.subCriterionName,
              score: sub.score,
            })),
          })
        ),
        requestNewCase: true, // Always request new case for role change
        requestRoleChange: true, // New flag to indicate role change request
      };

      await submitFeedback(sessionCode!, feedbackData);

      setPersistentHasSubmitted(true);

      // Patient pressed Submit & Role Change, play Begin sound
      if (userRole === "patient") {
        playSound(audioBeginRef);
      }

      // Stay in session to see the new case with swapped roles
      // Reset feedback state after a short delay for new case with role change
      setTimeout(() => {
        setPersistentHasSubmitted(false);
        setPersistentIsSubmitting(false);
        setPersistentFeedbackState({
          criteriaScores: [],
          additionalComments: "",
        });
      }, 500); // Wait a bit for backend to process
    } catch (error) {
      // Handle feedback submission error
    } finally {
      setPersistentIsSubmitting(false);
    }
  }, [
    persistentIsSubmitting,
    persistentHasSubmitted,
    persistentFeedbackState,
    sessionCode,
    userRole,
    playSound,
  ]);

  // OBSERVER FEEDBACK VALIDATION FUNCTIONS
  const checkObserverFeedbackStatus = useCallback(async () => {
    if (!sessionCode)
      return { hasObserver: false, observerHasGivenFeedback: true };

    try {
      const response = await getObserverFeedbackStatus(sessionCode);
      return response.data;
    } catch (error) {
      // Return default safe values to not block submission
      return { hasObserver: false, observerHasGivenFeedback: true };
    }
  }, [sessionCode]);

  const validateObserverFeedbackBeforeSubmission = useCallback(
    async (actionType: "newCase" | "roleChange") => {
      // Only check for patient role submitting new case/role change
      if (userRole !== "patient") {
        return true; // Allow other roles to proceed normally
      }

      const observerStatus = await checkObserverFeedbackStatus();

      // If there's an observer and they haven't given feedback, show warning
      if (
        observerStatus.hasObserver &&
        !observerStatus.observerHasGivenFeedback
      ) {
        setPendingSubmissionAction(actionType);
        setShowObserverWarningDialog(true);
        return false; // Block submission until user decides
      }

      return true; // Allow submission to proceed
    },
    [userRole, checkObserverFeedbackStatus]
  );

  const handleObserverWarningContinue = useCallback(async () => {
    setShowObserverWarningDialog(false);

    // Execute the pending action
    if (pendingSubmissionAction === "newCase") {
      await handleFeedbackSubmit(true); // Submit with new case
    } else if (pendingSubmissionAction === "roleChange") {
      await handleFeedbackSubmitWithRoleChange(); // Submit with role change
    }

    setPendingSubmissionAction(null);
  }, [
    pendingSubmissionAction,
    handleFeedbackSubmit,
    handleFeedbackSubmitWithRoleChange,
  ]);

  const handleObserverWarningWait = useCallback(() => {
    setShowObserverWarningDialog(false);
    setPendingSubmissionAction(null);
    // Do nothing - just close dialog and wait
  }, []);

  const handleTopicSelection = useCallback(
    async (selectedTopic: string) => {
      if (!sessionData) return;

      try {
        await selectNewTopic(sessionData.sessionCode, selectedTopic);
        setShowTopicSelectionDialog(false);
      } catch (error: any) {
        setError(error.response?.data?.error || "Failed to select topic");
      }
    },
    [sessionData]
  );

  const handleSessionEnd = useCallback(async () => {
    if (!sessionData) return;

    try {
      await endSession(sessionData.sessionCode);
      setShowTopicSelectionDialog(false);

      // Navigate to dashboard after session is properly ended
      disconnectWebSocket();
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to end session");
    }
  }, [sessionData, navigate]);

  // Note: stableFeedbackProps will be defined after handleCompleteSession

  // Debug: Track feedback state preservation (reduced logging to prevent spam)
  useEffect(() => {
    if (sessionData?.phase) {
      // Phase change tracking
    }
  }, [sessionData?.phase, persistentFeedbackState]);

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

  // Handle phase transitions: reading -> consultation (enter), consultation -> feedback (move on)
  useEffect(() => {
    if (!sessionData) return;
    const currentPhase = sessionData.phase;
    const previous = previousPhase.current;
    if (previous !== "consultation" && currentPhase === "consultation") {
      playSound(audioEnterRef);
      twoMinPlayedForConsultation.current = false;
    }
    if (previous === "consultation" && currentPhase === "feedback") {
      playSound(audioMoveOnRef);
    }
    previousPhase.current = currentPhase;
  }, [sessionData?.phase, playSound]);

  // 2-minute remaining alert during consultation
  useEffect(() => {
    if (!sessionData || sessionData.phase !== "consultation") return;
    let interval: any = null;
    const tick = () => {
      const remaining = clientTimer.getRemainingTime?.() ?? 0;
      if (
        typeof remaining === "number" &&
        remaining <= 120 &&
        !twoMinPlayedForConsultation.current
      ) {
        twoMinPlayedForConsultation.current = true;
        playSound(audioTwoMinRef);
      }
    };
    // Run immediately and then every second
    try {
      tick();
    } catch (_) {}
    interval = setInterval(tick, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionData?.phase, clientTimer, playSound]);

  // Essential session handlers (restored after refactor)
  const handleStartSession = useCallback(async () => {
    if (!sessionCode || !user) return;

    // Set button loading state
    setButtonStates((prev) => ({ ...prev, startSession: true }));

    try {
      await startSession(sessionCode);

      // WebSocket will handle the session updates automatically
      // No need for polling since we have real-time updates
    } catch (error: any) {
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
      await skipPhase(sessionCode);
    } catch (error: any) {
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to skip to consultation"
      );
    }
  }, [sessionCode, sessionData]);

  const handleNewCase = useCallback(async () => {
    if (!sessionData) return;

    // Set button loading state
    setButtonStates((prev) => ({ ...prev, newCase: true }));

    try {
      await requestNewCase(sessionData.sessionCode);

      // The WebSocket handler will update the session data with the new case
      // and trigger the phase change automatically
    } catch (error: any) {
      setError(
        error.response?.data?.error || error.message || "Failed to get new case"
      );
    } finally {
      // Reset button loading state
      setButtonStates((prev) => ({ ...prev, newCase: false }));
    }
  }, [sessionData]); // Removed clientTimer dependency to prevent infinite loops

  const handleGiveFeedback = useCallback(async () => {
    if (!sessionData) return;

    // Set button loading state
    setButtonStates((prev) => ({ ...prev, giveFeedback: true }));

    try {
      console.log("Doctor ending consultation and moving to feedback phase");
      await skipPhase(sessionData.sessionCode);
      console.log("Successfully transitioned to feedback phase");

      // Stop the consultation timer
      clientTimer.stopClientTimer();

      // Force update the session phase immediately
      setSessionData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          phase: "feedback",
          participants: [...(prev.participants || [])],
          config: { ...prev.config },
          selectedCase: prev.selectedCase ? { ...prev.selectedCase } : null,
        };
      });
    } catch (error) {
      console.error("Failed to transition to feedback phase:", error);
      setError("Failed to transition to feedback phase. Please try again.");
    } finally {
      // Reset button loading state
      setButtonStates((prev) => ({ ...prev, giveFeedback: false }));
    }
  }, [sessionData, clientTimer, playSound]);

  const handleSubmitFeedback = useCallback(async () => {
    // This is a placeholder - the actual feedback submission is handled by IndependentFeedbackComponent
  }, []);

  // STABLE PROPS OBJECT - memoized to prevent unnecessary re-renders
  // Defined after handleCompleteSession to avoid hoisting issues
  const stableFeedbackProps = useMemo(
    () => ({
      feedbackState: persistentFeedbackState,
      isSubmitting: persistentIsSubmitting,
      hasSubmitted: persistentHasSubmitted,
      selectedCase: sessionData?.selectedCase,
      userRole: userRole,
      onFieldChange: handleFieldChange,
      onSubmit: handleFeedbackSubmit,
      onSubmitWithRoleChange: handleFeedbackSubmitWithRoleChange,
      validateObserverFeedback: validateObserverFeedbackBeforeSubmission,
    }),
    [
      persistentFeedbackState,
      persistentIsSubmitting,
      persistentHasSubmitted,
      sessionData?.selectedCase,
      userRole,
      handleFieldChange,
      handleFeedbackSubmit,
      handleFeedbackSubmitWithRoleChange,
      validateObserverFeedbackBeforeSubmission,
    ]
  );

  const handleExit = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const confirmExit = useCallback(async () => {
    setShowExitDialog(false);
    try {
      if (sessionCode) {
        if (sessionData?.phase === "feedback") {
          // Feedback phase'de individual completion yap
          await completeSession(sessionCode);
        } else {
          // Diğer phase'lerde normal leave session
          await leaveSession(sessionCode);
        }
      }
      disconnectWebSocket();
    } catch (error) {
      // Handle exit error silently
    }
    navigate("/dashboard");
  }, [sessionCode, sessionData?.phase, navigate]);

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

        // Update user role from backend if available
        if (session.userRole) {
          const backendRole = session.userRole.toLowerCase() as SessionRole;
          if (backendRole !== userRole) {
            setUserRole(backendRole);
          }
        }

        const initialSessionData = {
          sessionCode: session.code,
          title: session.title,
          phase: session.phase?.toLowerCase() || "waiting",
          currentRound: session.currentRound || 1, // Add currentRound
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
          const totalDurationSeconds =
            initialSessionData.phase === "reading"
              ? session.readingTime * 60
              : session.consultationTime * 60;

          // Use the original shared timestamp if available, otherwise reconstruct it
          let startTimestamp: number;

          if (session.timerStartTimestamp) {
            // Perfect sync: Use the original shared timestamp from backend
            startTimestamp = session.timerStartTimestamp;
          } else {
            // Fallback: Reconstruct timestamp (should only happen for legacy sessions)
            const remainingSeconds =
              session.timeRemaining || totalDurationSeconds;
            const elapsedSeconds = totalDurationSeconds - remainingSeconds;
            startTimestamp = Date.now() - elapsedSeconds * 1000;
          }

          clientTimer.startClientTimer(
            totalDurationSeconds,
            startTimestamp,
            initialSessionData.phase
          );
        }

        // Set up WebSocket connection with error handling
        try {
          connectWebSocket(sessionCode, {
            onSessionUpdate: (data) => {
              // Close topic selection dialog when session continues with new topic
              // Always close if new case detected (don't rely on stale state value)
              if (data.selectedCase) {
                setShowTopicSelectionDialog(false);
              }

              // Also close dialog when phase changes back to READING (new case started)
              if (data.phase === "READING" && data.selectedCase) {
                setShowTopicSelectionDialog(false);
              }

              setSessionData((prev) => {
                if (!prev) return null;

                // Check for new case and reset feedback immediately
                const isNewCase =
                  data.selectedCase &&
                  data.selectedCase.id !== prev.selectedCase?.id;
                const isNewRound =
                  data.currentRound && data.currentRound !== prev.currentRound;

                if (isNewCase || isNewRound) {
                  // Immediate feedback state reset
                  setTimeout(() => {
                    setPersistentHasSubmitted(false);
                    setPersistentIsSubmitting(false);
                    setPersistentFeedbackState({
                      criteriaScores: [],
                      additionalComments: "",
                    });
                  }, 0);
                }

                // Check if the current user's role has changed
                const currentUserId = user?.id;
                if (currentUserId && data.participants && prev.participants) {
                  const currentUserParticipant = data.participants.find(
                    (p: any) =>
                      p.userId === currentUserId ||
                      p.id === currentUserId.toString()
                  );
                  const prevUserParticipant = prev.participants.find(
                    (p: any) =>
                      p.userId === currentUserId ||
                      p.id === currentUserId.toString()
                  );

                  if (currentUserParticipant && prevUserParticipant) {
                    const newRole = currentUserParticipant.role;
                    const oldRole = prevUserParticipant.role;

                    if (newRole !== oldRole) {
                      setUserRole(newRole);
                    }
                  }
                }

                return {
                  ...prev,
                  phase: data.phase?.toLowerCase() || prev.phase,
                  currentRound: data.currentRound || prev.currentRound,
                  participants: data.participants || prev.participants,
                  selectedCase: data.selectedCase
                    ? { ...data.selectedCase }
                    : prev.selectedCase,
                };
              });
            },
            onParticipantUpdate: (participants) => {
              setSessionData((prev) =>
                prev ? { ...prev, participants } : null
              );
            },
            onPhaseChange: (data) => {
              // Close topic selection dialog when phase changes to reading (new case started)
              // Always close if phase is READING (don't rely on stale state value)
              if (data.phase === "READING") {
                setShowTopicSelectionDialog(false);

                // Reset feedback when reading phase starts (new case)
                setTimeout(() => {
                  setPersistentHasSubmitted(false);
                  setPersistentIsSubmitting(false);
                  setPersistentFeedbackState({
                    criteriaScores: [],
                    additionalComments: "",
                  });
                }, 0);
              }

              // Force a re-render by creating a new object
              setSessionData((prev) => {
                if (!prev) return null;

                // Get the latest case data from the session update
                const updatedCase = data.selectedCase
                  ? { ...data.selectedCase }
                  : prev.selectedCase;

                return {
                  ...prev,
                  phase: data.phase.toLowerCase(),
                  currentRound: data.currentRound || prev.currentRound,
                  participants: [...(prev.participants || [])],
                  config: { ...prev.config },
                  selectedCase: updatedCase,
                };
              });

              // Stop any existing timer
              clientTimer.stopClientTimer();

              // Start timer if duration is provided
              if (data.durationSeconds && data.durationSeconds > 0) {
                clientTimer.startClientTimer(
                  data.durationSeconds,
                  data.startTimestamp || Date.now(),
                  data.phase.toLowerCase()
                );
              }
            },
            onTimerStart: (data) => {
              if (data.durationSeconds && data.startTimestamp) {
                clientTimer.startClientTimer(
                  data.durationSeconds,
                  data.startTimestamp,
                  data.phase
                );
              }
            },
            onSessionEnded: (data) => {
              clientTimer.stopClientTimer();
              handleSessionEnded(data.reason || "Session has ended");
            },
            onRoleChange: (data) => {
              // Role change detection is now handled in onSessionUpdate
              // This handler just logs the notification message
            },
            onTopicSelectionNeeded: (data) => {
              setCompletedTopic(data.completedTopic || "");
              setAvailableTopics(data.availableTopics || []);
              setShowTopicSelectionDialog(true);
            },
          });
        } catch (wsError) {
          // Continue without WebSocket - session will still work with manual refresh
        }
      } catch (error) {
        // Check if it's an API response error
        if (error && typeof error === "object" && "response" in error) {
          const apiError = error as any;

          // Provide specific error messages based on status code
          if (apiError.response?.status === 404) {
            setError(
              `Session not found. Please verify the session code: ${sessionCode}`
            );
          } else if (apiError.response?.status === 401) {
            setError("Authentication failed. Please log in again.");
          } else if (apiError.response?.status === 403) {
            setError(
              "Access denied. You don't have permission to access this session."
            );
          } else if (apiError.response?.status >= 500) {
            setError(
              "Server error. Please try again later or contact support."
            );
          } else {
            setError(
              `Failed to load session data: ${
                apiError.response?.data?.error ||
                apiError.message ||
                "Unknown error"
              }`
            );
          }
        } else {
          setError(
            "Network error. Please check your connection and try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();

    return () => {
      try {
        disconnectWebSocket();
      } catch (error) {
        // Handle cleanup error silently
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
        "Patient presenting with medical condition",
      otherInformation:
        caseData.doctorNotes || "No additional background information provided",
      whatYouMustDo: "Assess the patient and discuss management with them",
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
                Reading Phase
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Review the patient information and prepare for the consultation
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Session Controls
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {(sessionData?.selectedCase?.visualData?.content ||
                  sessionData?.selectedCase?.imageUrl) && (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ImageIcon />}
                    onClick={() => setShowContentModal(true)}
                    sx={{ py: 1.5 }}
                  >
                    Examination Findings
                  </Button>
                )}
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
              </Box>
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

              {(sessionData?.selectedCase?.visualData?.content ||
                sessionData?.selectedCase?.imageUrl) && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Session Controls
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ImageIcon />}
                      onClick={() => setShowContentModal(true)}
                      sx={{ py: 1.5 }}
                    >
                      Examination Findings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </Container>
      );
    },
    [userRole, sessionData?.selectedCase, clientTimer]
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
            showContentModal={showContentModal}
            setShowContentModal={setShowContentModal}
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
                feedbackState={stableFeedbackProps.feedbackState}
                isSubmitting={stableFeedbackProps.isSubmitting}
                hasSubmitted={stableFeedbackProps.hasSubmitted}
                selectedCase={stableFeedbackProps.selectedCase}
                userRole={stableFeedbackProps.userRole}
                onFieldChange={stableFeedbackProps.onFieldChange}
                onSubmit={stableFeedbackProps.onSubmit}
                onSubmitWithRoleChange={
                  stableFeedbackProps.onSubmitWithRoleChange
                }
                validateObserverFeedback={
                  stableFeedbackProps.validateObserverFeedback
                }
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
        // Patient and Observer: Show only feedback form, no timer or consultation view
        return (
          <Container maxWidth="lg">
            <StableFeedbackComponent
              key={`stable-feedback-${sessionData.sessionCode}`}
              sessionCode={sessionData.sessionCode}
              phase={sessionData.phase}
              onSubmitSuccess={handleSubmitFeedback}
              visible={true}
              feedbackState={stableFeedbackProps.feedbackState}
              isSubmitting={stableFeedbackProps.isSubmitting}
              hasSubmitted={stableFeedbackProps.hasSubmitted}
              selectedCase={stableFeedbackProps.selectedCase}
              userRole={stableFeedbackProps.userRole}
              onFieldChange={stableFeedbackProps.onFieldChange}
              onSubmit={stableFeedbackProps.onSubmit}
              onSubmitWithRoleChange={
                stableFeedbackProps.onSubmitWithRoleChange
              }
              validateObserverFeedback={
                stableFeedbackProps.validateObserverFeedback
              }
            />
          </Container>
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
      <Helmet>
        <title>{`${sessionData.title || "Session"} – PLAB 2 Practice`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="canonical"
          href={`https://plab2practice.com/session/${sessionData.sessionCode}/room`}
        />
      </Helmet>
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              aria-label={audioEnabled ? "Mute sounds" : "Unmute sounds"}
              onClick={() => setAudioEnabled((v) => !v)}
            >
              {audioEnabled ? <AudioIcon /> : <MuteIcon />}
            </IconButton>
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

      {/* Patient Content Modal */}
      <Dialog
        open={showContentModal}
        onClose={() => setShowContentModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {sessionData?.selectedCase?.visualData?.type === "text"
                ? "Patient Information"
                : "Patient Image"}
            </Typography>
            <IconButton onClick={() => setShowContentModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            {(() => {
              const visualData = sessionData?.selectedCase?.visualData;
              const imageUrl = sessionData?.selectedCase?.imageUrl;

              // Use visualData if available, otherwise fall back to imageUrl
              if (visualData?.type === "text" && visualData.content) {
                return (
                  <Box sx={{ width: "100%", p: 2 }}>
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                    >
                      {visualData.content}
                    </Typography>
                  </Box>
                );
              } else if (
                (visualData?.type === "image" && visualData.content) ||
                imageUrl
              ) {
                const imageSrc = visualData?.content || imageUrl;
                return !imageError ? (
                  <img
                    src={
                      imageSrc?.startsWith("http")
                        ? imageSrc
                        : `${
                            import.meta.env.VITE_API_URL ||
                            "http://localhost:8080/api"
                          }${imageSrc}`
                    }
                    alt="Patient image"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
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
                      minHeight: "200px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: 1,
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 48, color: "#999" }} />
                    <Typography variant="body2" color="text.secondary">
                      Image could not be loaded
                    </Typography>
                  </Box>
                );
              } else {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "200px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: 1,
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 48, color: "#999" }} />
                    <Typography variant="body2" color="text.secondary">
                      No content available
                    </Typography>
                  </Box>
                );
              }
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowContentModal(false);
              setImageError(false); // Reset error state when closing modal
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>
          {sessionData?.phase === "feedback"
            ? "Complete Session"
            : "Exit Session"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {sessionData?.phase === "feedback"
              ? "Are you sure you want to complete your session? You will no longer be able to modify your feedback after this action."
              : "Are you sure you want to leave this session? Other participants will be notified and the session may end if there aren't enough participants remaining."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>Cancel</Button>
          <Button onClick={confirmExit} color="error" variant="contained">
            {sessionData?.phase === "feedback"
              ? "Complete My Session"
              : "Exit Session"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Observer Feedback Warning Dialog */}
      <Dialog
        open={showObserverWarningDialog}
        onClose={() => setShowObserverWarningDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Observer Feedback Pending</DialogTitle>
        <DialogContent>
          <Typography>
            The observer has not submitted their feedback yet. Do you want to
            wait for their feedback or continue anyway?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleObserverWarningWait} variant="outlined">
            Wait
          </Button>
          <Button
            onClick={handleObserverWarningContinue}
            color="primary"
            variant="contained"
          >
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Topic Selection Dialog */}
      <Dialog
        open={showTopicSelectionDialog}
        onClose={() => {}} // Prevent closing by clicking outside
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>🎉 Topic Completed!</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Congratulations! You have completed all cases in {completedTopic}.
          </Typography>

          {userRole === "doctor" ? (
            // Doctor sees topic selection options
            <>
              <Typography gutterBottom>
                {availableTopics.length > 0
                  ? "Choose a new topic to continue practicing:"
                  : "You have completed all available topics!"}
              </Typography>

              {availableTopics.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Available Topics:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {availableTopics.map((topic) => (
                      <Button
                        key={topic}
                        variant="outlined"
                        onClick={() => handleTopicSelection(topic)}
                        sx={{ justifyContent: "flex-start" }}
                      >
                        {topic}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
            </>
          ) : (
            // Patient and Observer see waiting message
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography gutterBottom>
                Please wait while the doctor selects a new topic to continue the
                session.
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2, alignSelf: "center" }}>
                  Waiting for doctor's selection...
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {userRole === "doctor" && (
            <Button
              onClick={handleSessionEnd}
              color="primary"
              variant="contained"
            >
              {availableTopics.length > 0 ? "End Session" : "Back to Dashboard"}
            </Button>
          )}
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
