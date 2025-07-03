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
  criteriaScores: FeedbackCriteriaScore[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

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
      console.error("Failed to fetch dashboard data:", error);
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
    <Container maxWidth="lg">
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
              sx={{ mr: 2 }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/session/create")}
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
                sx={{ border: "2px solid #1976d2", backgroundColor: "#e3f2fd" }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    color="primary"
                    sx={{ fontWeight: "bold" }}
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
                              backgroundColor: "rgba(25, 118, 210, 0.08)",
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
                                  {new Date(session.createdAt).toLocaleString()}
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
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback Received
                </Typography>
                {feedback.length === 0 ? (
                  <Alert severity="info">
                    No feedback received yet. Complete some sessions as a doctor
                    to start receiving feedback.
                  </Alert>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    {feedback.map((item, index) => (
                      <Card
                        key={item.id}
                        variant="outlined"
                        sx={{
                          mb: 2,
                          border: "2px solid",
                          borderColor:
                            item.overallPerformance >= 4
                              ? "success.main"
                              : item.overallPerformance >= 3
                              ? "warning.main"
                              : "error.main",
                          backgroundColor:
                            item.overallPerformance >= 4
                              ? "success.50"
                              : item.overallPerformance >= 3
                              ? "warning.50"
                              : "error.50",
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
                                {item.category} • Session: {item.sessionCode}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography
                                variant="h4"
                                color="primary"
                                sx={{ fontWeight: "bold" }}
                              >
                                {item.overallPerformance?.toFixed(1) || "N/A"}
                              </Typography>
                              <Rating
                                value={item.overallPerformance}
                                readOnly
                                size="small"
                                precision={0.1}
                              />
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
                              label={new Date(
                                item.timestamp
                              ).toLocaleDateString()}
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
                                  backgroundColor: "grey.50",
                                  border: "1px solid",
                                  borderColor: "grey.200",
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
                              <Accordion>
                                <AccordionSummary
                                  expandIcon={<ExpandMoreIcon />}
                                  sx={{
                                    backgroundColor: "rgba(0,0,0,0.03)",
                                    "&:hover": {
                                      backgroundColor: "rgba(0,0,0,0.05)",
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
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow
                                          sx={{ backgroundColor: "grey.100" }}
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
                                        {item.criteriaScores.map((criteria) => (
                                          <React.Fragment
                                            key={criteria.criterionId}
                                          >
                                            {/* Main criterion */}
                                            <TableRow>
                                              <TableCell
                                                sx={{ fontWeight: "medium" }}
                                              >
                                                {criteria.criterionName}
                                              </TableCell>
                                              <TableCell align="center">
                                                <Typography
                                                  variant="h6"
                                                  color={
                                                    (criteria.score ?? 0) >= 4
                                                      ? "success.main"
                                                      : (criteria.score ?? 0) >=
                                                        3
                                                      ? "warning.main"
                                                      : "error.main"
                                                  }
                                                  sx={{ fontWeight: "bold" }}
                                                >
                                                  {criteria.score?.toFixed(1) ||
                                                    "N/A"}
                                                </Typography>
                                              </TableCell>
                                              <TableCell align="center">
                                                <Rating
                                                  value={criteria.score}
                                                  readOnly
                                                  size="small"
                                                  precision={0.1}
                                                />
                                              </TableCell>
                                            </TableRow>

                                            {/* Sub-criteria if any */}
                                            {criteria.subScores &&
                                              criteria.subScores.length > 0 &&
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
                                                            0) >= 4
                                                            ? "success.main"
                                                            : (subCriteria.score ??
                                                                0) >= 3
                                                            ? "warning.main"
                                                            : "error.main"
                                                        }
                                                        sx={{
                                                          fontWeight: "medium",
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
                                                        readOnly
                                                        size="small"
                                                        precision={0.1}
                                                      />
                                                    </TableCell>
                                                  </TableRow>
                                                )
                                              )}
                                          </React.Fragment>
                                        ))}
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
  );
};

export default Dashboard;
