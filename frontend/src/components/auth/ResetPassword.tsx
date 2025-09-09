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
import {
  Link as RouterLink,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { api } from "../../services/api";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

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

        if (!token) {
          setError("Invalid reset token");
          return;
        }

        const response = await api.post("/auth/reset-password", {
          token,
          newPassword: values.newPassword,
        });

        setMessage(response.data.message);
        setIsSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error: any) {
        setError(error.response?.data?.error || "Failed to reset password");
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!token) {
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
                  Invalid or missing reset token. Please request a new password
                  reset.
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
                        Redirecting to login in 3 seconds...
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
