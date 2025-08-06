import React, { useEffect } from "react";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";
import { Box, CircularProgress, Typography } from "@mui/material";

interface SupabaseAuthProviderProps {
  children: React.ReactNode;
}

const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({
  children,
}) => {
  const { isInitialized, isLoading } = useSupabaseAuth();

  // Show loading screen while initializing auth
  if (!isInitialized || isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Initializing authentication...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default SupabaseAuthProvider;
