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
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { api, getReceivedFeedback } from "../../services/api";

interface SessionHistory {
  id: string;
  date: string;
  role: string;
  category: string;
  participants: { username: string; role: string }[];
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
  score: number;
  timestamp: string;
  caseTitle: string;
  caseId: number | null;
  category: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [sessionsResponse, feedbackResponse] = await Promise.all([
          api.get("/sessions/history"),
          getReceivedFeedback(),
        ]);
        setSessions(sessionsResponse.data);
        setFeedback(feedbackResponse.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

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
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/session/create")}
            >
              Create Session
            </Button>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* Session History */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sessions
                </Typography>
                <List>
                  {sessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemText
                          primary={`${session.category} - ${session.role}`}
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                              >
                                {new Date(session.date).toLocaleDateString()}
                              </Typography>
                              {" — "}
                              {session.participants
                                .map((p) => `${p.username} (${p.role})`)
                                .join(", ")}
                            </>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Feedback Received */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback Received
                </Typography>
                {feedback.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No feedback received yet. Complete some sessions to start
                    receiving feedback.
                  </Typography>
                ) : (
                  <List>
                    {feedback.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {index > 0 && <Divider />}
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  component="span"
                                  variant="subtitle2"
                                >
                                  {item.caseTitle}
                                </Typography>
                                <Chip
                                  label={item.fromUserRole}
                                  size="small"
                                  color={
                                    item.fromUserRole === "patient"
                                      ? "primary"
                                      : "secondary"
                                  }
                                  sx={{ textTransform: "capitalize" }}
                                />
                                <Rating
                                  value={item.score}
                                  readOnly
                                  size="small"
                                  sx={{ ml: "auto" }}
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography
                                  component="div"
                                  variant="body2"
                                  color="text.primary"
                                  sx={{ mt: 1 }}
                                >
                                  <strong>From:</strong> {item.fromUser} •{" "}
                                  <strong>Session:</strong> {item.sessionCode}
                                </Typography>
                                <Typography
                                  component="div"
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, mb: 1 }}
                                >
                                  {new Date(
                                    item.timestamp
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    item.timestamp
                                  ).toLocaleTimeString()}
                                </Typography>
                                <Typography
                                  component="div"
                                  variant="body2"
                                  sx={{
                                    mt: 1,
                                    p: 1.5,
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: 1,
                                    border: "1px solid #e9ecef",
                                  }}
                                >
                                  "{item.comment}"
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
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
