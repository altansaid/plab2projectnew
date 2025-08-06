import React from "react";
import { Routes, Route } from "react-router-dom";

// Components
import Layout from "./components/common/Layout";
import SupabaseLayout from "./components/common/SupabaseLayout";
import SupabaseAuthProvider from "./components/auth/SupabaseAuthProvider";
import HomePage from "./components/common/HomePage";

// Legacy auth components (will be gradually replaced)
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";

// New Supabase auth components
import SupabaseLogin from "./components/auth/SupabaseLogin";
import SupabaseRegister from "./components/auth/SupabaseRegister";
import SupabaseForgotPassword from "./components/auth/SupabaseForgotPassword";
import SupabaseResetPassword from "./components/auth/SupabaseResetPassword";
import AuthCallback from "./components/auth/AuthCallback";

import Profile from "./components/auth/Profile";
import PrivateRoute from "./components/auth/PrivateRoute";
import SupabasePrivateRoute from "./components/auth/SupabasePrivateRoute";
import AdminRoute from "./components/auth/AdminRoute";
import Dashboard from "./components/dashboard/Dashboard";
import SessionCreateSimple from "./components/session/SessionCreateSimple";
import SessionJoin from "./components/session/SessionJoin";
import SessionRoom from "./components/session/SessionRoom";
import ConfigureSession from "./components/session/ConfigureSession";
import RoleSelection from "./components/session/RoleSelection";
import AdminPanel from "./components/admin/AdminPanel";

function App() {
  return (
    <SupabaseAuthProvider>
      <SupabaseLayout>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />

          {/* Supabase auth routes (new) */}
          <Route path="/login" element={<SupabaseLogin />} />
          <Route path="/register" element={<SupabaseRegister />} />
          <Route path="/forgot-password" element={<SupabaseForgotPassword />} />
          <Route path="/reset-password" element={<SupabaseResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Legacy auth routes (fallback, can be removed later) */}
          <Route path="/legacy/login" element={<Login />} />
          <Route path="/legacy/register" element={<Register />} />
          <Route path="/legacy/forgot-password" element={<ForgotPassword />} />
          <Route path="/legacy/reset-password" element={<ResetPassword />} />

          {/* Protected routes using Supabase auth */}
          <Route element={<SupabasePrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/session/create" element={<SessionCreateSimple />} />
            <Route path="/session/join" element={<SessionJoin />} />
            <Route
              path="/session/:sessionCode/configure"
              element={<ConfigureSession />}
            />
            <Route
              path="/session/:sessionCode/role"
              element={<RoleSelection />}
            />
            <Route
              path="/session/:sessionCode/room"
              element={<SessionRoom />}
            />
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
      </SupabaseLayout>
    </SupabaseAuthProvider>
  );
}

export default App;
