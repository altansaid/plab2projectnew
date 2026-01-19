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
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    // Initialize auth state from Supabase
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Supabase getSession error:', error);
          return;
        }

        if (session?.user && isMounted) {
          try {
            const userProfile = await getOrCreateUserProfile(session);

            if (isMounted) {
              dispatch(loginSuccess({
                user: userProfile,
                token: session.access_token,
                supabaseId: session.user.id,
              }));
            }
          } catch (profileError) {
            console.error('Failed to get/create user profile:', profileError);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        if (isMounted) {
          console.log('Auth initialization complete');
          setIsInitializing(false);
          dispatch(setLoading(false));
        }
      }
    };

    // Add a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timed out after 5s');
        setIsInitializing(false);
        dispatch(setLoading(false));
      }
    }, 5000);

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session) {
        try {
          const userProfile = await getOrCreateUserProfile(session);
          if (isMounted) {
            dispatch(loginSuccess({
              user: userProfile,
              token: session.access_token,
              supabaseId: session.user.id,
            }));
          }
        } catch (error) {
          console.error('Error handling SIGNED_IN:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        dispatch(logout());
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const state = localStorage.getItem('user');
        if (state && isMounted) {
          dispatch(loginSuccess({
            user: JSON.parse(state),
            token: session.access_token,
            supabaseId: session.user.id,
          }));
        }
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  const getOrCreateUserProfile = async (session: any) => {
    const name = session.user.user_metadata?.name ||
                 session.user.user_metadata?.full_name ||
                 session.user.email?.split('@')[0] || 'User';
    const provider = session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL';

    // Basic profile from Supabase (always works as fallback)
    const basicProfile = {
      id: 0,
      name: name,
      email: session.user.email,
      role: 'USER',
      provider: provider,
      supabaseId: session.user.id,
      migratedToSupabase: true,
    };

    try {
      // Try to get existing profile from backend
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      return {
        ...response.data,
        supabaseId: session.user.id,
        migratedToSupabase: true,
      };
    } catch (error: any) {
      // Try to sync user with backend
      try {
        const syncResponse = await api.post('/auth/sync-supabase-user', {
          supabaseId: session.user.id,
          email: session.user.email,
          name: name,
          provider: provider,
        }, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        return {
          ...syncResponse.data.user,
          supabaseId: session.user.id,
          migratedToSupabase: true,
        };
      } catch (syncError) {
        // Backend not ready - return basic profile from Supabase
        console.log('Using basic profile from Supabase (backend sync unavailable)');
        return basicProfile;
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
