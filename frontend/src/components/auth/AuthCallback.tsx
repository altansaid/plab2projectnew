import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";
import { supabase } from "../../lib/supabase";
import {
  signInSuccess,
  signInFailure,
} from "../../features/auth/supabaseAuthSlice";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          dispatch(signInFailure(error.message));
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (data.session?.user) {
          const user = {
            id: data.session.user.id,
            email: data.session.user.email!,
            name:
              data.session.user.user_metadata?.name ||
              data.session.user.user_metadata?.full_name ||
              data.session.user.email!.split("@")[0],
          };

          dispatch(signInSuccess({ session: data.session, user }));

          // Redirect to dashboard
          navigate("/dashboard", { replace: true });
        } else {
          setError("No session found after authentication");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err: any) {
        console.error("Unexpected error in auth callback:", err);
        setError(err.message || "An unexpected error occurred");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, dispatch]);

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          Authentication failed: {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="body1">Completing authentication...</Typography>
    </Box>
  );
};

export default AuthCallback;
