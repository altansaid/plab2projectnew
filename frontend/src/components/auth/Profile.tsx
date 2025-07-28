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

        await api.post("/auth/change-password", {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });

        setPasswordMessage("Password changed successfully!");
        resetForm();
      } catch (error: any) {
        setPasswordError(
          error.response?.data?.error || "Failed to change password"
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
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>

        <Stack spacing={3}>
          {/* Profile Information */}
          <Paper elevation={1}>
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
                        profileFormik.touched.name && profileFormik.errors.name
                      }
                    />

                    <TextField
                      fullWidth
                      label="Email"
                      value={user?.email || ""}
                      disabled
                      helperText="Email cannot be changed"
                    />

                    <Box sx={{ pt: 1 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          profileFormik.isSubmitting || !profileFormik.isValid
                        }
                        sx={{ minWidth: 120 }}
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
            <Paper elevation={1}>
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
                      />

                      <Box sx={{ pt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={
                            passwordFormik.isSubmitting ||
                            !passwordFormik.isValid
                          }
                          sx={{ minWidth: 120 }}
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
  );
};

export default Profile;
