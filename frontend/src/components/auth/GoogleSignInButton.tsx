import React from "react";
import { Button } from "@mui/material";
import { Google as GoogleIcon } from "@mui/icons-material";

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  text?: string;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  fullWidth = true,
  text = "Continue with Google",
}) => {
  return (
    <Button
      fullWidth={fullWidth}
      variant="outlined"
      onClick={onClick}
      disabled={disabled || isLoading}
      startIcon={
        <GoogleIcon
          sx={{
            color: "#4285F4",
            fontSize: "20px",
          }}
        />
      }
      sx={{
        py: 1.5,
        borderColor: "#dadce0",
        color: "#3c4043",
        fontSize: "14px",
        fontWeight: 500,
        textTransform: "none",
        backgroundColor: "#fff",
        "&:hover": {
          borderColor: "#d2d3d4",
          backgroundColor: "#f8f9fa",
          boxShadow:
            "0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)",
        },
        "&:focus": {
          backgroundColor: "#fff",
        },
        "&:active": {
          backgroundColor: "#ecf3ff",
          borderColor: "#4285f4",
        },
        "&.Mui-disabled": {
          backgroundColor: "#f8f9fa",
          color: "#9aa0a6",
          borderColor: "#f1f3f4",
        },
        transition:
          "background-color 218ms, border-color 218ms, box-shadow 218ms",
      }}
    >
      {isLoading ? "Signing in..." : text}
    </Button>
  );
};

export default GoogleSignInButton;
