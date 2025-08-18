import React, { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Avatar,
  Divider,
  ListItemIcon,
  Typography,
} from "@mui/material";
import {
  Person,
  Logout,
  AdminPanelSettings,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { RootState } from "../../store";
import { logout } from "../../features/auth/authSlice";
import { Helmet } from "react-helmet-async";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate("/");
  };

  const handleProfile = () => {
    navigate("/profile");
    handleClose();
  };

  const handleDashboard = () => {
    navigate("/dashboard");
    handleClose();
  };

  const handleAdmin = () => {
    navigate("/admin");
    handleClose();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Helmet>
        <title>PLAB 2 Practice Platform</title>
        <meta
          name="description"
          content="Practice PLAB 2 exam scenarios with real-time sessions, feedback, and analytics. Prepare effectively for PLAB 2 with our interactive platform."
        />
        <meta property="og:site_name" content="PLAB 2 Practice" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(255,255,255,0.85)",
          backdropFilter: "saturate(180%) blur(10px)",
          WebkitBackdropFilter: "saturate(180%) blur(10px)",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth={false} disableGutters>
          <Toolbar
            disableGutters
            sx={{ minHeight: 64, px: { xs: 2, sm: 3, lg: 4 } }}
          >
            <Box
              component={Link}
              to="/"
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="PLAB 2 Practice"
                sx={{ height: 40, width: "auto" }}
              />
            </Box>

            {isAuthenticated ? (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography
                  variant="body2"
                  sx={{
                    mr: 2,
                    display: { xs: "none", sm: "block" },
                    fontWeight: 500,
                  }}
                >
                  Welcome, {user?.name}
                </Typography>

                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      boxShadow: 1,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  {user?.role === "ADMIN" && (
                    <MenuItem onClick={handleAdmin}>
                      <ListItemIcon>
                        <AdminPanelSettings />
                      </ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleDashboard}>
                    <ListItemIcon>
                      <DashboardIcon />
                    </ListItemIcon>
                    Dashboard
                  </MenuItem>

                  <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    My Profile
                  </MenuItem>

                  <Divider />

                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <Logout />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box>
                <Button
                  variant="outlined"
                  color="primary"
                  component={Link}
                  to="/login"
                  sx={{ mr: 1 }}
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={Link}
                  to="/register"
                >
                  Register
                </Button>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
