import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "./store";
import Layout from "./components/common/Layout";
import HomePage from "./components/common/HomePage";
import PrivateRoute from "./components/auth/PrivateRoute";
import AdminRoute from "./components/auth/AdminRoute";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import SessionCreate from "./components/session/SessionCreateSimple";
import SessionJoin from "./components/session/SessionJoin";
import RoleSelection from "./components/session/RoleSelection";
import ConfigureSession from "./components/session/ConfigureSession";
import SessionRoom from "./components/session/SessionRoom";
import AdminPanel from "./components/admin/AdminPanel";

const App: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public routes */}
          <Route index element={<HomePage />} />
          <Route
            path="login"
            element={
              !isAuthenticated ? <Login /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="register"
            element={
              !isAuthenticated ? <Register /> : <Navigate to="/dashboard" />
            }
          />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="session">
              <Route path="create" element={<SessionCreate />} />
              <Route path="join" element={<SessionJoin />} />
              <Route
                path=":sessionCode/select-role"
                element={<RoleSelection />}
              />
              <Route
                path=":sessionCode/configure"
                element={<ConfigureSession />}
              />
              <Route path=":sessionCode/room" element={<SessionRoom />} />
              <Route path=":sessionId" element={<SessionRoom />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Box>
  );
};

export default App;
