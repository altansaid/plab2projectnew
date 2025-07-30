import React, { useState, useEffect, useRef } from "react";
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
  Divider,
  Stack,
} from "@mui/material";
import { Google as GoogleIcon } from "@mui/icons-material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../features/auth/authSlice";
import { api } from "../../services/api";

// Google Sign-In types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: string;
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const from = location.state?.from?.pathname || "/dashboard";

  // Load Google Script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (
        !document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setIsGoogleScriptLoaded(true);
          setTimeout(() => {
            initializeGoogleSignIn();
          }, 100);
        };
        document.head.appendChild(script);
      } else {
        // Check if Google APIs are available
        if (window.google?.accounts?.id) {
          setIsGoogleScriptLoaded(true);
          initializeGoogleSignIn();
        } else {
          // Poll until Google APIs are available
          const checkGoogle = setInterval(() => {
            if (window.google?.accounts?.id) {
              setIsGoogleScriptLoaded(true);
              initializeGoogleSignIn();
              clearInterval(checkGoogle);
            }
          }, 100);

          // Stop polling after 10 seconds
          setTimeout(() => {
            clearInterval(checkGoogle);
          }, 10000);
        }
      }
    };

    loadGoogleScript();
  }, []);

  const initializeGoogleSignIn = () => {
    if (!window.google?.accounts?.id) {
      return;
    }

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (
      !googleClientId ||
      googleClientId === "your_google_oauth_client_id_here" ||
      googleClientId.trim() === ""
    ) {
      setError(
        "Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable."
      );
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCallback,
        auto_select: false,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 250,
        });
      }
    } catch (error) {
      console.error("Error initializing Google Sign-In:", error);
      setError("Failed to initialize Google Sign-In");
    }
  };

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
        const response = await api.post("/auth/login", values);
        dispatch(loginSuccess(response.data));
        navigate(from, { replace: true });
      } catch (error: any) {
        setError(error.response?.data?.error || "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleGoogleCallback = async (response: { credential: string }) => {
    try {
      setIsGoogleLoading(true);
      setError("");

      // Google credential received - processing securely (credential not logged for security)

      const result = await api.post("/auth/google", {
        idToken: response.credential,
      });

      dispatch(loginSuccess(result.data));
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Google authentication error:", error);
      if (error.response?.status === 401) {
        setError("Invalid Google account credentials. Please try again.");
      } else if (error.response?.status === 500) {
        setError(
          "Server configuration error. Google OAuth may not be properly configured."
        );
      } else if (error.response?.data?.error) {
        setError(`Google authentication failed: ${error.response.data.error}`);
      } else {
        setError("Google authentication failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Sign In
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

            <Box
              ref={googleButtonRef}
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 2,
                opacity: isGoogleLoading ? 0.7 : 1,
                pointerEvents: isGoogleLoading ? "none" : "auto",
              }}
            />

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

export default Login;
