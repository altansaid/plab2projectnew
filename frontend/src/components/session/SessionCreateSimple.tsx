import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, CircularProgress, TextField } from "@mui/material";
import { createSession } from "../../services/api";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";

const SessionCreateSimple: React.FC = () => {
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sessionTitle.trim()) {
      setError("Please enter a session title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create session using the real API
      const response = await createSession({
        title: sessionTitle,
        sessionType: "TOPIC",
        readingTime: 2,
        consultationTime: 8,
        timingType: "COUNTDOWN",
        selectedTopics: ["Random"],
      });

      if (response.data.sessionCode) {
        // Navigate directly to configuration since host is automatically the doctor
        navigate(`/session/${response.data.sessionCode}/configure`, {
          state: {
            sessionTitle,
            role: "doctor", // Host is always the doctor
            isHost: true,
          },
        });
      } else {
        setError("Failed to create session");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create session";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <Helmet>
        <title>Create Session – PLAB 2 Practice</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://plab2practice.com/session/create" />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Create New PLAB 2 Practice Session
          </h1>
          <p className="text-gray-600">
            Enter a title for your practice session
          </p>
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <TextField
              fullWidth
              label="Session Title"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Enter a title for your session"
              variant="outlined"
              helperText="Give your session a descriptive name"
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  "& fieldset": {
                    borderColor: "#93c5fd", // blue-300 default
                  },
                  "&:hover fieldset": {
                    borderColor: "#6366f1", // indigo-500 on hover
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6", // blue-500 when focused
                    borderWidth: 2,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#3b82f6",
                },
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => navigate("/")}
              disabled={loading}
              className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!sessionTitle.trim() || loading}
              className="group inline-flex items-center px-6 py-2.5 rounded-full font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center">
                  <CircularProgress size={18} sx={{ color: "#fff", mr: 1 }} />
                  Creating...
                </span>
              ) : (
                <>
                  Create Session
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCreateSimple;
