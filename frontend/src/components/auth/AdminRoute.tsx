import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

const AdminRoute: React.FC = () => {
  const { user, token, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // First check if user is authenticated
  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Then check if user has admin role
  if (user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
