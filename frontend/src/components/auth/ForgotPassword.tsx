import React, { useState } from "react";
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
import { Email } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link as RouterLink } from "react-router-dom";
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

const ForgotPassword: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError("");
        setMessage("");

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setMessage("If an account exists with this email, you will receive a password reset link.");
        setIsSubmitted(true);
      } catch (error: any) {
        setError(error.message || "Failed to process password reset request");
      } finally {
        setSubmitting(false);
      }
    },
  });

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
          <title>Forgot Password – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, nofollow" />
          <link
            rel="canonical"
            href="https://plab2practice.com/forgot-password"
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
                <Email sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
                <Typography variant="h4" component="h1" gutterBottom>
                  Forgot Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your email address and we'll send you a link to reset
                  your password.
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

              {!isSubmitted ? (
                <form onSubmit={formik.handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      id="email"
                      name="email"
                      label="Email Address"
                      type="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.email && Boolean(formik.errors.email)
                      }
                      helperText={formik.touched.email && formik.errors.email}
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
                      {formik.isSubmitting ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </Stack>
                </form>
              ) : (
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Check your email for the password reset link.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage("");
                      formik.resetForm();
                    }}
                  >
                    Send Another Email
                  </Button>
                </Box>
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

export default ForgotPassword;
