import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Cases as CasesIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  setCases,
  addCase,
  updateCase,
  deleteCase,
  setCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../../features/admin/adminSlice";
import { api } from "../../services/api";
import CaseEditor from "./CaseEditor";
import UserManagement from "./UserManagement";
import { Tab as HeadlessTab } from "@headlessui/react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { cases, categories } = useSelector((state: RootState) => state.admin);
  const [tabValue, setTabValue] = useState(0);
  const [openCaseEditor, setOpenCaseEditor] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    categoryName: "",
  });

  // Search states
  const [caseSearch, setCaseSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesResponse, categoriesResponse] = await Promise.all([
          api.get("/cases"),
          api.get("/categories"),
        ]);
        dispatch(setCases(casesResponse.data));
        dispatch(setCategories(categoriesResponse.data));
      } catch (error: any) {
        // Handle error silently or with user-facing notification
      }
    };

    fetchData();
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCaseEditorOpen = (caseItem?: any) => {
    setSelectedCase(caseItem || null);
    setOpenCaseEditor(true);
  };

  const handleCategoryDialogOpen = (category?: any) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({ categoryName: category.name });
    } else {
      setSelectedCategory(null);
      setFormData({ categoryName: "" });
    }
    setOpenCategoryDialog(true);
  };

  const handleCaseSave = async (caseData: any) => {
    try {
      if (selectedCase) {
        const response = await api.put(`/cases/${selectedCase.id}`, caseData);
        dispatch(updateCase(response.data));
      } else {
        const response = await api.post("/cases", caseData);
        dispatch(addCase(response.data));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleCategorySubmit = async () => {
    try {
      if (selectedCategory) {
        const response = await api.put(`/categories/${selectedCategory.id}`, {
          name: formData.categoryName,
        });
        dispatch(updateCategory(response.data));
      } else {
        const response = await api.post("/categories", {
          name: formData.categoryName,
        });
        dispatch(addCategory(response.data));
      }
      setOpenCategoryDialog(false);
    } catch (error) {
      // Handle error silently or with user-facing notification
    }
  };

  const handleDelete = async (type: "case" | "category", id: number) => {
    try {
      if (type === "case") {
        await api.delete(`/cases/${id}`);
        dispatch(deleteCase(id));
      } else {
        await api.delete(`/categories/${id}`);
        dispatch(deleteCategory(id));
      }
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage =
        error.response?.data?.error ||
        `Failed to delete ${type}. Please try again.`;

      // You can replace this with a proper toast/snackbar notification
      alert(errorMessage);
    }
  };

  // Filtered cases and categories
  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch =
      caseSearch === "" ||
      caseItem.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
      caseItem.description?.toLowerCase().includes(caseSearch.toLowerCase());

    const matchesCategory =
      categoryFilter === "" ||
      caseItem.category?.id === parseInt(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  const filteredCategories = categories.filter(
    (category) =>
      categorySearch === "" ||
      category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleCaseSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Search is performed in real-time via filteredCases
  };

  const handleCategorySearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Search is performed in real-time via filteredCategories
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Cases" />
            <Tab label="Categories" />
            <Tab label="User Management" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Cases Search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <form onSubmit={handleCaseSearch}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems="center"
              >
                <TextField
                  label="Search cases..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                  placeholder="Search by title or description"
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Category Filter</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category Filter"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                >
                  Search
                </Button>

                {(caseSearch || categoryFilter) && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setCaseSearch("");
                      setCategoryFilter("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </form>
          </Paper>

          {/* Cases Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CasesIcon sx={{ mr: 2, color: "primary.main" }} />
                    <Box>
                      <Typography variant="h6">
                        {filteredCases.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {caseSearch || categoryFilter
                          ? "Filtered Cases"
                          : "Total Cases"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CategoryIcon sx={{ mr: 2, color: "success.main" }} />
                    <Box>
                      <Typography variant="h6">{categories.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available Categories
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Button variant="contained" onClick={() => handleCaseEditorOpen()}>
              Add New Case
            </Button>
          </Box>

          {filteredCases.length === 0 ? (
            <Card>
              <CardContent>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  align="center"
                >
                  {caseSearch || categoryFilter
                    ? "No cases found matching your search criteria."
                    : "No cases available. Create your first case!"}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List>
              {filteredCases.map((caseItem) => (
                <ListItem key={caseItem.id}>
                  <ListItemText
                    primary={caseItem.title}
                    secondary={caseItem.category?.name || "No category"}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleCaseEditorOpen(caseItem)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete("case", caseItem.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Categories Search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <form onSubmit={handleCategorySearch}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems="center"
              >
                <TextField
                  label="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                  placeholder="Search by category name"
                />

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                >
                  Search
                </Button>

                {categorySearch && (
                  <Button
                    variant="outlined"
                    onClick={() => setCategorySearch("")}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </form>
          </Paper>

          {/* Categories Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CategoryIcon sx={{ mr: 2, color: "primary.main" }} />
                    <Box>
                      <Typography variant="h6">
                        {filteredCategories.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {categorySearch
                          ? "Filtered Categories"
                          : "Total Categories"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CasesIcon sx={{ mr: 2, color: "info.main" }} />
                    <Box>
                      <Typography variant="h6">{cases.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Cases
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleCategoryDialogOpen()}
            >
              Add New Category
            </Button>
          </Box>

          {filteredCategories.length === 0 ? (
            <Card>
              <CardContent>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  align="center"
                >
                  {categorySearch
                    ? "No categories found matching your search criteria."
                    : "No categories available. Create your first category!"}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List>
              {filteredCategories.map((category) => (
                <ListItem key={category.id}>
                  <ListItemText primary={category.name} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleCategoryDialogOpen(category)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete("category", category.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <UserManagement />
        </TabPanel>

        {/* Case Editor */}
        <CaseEditor
          open={openCaseEditor}
          onClose={() => setOpenCaseEditor(false)}
          caseData={selectedCase}
          categories={categories}
          onSave={handleCaseSave}
        />

        {/* Category Dialog */}
        <Dialog
          open={openCategoryDialog}
          onClose={() => setOpenCategoryDialog(false)}
        >
          <DialogTitle>
            {selectedCategory ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Category Name"
              value={formData.categoryName}
              onChange={(e) =>
                setFormData({ ...formData, categoryName: e.target.value })
              }
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleCategorySubmit} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AdminPanel;
