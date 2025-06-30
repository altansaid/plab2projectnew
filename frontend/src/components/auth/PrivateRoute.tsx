import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

const PrivateRoute: React.FC = () => {
  const { token, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // More robust authentication check
  const isAuthorized = token && isAuthenticated && user;

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
