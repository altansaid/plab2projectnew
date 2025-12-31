import React, { memo, useCallback } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from "@mui/material";
import { Send as SendIcon, Refresh as NewCaseIcon } from "@mui/icons-material";

/**
 * Feedback criterion interface
 */
export interface FeedbackCriterion {
  id: string;
  name: string;
  order: number;
  hasSubCriteria: boolean;
  subCriteria: Array<{
    id: string;
    name: string;
    order: number;
  }>;
}

/**
 * Criteria score interface
 */
export interface FeedbackCriteriaScore {
  criterionId: string;
  criterionName: string;
  score: number | null;
  subScores: Array<{
    subCriterionId: string;
    subCriterionName: string;
    score: number | null;
  }>;
}

/**
 * Feedback state interface
 */
export interface FeedbackState {
  criteriaScores: FeedbackCriteriaScore[];
  additionalComments: string;
}

/**
 * FeedbackPanel component props
 */
interface FeedbackPanelProps {
  sessionCode: string;
  phase: "waiting" | "reading" | "consultation" | "feedback" | "completed";
  feedbackState: FeedbackState;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  feedbackCriteria?: FeedbackCriterion[];
  userRole?: string;
  onFieldChange: (fieldName: string, value: string | number, subFieldId?: string) => void;
  onSubmit: (startNewCase?: boolean) => Promise<void>;
  onSubmitWithRoleChange?: () => Promise<void>;
  validateObserverFeedback?: (actionType: "newCase" | "roleChange") => Promise<boolean>;
  visible?: boolean;
}

/**
 * Rating buttons component for scoring
 */
const RatingButtons = memo(({
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
        onChange={(_, newValue) => {
          if (newValue !== null) {
            onChange(newValue);
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
          <ToggleButton key={rating} value={rating} aria-label={`${rating} stars`}>
            {rating}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
});

RatingButtons.displayName = "RatingButtons";

/**
 * FeedbackPanel component - handles feedback submission during consultation/feedback phases
 */
const FeedbackPanel = memo(({
  phase,
  feedbackState,
  isSubmitting,
  hasSubmitted,
  feedbackCriteria,
  onFieldChange,
  onSubmit,
  onSubmitWithRoleChange,
  validateObserverFeedback,
  visible = true,
}: FeedbackPanelProps) => {
  const theme = useTheme();

  // Handle comment change
  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("additionalComments", event.target.value);
    },
    [onFieldChange]
  );

  // Calculate overall performance score
  const calculateOverallPerformance = useCallback(() => {
    if (!feedbackState.criteriaScores.length) return 0;

    let totalScore = 0;
    let count = 0;

    feedbackState.criteriaScores.forEach((criteria) => {
      if (criteria.score !== null) {
        totalScore += criteria.score;
        count++;
      } else if (criteria.subScores.length > 0) {
        const validSubScores = criteria.subScores.filter((sub) => sub.score !== null);
        if (validSubScores.length > 0) {
          const subAverage =
            validSubScores.reduce((sum, sub) => sum + (sub.score || 0), 0) / validSubScores.length;
          totalScore += subAverage;
          count++;
        }
      }
    });

    return totalScore;
  }, [feedbackState.criteriaScores]);

  // Calculate max possible score
  const calculateMaxPossibleScore = useCallback(() => {
    if (!feedbackCriteria?.length) return 0;
    return feedbackCriteria.length * 4;
  }, [feedbackCriteria]);

  // Check if all criteria have scores
  const isComplete = useCallback(() => {
    if (!feedbackCriteria?.length) return false;

    return feedbackState.criteriaScores.every((criteria) => {
      if (criteria.subScores.length > 0) {
        return criteria.subScores.every((sub) => sub.score !== null);
      }
      return criteria.score !== null;
    });
  }, [feedbackState.criteriaScores, feedbackCriteria]);

  // Submit handlers
  const handleSubmit = useCallback(
    async (startNewCase = false) => {
      await onSubmit(startNewCase);
    },
    [onSubmit]
  );

  const handleSubmitWithNewCase = useCallback(async () => {
    if (validateObserverFeedback) {
      const canProceed = await validateObserverFeedback("newCase");
      if (!canProceed) {
        return;
      }
    }
    await handleSubmit(true);
  }, [validateObserverFeedback, handleSubmit]);

  const handleSubmitWithRoleChangeValidated = useCallback(async () => {
    if (validateObserverFeedback) {
      const canProceed = await validateObserverFeedback("roleChange");
      if (!canProceed) {
        return;
      }
    }
    if (onSubmitWithRoleChange) {
      await onSubmitWithRoleChange();
    }
  }, [validateObserverFeedback, onSubmitWithRoleChange]);

  // Don't render if not visible or wrong phase
  if (!visible || (phase !== "consultation" && phase !== "feedback")) {
    return null;
  }

  const isConsultationPhase = phase === "consultation";
  const isFeedbackPhase = phase === "feedback";

  // Already submitted state
  if (hasSubmitted) {
    return (
      <Card sx={{ borderRadius: 2 }}>
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
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #e5e7eb",
        backgroundColor: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(6px)",
        boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isConsultationPhase ? "Live Feedback Rating" : "Consultation Feedback"}
        </Typography>

        {isConsultationPhase && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You can rate in real-time during the consultation. Your ratings are saved automatically.
          </Alert>
        )}

        {/* Criteria scoring */}
        {feedbackCriteria && feedbackCriteria.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {feedbackCriteria
              .sort((a, b) => a.order - b.order)
              .map((criterion) => {
                const criteriaScore = feedbackState.criteriaScores.find(
                  (cs) => cs.criterionId === criterion.id
                );

                if (criterion.hasSubCriteria && criterion.subCriteria.length > 0) {
                  // Render sub-criteria
                  return (
                    <Box key={criterion.id} sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}
                      >
                        {criterion.name}
                      </Typography>
                      {criterion.subCriteria
                        .sort((a, b) => a.order - b.order)
                        .map((subCriterion) => {
                          const subScore = criteriaScore?.subScores.find(
                            (ss) => ss.subCriterionId === subCriterion.id
                          );
                          return (
                            <RatingButtons
                              key={subCriterion.id}
                              label={subCriterion.name}
                              value={subScore?.score ?? null}
                              onChange={(rating) =>
                                onFieldChange(criterion.id, rating, subCriterion.id)
                              }
                              disabled={isSubmitting}
                            />
                          );
                        })}
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  );
                }

                // Render main criterion
                return (
                  <RatingButtons
                    key={criterion.id}
                    label={criterion.name}
                    value={criteriaScore?.score ?? null}
                    onChange={(rating) => onFieldChange(criterion.id, rating)}
                    disabled={isSubmitting}
                  />
                );
              })}
          </Box>
        )}

        {/* Overall score display */}
        {feedbackCriteria && feedbackCriteria.length > 0 && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall Score
            </Typography>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 600 }}>
              {calculateOverallPerformance().toFixed(0)} / {calculateMaxPossibleScore()}
            </Typography>
          </Box>
        )}

        {/* Additional comments */}
        <TextField
          label="Additional Comments (Optional)"
          multiline
          rows={4}
          fullWidth
          value={feedbackState.additionalComments}
          onChange={handleCommentChange}
          disabled={isSubmitting}
          placeholder="Share any additional feedback or observations..."
          sx={{ mb: 3 }}
        />

        {/* Action buttons */}
        {isFeedbackPhase && (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !isComplete()}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSubmitWithNewCase}
              disabled={isSubmitting || !isComplete()}
              startIcon={<NewCaseIcon />}
            >
              Submit & New Case
            </Button>

            {onSubmitWithRoleChange && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleSubmitWithRoleChangeValidated}
                disabled={isSubmitting || !isComplete()}
              >
                Submit & Change Roles
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

FeedbackPanel.displayName = "FeedbackPanel";

export default FeedbackPanel;


