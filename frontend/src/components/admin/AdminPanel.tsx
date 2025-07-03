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
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
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
  console.log("🚨 AdminPanel component is mounting!");

  const dispatch = useDispatch();
  const { cases, categories } = useSelector((state: RootState) => state.admin);
  const [tabValue, setTabValue] = useState(0);

  // Debug: Log Redux state
  console.log("🏪 Redux Admin State - Cases:", cases);
  console.log("🏪 Redux Admin State - Categories:", categories);
  const [openCaseEditor, setOpenCaseEditor] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    categoryName: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      console.log("🔄 AdminPanel: Starting to fetch data...");
      try {
        console.log("📡 Making API calls to /cases and /cases/categories");
        const [casesResponse, categoriesResponse] = await Promise.all([
          api.get("/cases"),
          api.get("/categories"),
        ]);
        console.log("✅ Cases response:", casesResponse.data);
        console.log("✅ Categories response:", categoriesResponse.data);
        dispatch(setCases(casesResponse.data));
        dispatch(setCategories(categoriesResponse.data));
        console.log("✅ Data dispatched to Redux store");
      } catch (error: any) {
        console.error("❌ Failed to fetch admin data:", error);
        console.error(
          "❌ Error details:",
          error.response?.data || error.message
        );
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
      console.log("Case saved successfully");
    } catch (error) {
      console.error("Failed to save case:", error);
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
      console.error("Failed to save category:", error);
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
      console.error("Failed to delete:", error);

      // Show user-friendly error message
      const errorMessage =
        error.response?.data?.error ||
        `Failed to delete ${type}. Please try again.`;

      // You can replace this with a proper toast/snackbar notification
      alert(errorMessage);
    }
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
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" onClick={() => handleCaseEditorOpen()}>
              Add New Case
            </Button>
          </Box>

          <List>
            {cases.map((caseItem) => (
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
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleCategoryDialogOpen()}
            >
              Add New Category
            </Button>
          </Box>

          <List>
            {categories.map((category) => (
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
