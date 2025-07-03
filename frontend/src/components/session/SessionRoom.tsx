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
    hasCompleted?: boolean;
    hasGivenFeedback?: boolean;
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
    scenario?: string;
    doctorRole?: string;
    patientRole?: string;
    doctorNotes?: string;
    patientNotes?: string;
    observerNotes?: string;
    imageUrl?: string;
    category: {
      id: number;
      name: string;
    };
    difficulty?: string;
    duration?: number;
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
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
const StableFeedbackComponent = memo(
  ({
    sessionCode,
    phase,
    onSubmitSuccess,
    visible = true,
    // STABLE PROPS FROM PARENT - prevent re-renders and focus loss
    feedbackState,
    isSubmitting,
    hasSubmitted,
    selectedCase,
    onFieldChange, // Single stable handler
    onSubmit, // Single stable submit handler
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
    onFieldChange: (
      fieldName: string,
      value: string | number,
      subFieldId?: string
    ) => void;
    onSubmit: () => Promise<void>;
  }) => {
    // Debug logging to track component stability
    useEffect(() => {
      console.log("🔄 StableFeedbackComponent: Phase changed to", phase);
      console.log(
        "🔒 Component rendered with stable props - no focus loss expected"
      );
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

      return count > 0 ? totalScore / count : 0;
    }, [feedbackState.criteriaScores]);

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

      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          <ToggleButtonGroup
            value={value}
            exclusive
            onChange={(_, newValue) => onChange(newValue)}
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
            {[1, 2, 3, 4, 5].map((rating) => (
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
              ? "Live Feedback Rating"
              : "Consultation Feedback"}
          </Typography>

          {isConsultationPhase && (
            <Alert severity="info" sx={{ mb: 3 }}>
              You can rate in real-time during the consultation. Your ratings
              are automatically saved. The Submit button will appear once the
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
                  Overall Performance:{" "}
                  {calculateOverallPerformance().toFixed(1)}/5.0
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Automatically calculated from the criteria below
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
                                  const subScore =
                                    criteriaScore?.subScores.find(
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
                                          value={subScore?.score || null}
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
                                      💡 This criterion's score will be
                                      calculated as the average of its
                                      sub-criteria
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          ) : (
                            // Direct rating for criterion without sub-criteria
                            <Box sx={{ mb: 2 }}>
                              <RatingButtons
                                value={criteriaScore?.score || null}
                                onChange={(rating) =>
                                  onFieldChange(criterion.id, rating)
                                }
                                disabled={false}
                                label="Rating"
                              />
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  bgcolor: "#e8f5e8",
                                  borderRadius: 1,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  ⭐ Direct 1-5 rating scale
                                </Typography>
                              </Box>
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
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isComplete() || isSubmitting}
                  size="large"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
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

          {/* Status message during consultation */}
          {isConsultationPhase && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Rate criteria in real-time during the consultation. Your ratings
                are automatically saved. Submit button will appear when
                consultation ends.
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
    scenario?: string;
    doctorRole?: string;
    patientRole?: string;
    doctorNotes?: string;
    patientNotes?: string;
    observerNotes?: string;
    imageUrl?: string;
    category: {
      id: number;
      name: string;
    };
    difficulty?: string;
    duration?: number;
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
  } | null;
}

const PatientInformationCard: React.FC<PatientInformationCardProps> = ({
  userRole,
  selectedCase,
}) => {
  const theme = useTheme();
  const [showImageModal, setShowImageModal] = useState(false);

  if (!selectedCase) return null;

  const roleSpecificNotes = {
    DOCTOR: selectedCase.doctorNotes,
    PATIENT: selectedCase.patientNotes,
    OBSERVER: selectedCase.observerNotes,
  }[userRole];

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
      }}
    >
      <CardContent
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              {selectedCase.title}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={selectedCase.category.name}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              />
              {selectedCase.difficulty && (
                <Chip
                  size="small"
                  label={selectedCase.difficulty}
                  sx={{
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.main,
                  }}
                />
              )}
            </Box>
          </Box>
          {selectedCase.imageUrl && (
            <IconButton
              onClick={() => setShowImageModal(true)}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <ImageIcon color="primary" />
            </IconButton>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Scenario
          </Typography>
          <Typography variant="body2">
            {selectedCase.scenario || selectedCase.description}
          </Typography>
        </Box>

        {roleSpecificNotes && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {userRole.charAt(0) + userRole.slice(1).toLowerCase()} Notes
            </Typography>
            <Typography variant="body2">{roleSpecificNotes}</Typography>
          </Box>
        )}

        {selectedCase.sections && selectedCase.sections.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Additional Information
            </Typography>
            {selectedCase.sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <Box key={section.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{section.title}</Typography>
                  <Typography variant="body2">{section.content}</Typography>
                </Box>
              ))}
          </Box>
        )}
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
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
  selectedCase?: {
    id: number;
    title: string;
    description: string;
    scenario?: string;
    doctorRole?: string;
    patientRole?: string;
    doctorNotes?: string;
    patientNotes?: string;
    observerNotes?: string;
    imageUrl?: string;
    category: {
      id: number;
      name: string;
    };
    difficulty?: string;
    duration?: number;
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
  } | null;
}

const ConsultationView: React.FC<ConsultationViewProps> = ({
  userRole,
  clientTimer,
  buttonStates,
  onGiveFeedback,
  showImageModal,
  setShowImageModal,
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

              <TimerDisplay clientTimer={clientTimer} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                Time remaining for consultation
              </Typography>
            </CardContent>
          </Card>

          {/* Session Controls */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Session Controls
              </Typography>
              {selectedCase?.imageUrl && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ImageIcon />}
                  onClick={() => setShowImageModal(true)}
                  sx={{ py: 1.5, mb: 1 }}
                >
                  View Patient Image
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
                  {buttonStates.giveFeedback ? "Ending..." : "End Consultation"}
                </Button>
              )}
              {userRole === "observer" && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<FeedbackIcon />}
                  onClick={onGiveFeedback}
                  disabled={buttonStates.giveFeedback}
                  sx={{ py: 1.5 }}
                >
                  {buttonStates.giveFeedback ? "Loading..." : "Give Feedback"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Role
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userRole === "doctor" &&
                  "Lead the consultation, manage timing, and provide feedback."}
                {userRole === "patient" &&
                  "You will role-play as the patient during the consultation. Follow the scenario and respond naturally."}
                {userRole === "observer" &&
                  "Observe the consultation and provide feedback on the doctor's performance."}
              </Typography>
            </CardContent>
          </Card>
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // PERSISTENT FEEDBACK STATE - managed here to prevent loss during phase transitions
  const [persistentFeedbackState, setPersistentFeedbackState] =
    useState<FeedbackState>({
      criteriaScores: [],
      additionalComments: "",
    });
  const [persistentIsSubmitting, setPersistentIsSubmitting] = useState(false);
  const [persistentHasSubmitted, setPersistentHasSubmitted] = useState(false);

  // Initialize feedback criteria scores when session data loads
  useEffect(() => {
    if (
      sessionData?.selectedCase?.feedbackCriteria &&
      persistentFeedbackState.criteriaScores.length === 0
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
      console.log(
        `📝 Field changed: ${fieldName} = ${value}`,
        subFieldId ? `(sub: ${subFieldId})` : ""
      );

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
  const handleFeedbackSubmit = useCallback(async () => {
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
      console.log("❌ Cannot submit: Not all criteria have scores");
      return;
    }

    console.log("🚀 Submitting feedback with stable handler...");
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
      };

      console.log("📤 Feedback data being submitted:", feedbackData);
      await submitFeedback(sessionCode!, feedbackData);

      setPersistentHasSubmitted(true);
      console.log("✅ Feedback submitted successfully");

      // Disconnect WebSocket and navigate to dashboard
      disconnectWebSocket();

      // Small delay to ensure cleanup, then navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      console.error("❌ Failed to submit feedback:", error);
    } finally {
      setPersistentIsSubmitting(false);
    }
  }, [
    persistentIsSubmitting,
    persistentHasSubmitted,
    persistentFeedbackState,
    sessionCode,
    navigate,
  ]);

  // Note: stableFeedbackProps will be defined after handleCompleteSession

  // Debug: Track feedback state preservation (reduced logging to prevent spam)
  useEffect(() => {
    if (sessionData?.phase) {
      console.log("🔄 Main component: Phase changed to", sessionData.phase);
      console.log(
        "💾 Persistent feedback state preserved:",
        persistentFeedbackState.criteriaScores.length > 0 ||
          persistentFeedbackState.additionalComments.length > 0
      );
      console.log(
        "📊 Criteria scores count:",
        persistentFeedbackState.criteriaScores.length
      );
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

          // Update session data with new phase and case
          setSessionData((prev) =>
            prev
              ? {
                  ...prev,
                  phase: session.phase?.toLowerCase() || prev.phase,
                  participants: session.participants || prev.participants,
                  selectedCase: session.selectedCase || prev.selectedCase,
                }
              : null
          );

          // Start timer if in reading phase
          if (
            session.phase?.toLowerCase() === "reading" &&
            session.readingTime
          ) {
            console.log("Starting timer from polling response");
            clientTimer.startClientTimer(
              session.readingTime * 60,
              Date.now(),
              "reading"
            );
          }
        } catch (pollError) {
          console.error("Failed to poll session updates:", pollError);
          setError("Failed to get session updates. Please refresh the page.");
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
  }, [sessionCode, user, clientTimer]);

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

    // Set button loading state
    setButtonStates((prev) => ({ ...prev, newCase: true }));

    try {
      console.log("Requesting new case for session:", sessionData.sessionCode);
      await requestNewCase(sessionData.sessionCode);
      console.log("New case requested successfully");

      // The WebSocket handler will update the session data with the new case
      // and trigger the phase change automatically
    } catch (error: any) {
      console.error("Failed to request new case:", error);
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
  }, [sessionData, clientTimer]);

  const handleSubmitFeedback = useCallback(async () => {
    // This is a placeholder - the actual feedback submission is handled by IndependentFeedbackComponent
    console.log("Submit feedback called from main component");
  }, []);

  // STABLE PROPS OBJECT - memoized to prevent unnecessary re-renders
  // Defined after handleCompleteSession to avoid hoisting issues
  const stableFeedbackProps = useMemo(
    () => ({
      feedbackState: persistentFeedbackState,
      isSubmitting: persistentIsSubmitting,
      hasSubmitted: persistentHasSubmitted,
      selectedCase: sessionData?.selectedCase,
      onFieldChange: handleFieldChange,
      onSubmit: handleFeedbackSubmit,
    }),
    [
      persistentFeedbackState,
      persistentIsSubmitting,
      persistentHasSubmitted,
      sessionData?.selectedCase,
      handleFieldChange,
      handleFeedbackSubmit,
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
          console.log("Individual session completed via exit");
        } else {
          // Diğer phase'lerde normal leave session
          await leaveSession(sessionCode);
        }
      }
      disconnectWebSocket();
    } catch (error) {
      console.error("Error exiting session:", error);
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

        console.log("Session data received:", session);

        // Update user role from backend if available
        if (session.userRole) {
          const backendRole = session.userRole.toLowerCase() as SessionRole;
          if (backendRole !== userRole) {
            console.log("Updating user role from backend:", backendRole);
            setUserRole(backendRole);
          }
        }

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
          const totalDurationSeconds =
            initialSessionData.phase === "reading"
              ? session.readingTime * 60
              : session.consultationTime * 60;

          // Use backend's timeRemaining if available, otherwise use full duration
          const remainingSeconds =
            session.timeRemaining || totalDurationSeconds;

          // Calculate start timestamp based on elapsed time
          const elapsedSeconds = totalDurationSeconds - remainingSeconds;
          const startTimestamp = Date.now() - elapsedSeconds * 1000;

          console.log("Resume timer:", {
            phase: initialSessionData.phase,
            totalDurationSeconds,
            remainingSeconds,
            elapsedSeconds,
            startTimestamp,
          });

          clientTimer.startClientTimer(
            totalDurationSeconds,
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

              // Force a re-render by creating a new object
              setSessionData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  phase: data.phase.toLowerCase(),
                  participants: [...(prev.participants || [])],
                  config: { ...prev.config },
                  selectedCase: prev.selectedCase
                    ? { ...prev.selectedCase }
                    : null,
                };
              });

              // Stop any existing timer
              clientTimer.stopClientTimer();

              // Start timer if duration is provided
              if (data.durationSeconds && data.durationSeconds > 0) {
                console.log(
                  "Starting client-side timer for phase:",
                  data.phase,
                  "duration:",
                  data.durationSeconds,
                  "startTimestamp:",
                  data.startTimestamp
                );
                clientTimer.startClientTimer(
                  data.durationSeconds,
                  data.startTimestamp || Date.now(),
                  data.phase.toLowerCase()
                );
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
        "Patient presenting with medical condition",
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
                {sessionData?.selectedCase?.imageUrl && (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ImageIcon />}
                    onClick={() => setShowImageModal(true)}
                    sx={{ py: 1.5 }}
                  >
                    View Patient Image
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

              {sessionData?.selectedCase?.imageUrl && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Session Controls
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ImageIcon />}
                      onClick={() => setShowImageModal(true)}
                      sx={{ py: 1.5 }}
                    >
                      View Patient Image
                    </Button>
                  </CardContent>
                </Card>
              )}

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
            showImageModal={showImageModal}
            setShowImageModal={setShowImageModal}
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
        // Patient and Observer: Show only feedback form, no timer or consultation view
        return (
          <Container maxWidth="lg">
            <StableFeedbackComponent
              key={`stable-feedback-${sessionData.sessionCode}`}
              sessionCode={sessionData.sessionCode}
              phase={sessionData.phase}
              onSubmitSuccess={handleSubmitFeedback}
              visible={true}
              {...stableFeedbackProps}
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

      {/* Patient Image Modal */}
      <Dialog
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Patient Image</Typography>
            <IconButton onClick={() => setShowImageModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            {sessionData?.selectedCase?.imageUrl && !imageError ? (
              <img
                src={
                  sessionData.selectedCase.imageUrl?.startsWith("http")
                    ? sessionData.selectedCase.imageUrl
                    : `${
                        import.meta.env.VITE_API_URL ||
                        "http://localhost:8080/api"
                      }${sessionData.selectedCase.imageUrl}`
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
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowImageModal(false);
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
    </Box>
  );
};

// Main Session Room Component with Client-Side Timer Architecture
const SessionRoom: React.FC = () => {
  return <SessionRoomMain />;
};

export default SessionRoom;
