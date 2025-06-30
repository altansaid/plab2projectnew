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
  const [openCaseDialog, setOpenCaseDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    doctorNotes: "",
    patientNotes: "",
    categoryName: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesResponse, categoriesResponse] = await Promise.all([
          api.get("/cases"),
          api.get("/categories"),
        ]);
        dispatch(setCases(casesResponse.data));
        dispatch(setCategories(categoriesResponse.data));
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      }
    };

    fetchData();
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCaseDialogOpen = (caseItem?: any) => {
    if (caseItem) {
      setSelectedItem(caseItem);
      setFormData({
        ...formData,
        title: caseItem.title,
        category: caseItem.category,
        doctorNotes: caseItem.doctorNotes,
        patientNotes: caseItem.patientNotes,
      });
    } else {
      setSelectedItem(null);
      setFormData({
        ...formData,
        title: "",
        category: "",
        doctorNotes: "",
        patientNotes: "",
      });
    }
    setOpenCaseDialog(true);
  };

  const handleCategoryDialogOpen = (category?: any) => {
    if (category) {
      setSelectedItem(category);
      setFormData({ ...formData, categoryName: category.name });
    } else {
      setSelectedItem(null);
      setFormData({ ...formData, categoryName: "" });
    }
    setOpenCategoryDialog(true);
  };

  const handleCaseSubmit = async () => {
    try {
      if (selectedItem) {
        const response = await api.put(`/cases/${selectedItem.id}`, {
          title: formData.title,
          category: formData.category,
          doctorNotes: formData.doctorNotes,
          patientNotes: formData.patientNotes,
        });
        dispatch(updateCase(response.data));
      } else {
        const response = await api.post("/cases", {
          title: formData.title,
          category: formData.category,
          doctorNotes: formData.doctorNotes,
          patientNotes: formData.patientNotes,
        });
        dispatch(addCase(response.data));
      }
      setOpenCaseDialog(false);
    } catch (error) {
      console.error("Failed to save case:", error);
    }
  };

  const handleCategorySubmit = async () => {
    try {
      if (selectedItem) {
        const response = await api.put(`/categories/${selectedItem.id}`, {
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

  const handleDelete = async (type: "case" | "category", id: string) => {
    try {
      if (type === "case") {
        await api.delete(`/cases/${id}`);
        dispatch(deleteCase(id));
      } else {
        await api.delete(`/categories/${id}`);
        dispatch(deleteCategory(id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
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
            <Button variant="contained" onClick={() => handleCaseDialogOpen()}>
              Add New Case
            </Button>
          </Box>

          <List>
            {cases.map((caseItem) => (
              <ListItem key={caseItem.id}>
                <ListItemText
                  primary={caseItem.title}
                  secondary={caseItem.category}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleCaseDialogOpen(caseItem)}
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

        {/* Case Dialog */}
        <Dialog
          open={openCaseDialog}
          onClose={() => setOpenCaseDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedItem ? "Edit Case" : "Add New Case"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Doctor Notes"
              value={formData.doctorNotes}
              onChange={(e) =>
                setFormData({ ...formData, doctorNotes: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Patient Notes"
              value={formData.patientNotes}
              onChange={(e) =>
                setFormData({ ...formData, patientNotes: e.target.value })
              }
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCaseDialog(false)}>Cancel</Button>
            <Button onClick={handleCaseSubmit} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Category Dialog */}
        <Dialog
          open={openCategoryDialog}
          onClose={() => setOpenCategoryDialog(false)}
        >
          <DialogTitle>
            {selectedItem ? "Edit Category" : "Add New Category"}
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
