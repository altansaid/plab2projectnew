import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  Stack,
} from "@mui/material";
import { Lock } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { Helmet } from "react-helmet-async";

const inputOutlineSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "& fieldset": { borderColor: "#93c5fd" },
    "&:hover fieldset": { borderColor: "#6366f1" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
};

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if we have a valid recovery session from Supabase
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // If there's a session and we're on the reset password page,
        // the user clicked the reset link
        if (session) {
          setIsValidSession(true);
        } else {
          // Check URL hash for recovery token (Supabase appends it)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'recovery') {
            // Set the session from the recovery link
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            });

            if (!error) {
              setIsValidSession(true);
            } else {
              setError("Invalid or expired reset link. Please request a new one.");
            }
          } else {
            setError("Invalid or expired reset link. Please request a new one.");
          }
        }
      } catch (err) {
        setError("Failed to verify reset link. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const formik = useFormik({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      newPassword: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError("");
        setMessage("");

        const { error: updateError } = await supabase.auth.updateUser({
          password: values.newPassword,
        });

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setMessage("Password reset successfully!");
        setIsSuccess(true);

        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/login", {
            state: { message: "Password reset successfully. Please sign in with your new password." }
          });
        }, 2000);
      } catch (error: any) {
        setError(error.message || "Failed to reset password");
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Verifying reset link...</Typography>
      </Box>
    );
  }

  if (!isValidSession && !isLoading) {
    return (
      <Container maxWidth="sm">
        <Helmet>
          <title>Reset Password – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, nofollow" />
          <link
            rel="canonical"
            href="https://plab2practice.com/reset-password"
          />
        </Helmet>
        <Box
          sx={{
            mt: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 400 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center" }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error || "Invalid or expired reset link. Please request a new password reset."}
                </Alert>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                >
                  Request Password Reset
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #faf5ff 50%, #fff1f2 100%)",
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Helmet>
          <title>Reset Password – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, nofollow" />
          <link
            rel="canonical"
            href="https://plab2practice.com/reset-password"
          />
        </Helmet>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Card
            sx={{
              width: "100%",
              maxWidth: 400,
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Lock sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
                <Typography variant="h4" component="h1" gutterBottom>
                  Reset Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your new password below.
                </Typography>
              </Box>

              {message && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {message}
                  {isSuccess && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        Redirecting to login...
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!isSuccess && (
                <form onSubmit={formik.handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      id="newPassword"
                      name="newPassword"
                      label="New Password"
                      type="password"
                      value={formik.values.newPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.newPassword &&
                        Boolean(formik.errors.newPassword)
                      }
                      helperText={
                        formik.touched.newPassword && formik.errors.newPassword
                      }
                      sx={inputOutlineSx}
                    />

                    <TextField
                      fullWidth
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirm New Password"
                      type="password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.confirmPassword &&
                        Boolean(formik.errors.confirmPassword)
                      }
                      helperText={
                        formik.touched.confirmPassword &&
                        formik.errors.confirmPassword
                      }
                      sx={inputOutlineSx}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={formik.isSubmitting || !formik.isValid}
                      sx={{
                        mt: 2,
                        mb: 2,
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
                      {formik.isSubmitting ? "Resetting..." : "Reset Password"}
                    </Button>
                  </Stack>
                </form>
              )}

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Link component={RouterLink} to="/login" variant="body2">
                  Back to Login
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default ResetPassword;
