import React from "react";
import { Routes, Route } from "react-router-dom";

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
