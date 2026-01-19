import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { supabase } from "./services/supabase";
import { loginSuccess, logout, setLoading } from "./features/auth/authSlice";
import { api } from "./services/api";
import { Box, CircularProgress } from "@mui/material";

// Components
import Layout from "./components/common/Layout";
import HomePage from "./components/common/HomePage";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import Profile from "./components/auth/Profile";
import PrivateRoute from "./components/auth/PrivateRoute";
import AdminRoute from "./components/auth/AdminRoute";
import Dashboard from "./components/dashboard/Dashboard";
import SessionCreateSimple from "./components/session/SessionCreateSimple";
import SessionJoin from "./components/session/SessionJoin";
import SessionRoom from "./components/session/SessionRoom";
import ConfigureSession from "./components/session/ConfigureSession";
import RoleSelection from "./components/session/RoleSelection";
import AdminPanel from "./components/admin/AdminPanel";

function App() {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize auth state from Supabase
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Get or create user profile
          const userProfile = await getOrCreateUserProfile(session);

          dispatch(loginSuccess({
            user: userProfile,
            token: session.access_token,
            supabaseId: session.user.id,
          }));
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitializing(false);
        dispatch(setLoading(false));
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userProfile = await getOrCreateUserProfile(session);
        dispatch(loginSuccess({
          user: userProfile,
          token: session.access_token,
          supabaseId: session.user.id,
        }));
      } else if (event === 'SIGNED_OUT') {
        dispatch(logout());
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update token in Redux store when refreshed
        const state = localStorage.getItem('user');
        if (state) {
          dispatch(loginSuccess({
            user: JSON.parse(state),
            token: session.access_token,
            supabaseId: session.user.id,
          }));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  const getOrCreateUserProfile = async (session: any) => {
    try {
      // Try to get existing profile from backend
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      return response.data;
    } catch (error: any) {
      // If user doesn't exist in backend, create basic profile
      const name = session.user.user_metadata?.name ||
                   session.user.user_metadata?.full_name ||
                   session.user.email?.split('@')[0] || 'User';

      // Try to sync user with backend
      try {
        const syncResponse = await api.post('/auth/sync-supabase-user', {
          supabaseId: session.user.id,
          email: session.user.email,
          name: name,
          provider: session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL',
        }, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        return syncResponse.data.user;
      } catch (syncError) {
        // Return basic user object if sync fails
        return {
          id: 0,
          name: name,
          email: session.user.email,
          role: 'USER',
          provider: session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL',
        };
      }
    }
  };

  // Show loading state while initializing auth
  if (isInitializing) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 50%, #fff1f2 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/session/create" element={<SessionCreateSimple />} />
          <Route path="/session/configure" element={<ConfigureSession />} />
          <Route path="/session/join" element={<SessionJoin />} />
          <Route
            path="/session/:sessionCode/configure"
            element={<ConfigureSession />}
          />
          <Route
            path="/session/:sessionCode/role"
            element={<RoleSelection />}
          />
          <Route path="/session/:sessionCode/room" element={<SessionRoom />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
          path="/admin"
        />
      </Routes>
    </Layout>
  );
}

export default App;
