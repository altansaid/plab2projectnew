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
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import { Person, Lock } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { updateUser } from "../../features/auth/authSlice";
import { api } from "../../services/api";
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

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profileMessage, setProfileMessage] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");
  const [passwordMessage, setPasswordMessage] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  // Profile update form
  const profileFormik = useFormik({
    initialValues: {
      name: user?.name || "",
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters")
        .required("Name is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setProfileError("");
        setProfileMessage("");

        const response = await api.put("/auth/profile", values);
        dispatch(updateUser(response.data.user));
        setProfileMessage("Profile updated successfully!");
      } catch (error: any) {
        setProfileError(
          error.response?.data?.error || "Failed to update profile"
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Password change form
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required("Current password is required"),
      newPassword: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setPasswordError("");
        setPasswordMessage("");

        const email = user?.email || "";
        let isVerifiedViaSupabase = false;
        let isVerifiedViaBackend = false;

        // Step 1: Try to verify current password with Supabase
        console.log("Verifying password with Supabase...");
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: values.currentPassword,
        });

        if (!signInError) {
          isVerifiedViaSupabase = true;
          console.log("Password verified via Supabase");
        } else {
          console.log("Supabase verification failed, trying backend...");
        }

        // Step 2: If Supabase fails, try backend verification
        if (!isVerifiedViaSupabase) {
          try {
            await api.post("/auth/login", {
              email: email,
              password: values.currentPassword,
            });
            isVerifiedViaBackend = true;
            console.log("Password verified via backend");
          } catch (backendError) {
            console.log("Backend verification also failed");
          }
        }

        // If neither verification worked, password is incorrect
        if (!isVerifiedViaSupabase && !isVerifiedViaBackend) {
          setPasswordError("Current password is incorrect");
          setSubmitting(false);
          return;
        }

        // Step 3: If verified via backend but not Supabase, migrate user to Supabase first
        if (isVerifiedViaBackend && !isVerifiedViaSupabase) {
          console.log("Migrating user to Supabase...");
          
          // Try to create user in Supabase with current password
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: values.currentPassword,
            options: {
              data: {
                name: user?.name || email.split('@')[0],
                full_name: user?.name || email.split('@')[0],
              },
            },
          });

          if (signUpError && !signUpError.message?.includes('already registered')) {
            console.error("Failed to migrate user to Supabase:", signUpError);
            // Continue anyway - we'll update backend password
          } else if (signUpData?.session) {
            // Migration successful, now we can update Supabase password
            isVerifiedViaSupabase = true;
            console.log("User migrated to Supabase successfully");
          }

          // If user already exists in Supabase but with different password,
          // we need admin API to update - for now just update backend
          if (signUpError?.message?.includes('already registered')) {
            console.log("User exists in Supabase with different password");
            // We'll still update the backend password and inform user
          }
        }

        // Step 4: Update password in Supabase (if we have a valid session)
        let supabaseUpdateSuccess = false;
        if (isVerifiedViaSupabase) {
          console.log("Updating password in Supabase...");
          const { error: updateError } = await supabase.auth.updateUser({
            password: values.newPassword,
          });

          if (updateError) {
            console.error("Failed to update Supabase password:", updateError);
          } else {
            supabaseUpdateSuccess = true;
            console.log("Supabase password updated successfully");
          }
        }

        // Step 5: Always update backend password for consistency
        let backendUpdateSuccess = false;
        try {
          console.log("Updating password in backend...");
          await api.post("/auth/change-password", {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          });
          backendUpdateSuccess = true;
          console.log("Backend password updated successfully");
        } catch (backendError: any) {
          console.log("Backend password update failed:", backendError?.response?.data?.error);
        }

        // Report result to user
        if (supabaseUpdateSuccess && backendUpdateSuccess) {
          setPasswordMessage("Password changed successfully!");
        } else if (supabaseUpdateSuccess) {
          setPasswordMessage("Password changed successfully! (Supabase updated)");
        } else if (backendUpdateSuccess) {
          setPasswordMessage("Password changed successfully! Please log out and log in again for full sync.");
        } else {
          setPasswordError("Failed to change password. Please try again.");
          setSubmitting(false);
          return;
        }

        resetForm();
      } catch (error: any) {
        console.error("Password change error:", error);
        setPasswordError(
          error.message || "Failed to change password"
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      profileFormik.setValues({ name: user.name });
    }
  }, [user]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (profileMessage || profileError) {
      const timer = setTimeout(() => {
        setProfileMessage("");
        setProfileError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage, profileError]);

  useEffect(() => {
    if (passwordMessage || passwordError) {
      const timer = setTimeout(() => {
        setPasswordMessage("");
        setPasswordError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage, passwordError]);

  return (
    <>
      <Helmet>
        <title>My Profile - PLAB 2 Practice</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #faf5ff 50%, #fff1f2 100%)",
          py: 6,
        }}
      >
        <Container maxWidth="md">
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            My Profile
          </Typography>

          <Stack spacing={3}>
            {/* Profile Information */}
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #e5e7eb",
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(6px)",
                boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
              }}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Person sx={{ mr: 1 }} />
                    <Typography variant="h6">Profile Information</Typography>
                  </Box>

                  {profileMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {profileMessage}
                    </Alert>
                  )}

                  {profileError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {profileError}
                    </Alert>
                  )}

                  <form onSubmit={profileFormik.handleSubmit}>
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        id="name"
                        name="name"
                        label="Full Name"
                        value={profileFormik.values.name}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        error={
                          profileFormik.touched.name &&
                          Boolean(profileFormik.errors.name)
                        }
                        helperText={
                          profileFormik.touched.name &&
                          profileFormik.errors.name
                        }
                        sx={inputOutlineSx}
                      />

                      <TextField
                        fullWidth
                        label="Email"
                        value={user?.email || ""}
                        disabled
                        helperText="Email cannot be changed"
                        sx={inputOutlineSx}
                      />

                      <Box sx={{ pt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={
                            profileFormik.isSubmitting || !profileFormik.isValid
                          }
                          sx={{
                            minWidth: 160,
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
                          {profileFormik.isSubmitting
                            ? "Updating..."
                            : "Update Profile"}
                        </Button>
                      </Box>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Paper>

            {/* Password Change */}
            {user?.provider === "LOCAL" && (
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
                }}
              >
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Lock sx={{ mr: 1 }} />
                      <Typography variant="h6">Change Password</Typography>
                    </Box>

                    {passwordMessage && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {passwordMessage}
                      </Alert>
                    )}

                    {passwordError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {passwordError}
                      </Alert>
                    )}

                    <form onSubmit={passwordFormik.handleSubmit}>
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          id="currentPassword"
                          name="currentPassword"
                          label="Current Password"
                          type="password"
                          value={passwordFormik.values.currentPassword}
                          onChange={passwordFormik.handleChange}
                          onBlur={passwordFormik.handleBlur}
                          error={
                            passwordFormik.touched.currentPassword &&
                            Boolean(passwordFormik.errors.currentPassword)
                          }
                          helperText={
                            passwordFormik.touched.currentPassword &&
                            passwordFormik.errors.currentPassword
                          }
                          sx={inputOutlineSx}
                        />

                        <TextField
                          fullWidth
                          id="newPassword"
                          name="newPassword"
                          label="New Password"
                          type="password"
                          value={passwordFormik.values.newPassword}
                          onChange={passwordFormik.handleChange}
                          onBlur={passwordFormik.handleBlur}
                          error={
                            passwordFormik.touched.newPassword &&
                            Boolean(passwordFormik.errors.newPassword)
                          }
                          helperText={
                            passwordFormik.touched.newPassword &&
                            passwordFormik.errors.newPassword
                          }
                          sx={inputOutlineSx}
                        />

                        <TextField
                          fullWidth
                          id="confirmPassword"
                          name="confirmPassword"
                          label="Confirm New Password"
                          type="password"
                          value={passwordFormik.values.confirmPassword}
                          onChange={passwordFormik.handleChange}
                          onBlur={passwordFormik.handleBlur}
                          error={
                            passwordFormik.touched.confirmPassword &&
                            Boolean(passwordFormik.errors.confirmPassword)
                          }
                          helperText={
                            passwordFormik.touched.confirmPassword &&
                            passwordFormik.errors.confirmPassword
                          }
                          sx={inputOutlineSx}
                        />

                        <Box sx={{ pt: 1 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={
                              passwordFormik.isSubmitting ||
                              !passwordFormik.isValid
                            }
                            sx={{
                              minWidth: 160,
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
                            {passwordFormik.isSubmitting
                              ? "Changing..."
                              : "Change Password"}
                          </Button>
                        </Box>
                      </Stack>
                    </form>
                  </CardContent>
                </Card>
              </Paper>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
    </>
  );
};

export default Profile;
