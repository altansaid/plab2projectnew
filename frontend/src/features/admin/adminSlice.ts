import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Case {
  id: number;
  title: string;
  description: string;
  scenario: string;
  doctorRole: string;
  patientRole: string;
  observerNotes: string;
  learningObjectives: string;
  duration: number;
  doctorNotes: string;
  patientNotes: string;
  category: {
    id: number;
    name: string;
    description?: string;
  };
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface AdminState {
  cases: Case[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  cases: [],
  categories: [],
  isLoading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setCases: (state, action: PayloadAction<Case[]>) => {
      state.cases = action.payload;
    },
    addCase: (state, action: PayloadAction<Case>) => {
      state.cases.push(action.payload);
    },
    updateCase: (state, action: PayloadAction<Case>) => {
      const index = state.cases.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.cases[index] = action.payload;
      }
    },
    deleteCase: (state, action: PayloadAction<number>) => {
      state.cases = state.cases.filter((c) => c.id !== action.payload);
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    deleteCategory: (state, action: PayloadAction<number>) => {
      state.categories = state.categories.filter((c) => c.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCases,
  addCase,
  updateCase,
  deleteCase,
  setCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setLoading,
  setError,
} = adminSlice.actions;

export default adminSlice.reducer; 