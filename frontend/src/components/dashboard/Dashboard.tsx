import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Rating,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  api,
  getReceivedFeedback,
  getUserActiveSessions,
} from "../../services/api";
import { Helmet } from "react-helmet-async";

interface ActiveSession {
  id: number;
  title: string;
  code: string;
  status: string;
  phase: string;
  userRole: string;
  isHost: boolean;
  participantCount: number;
  createdAt: string;
}

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

interface Feedback {
  id: number;
  sessionId: number;
  sessionCode: string;
  sessionTitle: string;
  fromUser: string;
  fromUserEmail: string;
  fromUserRole: string;
  comment: string;
  overallPerformance: number;
  timestamp: string;
  caseTitle: string;
  caseId: number | null;
  category: string;
  roundNumber: number;
  criteriaScores: FeedbackCriteriaScore[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to calculate maximum possible score for a feedback
  const calculateMaxScore = (criteriaScores: FeedbackCriteriaScore[]) => {
    return criteriaScores.length * 4; // Each criterion can score up to 4
  };

  // Helper function to get performance percentage (for color thresholds)
  const getPerformancePercentage = (score: number, maxScore: number) => {
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  };

  // Helper function to calculate main criterion score when it has sub-criteria
  const getMainCriterionScore = (criteria: FeedbackCriteriaScore) => {
    if (criteria.score !== null) {
      return criteria.score;
    }

    // If main score is null but there are sub-scores, calculate average
    if (criteria.subScores && criteria.subScores.length > 0) {
      const validSubScores = criteria.subScores.filter(
        (sub) => sub.score !== null
      );
      if (validSubScores.length > 0) {
        const sum = validSubScores.reduce(
          (total, sub) => total + (sub.score || 0),
          0
        );
        return sum / validSubScores.length;
      }
    }

    return null;
  };

  // Helper function to format timestamp with both date and time
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // This shows both date and time
  };

  const fetchDashboardData = async (showLoader = false) => {
    if (showLoader) setIsRefreshing(true);
    try {
      const [feedbackResponse, activeSessionsResponse] = await Promise.all([
        getReceivedFeedback(),
        getUserActiveSessions(),
      ]);
      setFeedback(feedbackResponse.data);
      setActiveSessions(activeSessionsResponse.data);
    } catch (error) {
    } finally {
      if (showLoader) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll for new feedback every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleResumeSession = (sessionCode: string) => {
    navigate(`/session/${sessionCode}/room`);
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #faf5ff 50%, #fff1f2 100%)",
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Helmet>
          <title>Dashboard – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, nofollow" />
          <link rel="canonical" href="https://plab2practice.com/dashboard" />
        </Helmet>
        <Box sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3} alignItems="center" sx={{ mb: 4 }}>
            <Grid item xs>
              <Typography variant="h4" component="h1">
                Dashboard
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={isRefreshing}
                sx={{
                  mr: 2,
                  borderColor: "#93c5fd",
                  color: "#1d4ed8",
                  "&:hover": {
                    borderColor: "#6366f1",
                    backgroundColor: "#eff6ff",
                  },
                }}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate("/session/join")}
                sx={{
                  mr: 2,
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
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/session/configure")}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#fff",
                  background:
                    "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow: "0 10px 20px rgba(34,197,94,0.25)",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 14px 24px rgba(34,197,94,0.3)",
                    background:
                      "linear-gradient(90deg, #16a34a 0%, #15803d 100%)",
                  },
                }}
              >
                Create Session
              </Button>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <Grid item xs={12}>
                <Card
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(6px)",
                    boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: "bold", color: "#1d4ed8" }}
                    >
                      🔴 Active Sessions - Resume Now
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      You have active session(s) that you can rejoin:
                    </Typography>
                    <List>
                      {activeSessions.map((session, index) => (
                        <React.Fragment key={session.id}>
                          {index > 0 && <Divider />}
                          <ListItem
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: "rgba(59,130,246,0.06)",
                              },
                              borderRadius: 1,
                              mb: 1,
                            }}
                            onClick={() => handleResumeSession(session.code)}
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight="medium"
                                  >
                                    {session.title}
                                  </Typography>
                                  <Chip
                                    label={session.phase.toUpperCase()}
                                    size="small"
                                    color={
                                      session.phase === "waiting"
                                        ? "warning"
                                        : "primary"
                                    }
                                  />
                                  <Chip
                                    label={session.userRole.toUpperCase()}
                                    size="small"
                                    variant="outlined"
                                  />
                                  {session.isHost && (
                                    <Chip
                                      label="HOST"
                                      size="small"
                                      color="secondary"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.primary"
                                  >
                                    Session Code: {session.code} •{" "}
                                    {session.participantCount} participants
                                  </Typography>
                                  <br />
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Started:{" "}
                                    {new Date(
                                      session.createdAt
                                    ).toLocaleString()}
                                  </Typography>
                                </>
                              }
                            />
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeSession(session.code);
                              }}
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
                              Resume Session
                            </Button>
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Feedback Received */}
            <Grid item xs={12}>
              <Card
                sx={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Feedback Received
                  </Typography>
                  {feedback.length === 0 ? (
                    <Alert severity="info">
                      No feedback received yet. Complete some sessions as a
                      doctor to start receiving feedback.
                    </Alert>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      {feedback.map((item, index) => (
                        <Card
                          key={item.id}
                          sx={{
                            mb: 2,
                            border: "1px solid #e5e7eb",
                            borderLeft: `6px solid ${
                              (item.overallPerformance ?? 0) >= 8.1
                                ? "#22c55e"
                                : (item.overallPerformance ?? 0) >= 4.1
                                ? "#f59e0b"
                                : "#ef4444"
                            }`,
                            borderRadius: 2,
                            backgroundColor: "rgba(255,255,255,0.75)",
                            backdropFilter: "blur(4px)",
                            boxShadow: "0 8px 16px rgba(2,6,23,0.06)",
                          }}
                        >
                          <CardContent>
                            {/* Header with case info and overall rating */}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                mb: 2,
                              }}
                            >
                              <Box>
                                <Typography
                                  variant="h6"
                                  component="div"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <StarIcon color="primary" />
                                  {item.caseTitle}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {item.category} • Session: {item.sessionCode}{" "}
                                  • Round: {item.roundNumber}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: "right" }}>
                                <Typography
                                  variant="h4"
                                  sx={{
                                    fontWeight: "bold",
                                    background:
                                      "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  }}
                                >
                                  {item.overallPerformance?.toFixed(1) || "0"}/
                                  {calculateMaxScore(item.criteriaScores)}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Feedback provider info */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                mb: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              <Chip
                                label={`From: ${item.fromUser}`}
                                variant="outlined"
                                size="small"
                              />
                              <Chip
                                label={item.fromUserRole.toUpperCase()}
                                color={
                                  item.fromUserRole === "patient"
                                    ? "primary"
                                    : "secondary"
                                }
                                size="small"
                              />
                              <Chip
                                label={formatTimestamp(item.timestamp)}
                                variant="outlined"
                                size="small"
                              />
                            </Box>

                            {/* Comments */}
                            {item.comment && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Comments:
                                </Typography>
                                <Paper
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: "1px solid #e5e7eb",
                                    backgroundColor: "rgba(249,250,251,0.8)",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    style={{ fontStyle: "italic" }}
                                  >
                                    "{item.comment}"
                                  </Typography>
                                </Paper>
                              </Box>
                            )}

                            {/* Detailed Criteria Breakdown */}
                            {item.criteriaScores &&
                              item.criteriaScores.length > 0 && (
                                <Accordion
                                  sx={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 2,
                                  }}
                                >
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                      backgroundColor: "rgba(59,130,246,0.06)",
                                      "&:hover": {
                                        backgroundColor: "rgba(59,130,246,0.1)",
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      sx={{ fontWeight: "medium" }}
                                    >
                                      📊 Detailed Criteria Scores (
                                      {item.criteriaScores.length} criteria)
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TableContainer
                                      component={Paper}
                                      variant="outlined"
                                      sx={{ borderRadius: 2 }}
                                    >
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow
                                            sx={{
                                              backgroundColor:
                                                "rgba(0,0,0,0.02)",
                                            }}
                                          >
                                            <TableCell
                                              sx={{ fontWeight: "bold" }}
                                            >
                                              Criterion
                                            </TableCell>
                                            <TableCell
                                              align="center"
                                              sx={{ fontWeight: "bold" }}
                                            >
                                              Score
                                            </TableCell>
                                            <TableCell
                                              align="center"
                                              sx={{ fontWeight: "bold" }}
                                            >
                                              Rating
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {item.criteriaScores.map(
                                            (criteria) => (
                                              <React.Fragment
                                                key={criteria.criterionId}
                                              >
                                                {/* Main criterion */}
                                                <TableRow>
                                                  <TableCell
                                                    sx={{
                                                      fontWeight: "medium",
                                                    }}
                                                  >
                                                    {criteria.criterionName}
                                                  </TableCell>
                                                  <TableCell align="center">
                                                    <Typography
                                                      variant="h6"
                                                      color={
                                                        (getMainCriterionScore(
                                                          criteria
                                                        ) ?? 0) >= 3.2
                                                          ? "success.main"
                                                          : (getMainCriterionScore(
                                                              criteria
                                                            ) ?? 0) >= 2.4
                                                          ? "warning.main"
                                                          : "error.main"
                                                      }
                                                      sx={{
                                                        fontWeight: "bold",
                                                      }}
                                                    >
                                                      {getMainCriterionScore(
                                                        criteria
                                                      )?.toFixed(1) || "N/A"}
                                                    </Typography>
                                                  </TableCell>
                                                  <TableCell align="center">
                                                    <Rating
                                                      value={
                                                        getMainCriterionScore(
                                                          criteria
                                                        ) || 0
                                                      }
                                                      max={4}
                                                      readOnly
                                                      size="small"
                                                      precision={0.1}
                                                    />
                                                  </TableCell>
                                                </TableRow>

                                                {/* Sub-criteria if any */}
                                                {criteria.subScores &&
                                                  criteria.subScores.length >
                                                    0 &&
                                                  criteria.subScores.map(
                                                    (subCriteria) => (
                                                      <TableRow
                                                        key={
                                                          subCriteria.subCriterionId
                                                        }
                                                        sx={{
                                                          backgroundColor:
                                                            "grey.50",
                                                        }}
                                                      >
                                                        <TableCell
                                                          sx={{
                                                            pl: 4,
                                                            fontStyle: "italic",
                                                          }}
                                                        >
                                                          ↳{" "}
                                                          {
                                                            subCriteria.subCriterionName
                                                          }
                                                        </TableCell>
                                                        <TableCell align="center">
                                                          <Typography
                                                            variant="body2"
                                                            color={
                                                              (subCriteria.score ??
                                                                0) >= 3.2
                                                                ? "success.main"
                                                                : (subCriteria.score ??
                                                                    0) >= 2.4
                                                                ? "warning.main"
                                                                : "error.main"
                                                            }
                                                            sx={{
                                                              fontWeight:
                                                                "medium",
                                                            }}
                                                          >
                                                            {subCriteria.score?.toFixed(
                                                              1
                                                            ) || "N/A"}
                                                          </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                          <Rating
                                                            value={
                                                              subCriteria.score
                                                            }
                                                            max={4}
                                                            readOnly
                                                            size="small"
                                                            precision={0.1}
                                                          />
                                                        </TableCell>
                                                      </TableRow>
                                                    )
                                                  )}
                                              </React.Fragment>
                                            )
                                          )}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </AccordionDetails>
                                </Accordion>
                              )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;
