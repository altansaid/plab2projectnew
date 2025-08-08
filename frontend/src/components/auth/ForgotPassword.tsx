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
import { api } from "../../services/api";
import { Helmet } from "react-helmet-async";

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

        const response = await api.post("/auth/forgot-password", values);
        setMessage(response.data.message);
        setIsSubmitted(true);
      } catch (error: any) {
        setError(
          error.response?.data?.error ||
            "Failed to process password reset request"
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
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
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Email sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
              <Typography variant="h4" component="h1" gutterBottom>
                Forgot Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your email address and we'll send you a link to reset your
                password.
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
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={formik.isSubmitting || !formik.isValid}
                    sx={{ mt: 2, mb: 2 }}
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
  );
};

export default ForgotPassword;
