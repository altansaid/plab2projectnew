import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Alert,
  Stack,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
} from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { api } from "../../services/api";
import { User } from "../../types";

interface UserStats {
  totalUsers: number;
  adminCount: number;
  userCount: number;
}

interface UsersResponse {
  users: User[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    adminCount: 0,
    userCount: 0,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: page.toString(),
        size: rowsPerPage.toString(),
      });

      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const response = await api.get(`/admin/users?${params}`);
      const data: UsersResponse = response.data;

      setUsers(data.users);
      setTotalItems(data.totalItems);
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/users/stats");
      setStats(response.data);
    } catch (error: any) {
      console.error("Failed to fetch user stats:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, search, roleFilter]);

  useEffect(() => {
    fetchStats();
  }, [users]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to delete user");
    }
  };

  const editFormik = useFormik({
    initialValues: {
      role: selectedUser?.role || "USER",
    },
    validationSchema: Yup.object({
      role: Yup.string().oneOf(["USER", "ADMIN"]).required("Role is required"),
    }),
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      if (!selectedUser) return;

      try {
        await api.put(`/admin/users/${selectedUser.id}/role`, values);
        setEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
        fetchStats();
      } catch (error: any) {
        setError(error.response?.data?.error || "Failed to update user role");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getRoleChip = (role: string) => {
    return (
      <Chip
        label={role}
        color={role === "ADMIN" ? "primary" : "default"}
        size="small"
        icon={role === "ADMIN" ? <AdminIcon /> : <UserIcon />}
      />
    );
  };

  const getProviderChip = (provider?: string) => {
    if (!provider || provider === "LOCAL") {
      return <Chip label="Email" size="small" variant="outlined" />;
    }
    return <Chip label="Google" size="small" color="info" />;
  };

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PeopleIcon sx={{ mr: 2, color: "primary.main" }} />
                <Box>
                  <Typography variant="h6">{stats.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AdminIcon sx={{ mr: 2, color: "error.main" }} />
                <Box>
                  <Typography variant="h6">{stats.adminCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Administrators
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <UserIcon sx={{ mr: 2, color: "success.main" }} />
                <Box>
                  <Typography variant="h6">{stats.userCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Regular Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <form onSubmit={handleSearch}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              label="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Role Filter</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Role Filter"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="USER">Users</MenuItem>
                <MenuItem value="ADMIN">Admins</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={loading}
            >
              Search
            </Button>
          </Stack>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Account Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleChip(user.role)}</TableCell>
                <TableCell>{getProviderChip(user.provider)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(user)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(user)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 10px 20px rgba(2,6,23,0.08)",
          },
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: 999,
              textTransform: "none",
              borderColor: "#93c5fd",
              color: "#1d4ed8",
              "&:hover": { borderColor: "#6366f1", backgroundColor: "#eff6ff" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            sx={{ borderRadius: 999, textTransform: "none", fontWeight: 700 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 10px 20px rgba(2,6,23,0.08)",
          },
        }}
      >
        <DialogTitle>Change User Role</DialogTitle>
        <form onSubmit={editFormik.handleSubmit}>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Change role for user "{selectedUser?.name}"
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={editFormik.values.role}
                onChange={editFormik.handleChange}
                label="Role"
              >
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setEditDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: 999,
                textTransform: "none",
                borderColor: "#93c5fd",
                color: "#1d4ed8",
                "&:hover": {
                  borderColor: "#6366f1",
                  backgroundColor: "#eff6ff",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={editFormik.isSubmitting}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                boxShadow: "0 10px 20px rgba(59,130,246,0.25)",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "0 14px 24px rgba(59,130,246,0.3)",
                  background:
                    "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
                },
              }}
            >
              {editFormik.isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
