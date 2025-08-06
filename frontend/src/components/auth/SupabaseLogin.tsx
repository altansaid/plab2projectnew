import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  Link,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import {
  signInWithEmail,
  signInWithGoogle,
} from "../../features/auth/supabaseAuthSlice";
import { Google } from "@mui/icons-material";

const SupabaseLogin: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const from = location.state?.from?.pathname || "/dashboard";

  // Check for success message from registration
  React.useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string().required("Password is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError("");
        setSuccessMessage("");

        const result = await dispatch(
          signInWithEmail(values.email, values.password) as any
        );

        if (result.error) {
          setError(result.error);
        } else if (result.success) {
          navigate(from, { replace: true });
        }
      } catch (error: any) {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError("");
      setSuccessMessage("");

      const result = await dispatch(signInWithGoogle() as any);

      if (result.error) {
        setError(result.error);
      }
      // For OAuth, the redirect will handle success
    } catch (error: any) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              component="h1"
              variant="h4"
              align="center"
              gutterBottom
              sx={{ mb: 3 }}
            >
              Sign In
            </Typography>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
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
                  helperText={formik.touched.password && formik.errors.password}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={formik.isSubmitting}
                  sx={{ mt: 2, mb: 1 }}
                >
                  {formik.isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </Stack>
            </form>

            <Box sx={{ textAlign: "center", mt: 2, mb: 2 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
              >
                Forgot password?
              </Link>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Google />}
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              sx={{ mb: 2 }}
            >
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{" "}
                <Link component={RouterLink} to="/register" variant="body2">
                  Sign up
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SupabaseLogin;
