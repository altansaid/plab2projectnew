import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  Link,
  Stack,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
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

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, "Name must be at least 2 characters")
        .required("Full name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
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
        setIsLoading(true);

        // Register with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name,
              full_name: values.name,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (data?.user) {
          // Registration successful
          navigate("/login", {
            state: {
              message: "Registration successful! Please sign in with your new account.",
            },
          });
        }
      } catch (error: any) {
        setError(error.message || "Registration failed");
      } finally {
        setIsLoading(false);
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
          <title>Create Account – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, follow" />
          <link rel="canonical" href="https://plab2practice.com/register" />
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
              <Typography
                component="h1"
                variant="h4"
                align="center"
                gutterBottom
                sx={{ mb: 3 }}
              >
                Create Account
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={formik.handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    id="name"
                    name="name"
                    label="Full Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={formik.touched.name && formik.errors.name}
                    disabled={isLoading}
                    sx={inputOutlineSx}
                  />

                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                    disabled={isLoading}
                    sx={inputOutlineSx}
                  />

                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Password"
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
                    disabled={isLoading}
                    sx={inputOutlineSx}
                  />

                  <TextField
                    fullWidth
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm Password"
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
                    disabled={isLoading}
                    sx={inputOutlineSx}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={formik.isSubmitting || isLoading}
                    sx={{
                      mt: 2,
                      mb: 1,
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
                    startIcon={
                      isLoading ? <CircularProgress size={20} /> : null
                    }
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </Stack>
              </form>

              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Typography variant="body2">
                  Already have an account?{" "}
                  <Link component={RouterLink} to="/login" variant="body2">
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default Register;
