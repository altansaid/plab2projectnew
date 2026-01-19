import React, { useState, useEffect } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { loginSuccess, loginStart, loginFailure } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import { supabase } from "../../services/supabase";
import GoogleSignInButton from "./GoogleSignInButton";
import { Helmet } from "react-helmet-async";

// Shared input outline style to match new design language
const inputOutlineSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "& fieldset": { borderColor: "#93c5fd" },
    "&:hover fieldset": { borderColor: "#6366f1" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
};

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [error, setError] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Handle Supabase auth state changes (for OAuth redirects)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await handleSupabaseSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSupabaseSession = async (session: any) => {
    try {
      // Try to get or create user profile in backend
      const userProfile = await getOrCreateUserProfile(session);

      dispatch(loginSuccess({
        user: userProfile,
        token: session.access_token,
        supabaseId: session.user.id,
      }));

      navigate(from, { replace: true });
    } catch (error) {
      console.error('Failed to handle Supabase session:', error);
      // Even if backend fails, we can still log in with basic profile from Supabase
      const name = session.user.user_metadata?.name ||
                   session.user.user_metadata?.full_name ||
                   session.user.email?.split('@')[0] || 'User';
      
      dispatch(loginSuccess({
        user: {
          id: 0,
          name: name,
          email: session.user.email || '',
          role: 'USER',
          provider: session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL',
          supabaseId: session.user.id,
          migratedToSupabase: true,
        },
        token: session.access_token,
        supabaseId: session.user.id,
      }));

      navigate(from, { replace: true });
    }
  };

  const getOrCreateUserProfile = async (session: any) => {
    const name = session.user.user_metadata?.name ||
                 session.user.user_metadata?.full_name ||
                 session.user.email?.split('@')[0] || 'User';
    const provider = session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL';

    // Basic user profile from Supabase session (fallback)
    const basicProfile = {
      id: 0,
      name: name,
      email: session.user.email,
      role: 'USER' as const,
      provider: provider as 'LOCAL' | 'GOOGLE',
      supabaseId: session.user.id,
      migratedToSupabase: true,
    };

    try {
      // Try to get existing profile from backend
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      // Mark user as migrated (has supabaseId from session)
      const userData = response.data;
      return {
        ...userData,
        supabaseId: session.user.id,
        migratedToSupabase: true,
      };
    } catch (error: any) {
      const status = error.response?.status;
      
      // 401, 403, 404 - try to sync or use basic profile
      if (status === 401 || status === 403 || status === 404) {
        // Try to sync user with backend
        try {
          const createResponse = await api.post('/auth/sync-supabase-user', {
            supabaseId: session.user.id,
            email: session.user.email,
            name: name,
            provider: provider,
          }, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          
          return {
            ...createResponse.data.user,
            supabaseId: session.user.id,
            migratedToSupabase: true,
          };
        } catch (syncError) {
          // Backend not ready for Supabase JWTs - use basic profile
          console.log('Backend sync failed, using basic profile from Supabase');
          return basicProfile;
        }
      }
      
      // For other errors, return basic profile instead of failing
      console.error('Backend profile fetch failed:', error);
      return basicProfile;
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
        setSuccessMessage("");
        dispatch(loginStart());

        // Try Supabase Auth first
        const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (supabaseData?.session) {
          // Supabase login successful
          await handleSupabaseSession(supabaseData.session);
          return;
        }

        // If Supabase fails with "Invalid login credentials", try soft migration
        if (supabaseError?.message?.includes('Invalid login credentials')) {
          // Try legacy login and migrate
          const migrationResult = await tryLegacyLoginAndMigrate(values.email, values.password);
          if (migrationResult.success) {
            // If migration returned a session, use it directly
            if (migrationResult.session) {
              await handleSupabaseSession(migrationResult.session);
              return;
            }

            // Otherwise try to sign in with Supabase
            const { data: newSession } = await supabase.auth.signInWithPassword({
              email: values.email,
              password: values.password,
            });

            if (newSession?.session) {
              await handleSupabaseSession(newSession.session);
              return;
            }
          }
        }

        // If we get here, login failed
        dispatch(loginFailure(supabaseError?.message || 'Login failed'));
        setError(supabaseError?.message || 'Invalid email or password');
      } catch (error: any) {
        dispatch(loginFailure(error.message || 'Login failed'));
        setError(error.response?.data?.error || error.message || "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const tryLegacyLoginAndMigrate = async (email: string, password: string): Promise<{ success: boolean; session?: any }> => {
    try {
      // Step 1: Verify credentials with legacy backend
      console.log('Attempting legacy login for migration...');
      const legacyResponse = await api.post("/auth/login", { email, password });

      if (legacyResponse.data?.user) {
        const userName = legacyResponse.data.user.name;
        console.log('Legacy login successful, migrating to Supabase...');
        
        // Step 2: Legacy login successful, create user in Supabase
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: userName,
              full_name: userName,
            },
          },
        });

        if (signUpError) {
          // If user already exists in Supabase with different password
          if (signUpError.message?.includes('already registered')) {
            console.log('User already exists in Supabase - they should use forgot password');
            // User needs to reset their password via forgot password flow
            return { success: false };
          }
          console.error('Supabase signUp error during migration:', signUpError);
          return { success: false };
        }

        // Step 3: Notify backend about migration (if we have a session)
        if (signUpData?.session) {
          try {
            await api.post('/auth/sync-supabase-user', {
              supabaseId: signUpData.user?.id,
              email: email,
              name: userName,
              provider: 'LOCAL',
            }, {
              headers: { Authorization: `Bearer ${signUpData.session.access_token}` }
            });
            console.log('Backend notified about migration');
          } catch (syncError) {
            console.log('Backend sync skipped (endpoint may not exist)');
          }
        }

        // Migration successful - return session if available
        console.log('User migrated to Supabase successfully!');
        return { success: true, session: signUpData?.session };
      }

      return { success: false };
    } catch (error: any) {
      // Legacy login failed - user doesn't exist or wrong password
      console.log('Legacy login failed:', error.response?.data?.error || error.message);
      return { success: false };
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError("");
      setSuccessMessage("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message || 'Google sign-in failed');
      }
      // If successful, the page will redirect and onAuthStateChange will handle it
    } catch (error: any) {
      console.error("Google authentication error:", error);
      setError("Google authentication failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
          <title>Login – PLAB 2 Practice</title>
          <meta name="robots" content="noindex, follow" />
          <link rel="canonical" href="https://plab2practice.com/login" />
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
                    sx={inputOutlineSx}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={formik.isSubmitting}
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

              <Box sx={{ mb: 2 }}>
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={false}
                  isLoading={isGoogleLoading}
                />
              </Box>

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
    </Box>
  );
};

export default Login;
