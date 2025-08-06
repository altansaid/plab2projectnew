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
  Stack,
} from "@mui/material";
import { Lock } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updatePassword } from "../../features/auth/supabaseAuthSlice";
import { supabase } from "../../lib/supabase";

const SupabaseResetPassword: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isValidSession, setIsValidSession] = useState<boolean>(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a valid session for password reset
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setError("Invalid or expired reset link. Please request a new one.");
          return;
        }

        if (session?.user) {
          setIsValidSession(true);
        } else {
          // Try to get session from URL hash (for magic link)
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setError(
                "Invalid or expired reset link. Please request a new one."
              );
            } else if (data.session) {
              setIsValidSession(true);
            }
          } else {
            setError(
              "Invalid reset link. Please request a new password reset."
            );
          }
        }
      } catch (err) {
        setError("An error occurred. Please try again.");
      }
    };

    checkSession();
  }, []);

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError("");
        setMessage("");

        const result = await dispatch(updatePassword(values.password) as any);

        if (result.error) {
          setError(result.error);
        } else if (result.success) {
          setMessage("Password updated successfully!");

          // Redirect to login after 2 seconds
          setTimeout(() => {
            navigate("/login", {
              state: {
                message:
                  "Password updated successfully. Please sign in with your new password.",
              },
            });
          }, 2000);
        }
      } catch (error: any) {
        setError("Failed to update password. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!isValidSession && !error) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography>Validating reset link...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
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
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {isValidSession && !message && (
              <form onSubmit={formik.handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="New Password"
                    type="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.password && Boolean(formik.errors.password)
                    }
                    helperText={
                      formik.touched.password && formik.errors.password
                    }
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
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={formik.isSubmitting || !formik.isValid}
                    sx={{ mt: 2, mb: 2 }}
                  >
                    {formik.isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </Stack>
              </form>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SupabaseResetPassword;
