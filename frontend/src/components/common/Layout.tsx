import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  ListItemIcon,
  useTheme,
  alpha,
} from "@mui/material";
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
} from "@mui/icons-material";
import { RootState } from "../../store";
import { logout } from "../../features/auth/authSlice";

const Layout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(6px)",
          width: "100%",
        }}
      >
        <Toolbar disableGutters sx={{ height: 64, width: "100%", px: 4 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              cursor: "pointer",
              fontWeight: 600,
              color: theme.palette.text.primary,
              "&:hover": {
                color: theme.palette.primary.main,
              },
              transition: "color 0.2s",
            }}
            onClick={() => navigate("/")}
          >
            PLAB 2 Practice
          </Typography>

          {user ? (
            <Box>
              <IconButton
                onClick={handleMenu}
                sx={{
                  padding: 0.5,
                  border: `2px solid ${theme.palette.primary.main}`,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    fontSize: "1rem",
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : <AccountCircle />}
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
                PaperProps={{
                  elevation: 2,
                  sx: {
                    width: 220,
                    overflow: "visible",
                    mt: 1.5,
                    "&:before": {
                      content: '""',
                      display: "block",
                      position: "absolute",
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: "background.paper",
                      transform: "translateY(-50%) rotate(45deg)",
                      zIndex: 0,
                    },
                  },
                }}
              >
                <Box sx={{ py: 1.5, px: 2 }}>
                  <Typography variant="subtitle2" noWrap>
                    {user.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary" }}
                    noWrap
                  >
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleClose();
                    navigate("/dashboard");
                  }}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <DashboardIcon fontSize="small" />
                  </ListItemIcon>
                  Dashboard
                </MenuItem>
                {user.role === "ADMIN" && (
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      navigate("/admin");
                    }}
                    sx={{ py: 1.5 }}
                  >
                    <ListItemIcon>
                      <AdminIcon fontSize="small" />
                    </ListItemIcon>
                    Admin Panel
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                startIcon={<LoginIcon />}
                onClick={() => navigate("/login")}
                color="primary"
                variant="outlined"
              >
                Login
              </Button>
              <Button
                startIcon={<RegisterIcon />}
                onClick={() => navigate("/register")}
                color="primary"
                variant="contained"
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, width: "100%" }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
