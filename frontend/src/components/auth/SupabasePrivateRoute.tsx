import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";

const SupabasePrivateRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isInitialized } = useSupabaseAuth();
  const location = useLocation();

  // Show loading while initializing auth
  if (!isInitialized || isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default SupabasePrivateRoute;
