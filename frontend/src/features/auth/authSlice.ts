import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';
import { supabase } from '../../services/supabase';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  supabaseId: string | null;
}

// Initialize state - will be populated by Supabase auth listener
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true, // Start with loading while checking Supabase session
  error: null,
  isAuthenticated: false,
  supabaseId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; supabaseId?: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      state.supabaseId = action.payload.supabaseId || null;

      // Persist to localStorage for backward compatibility
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      if (action.payload.supabaseId) {
        localStorage.setItem('supabaseId', action.payload.supabaseId);
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.supabaseId = null;

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('supabaseId');
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    clearError: (state) => {
      state.error = null;
    },
    resetLoading: (state) => {
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
  resetLoading,
  setLoading
} = authSlice.actions;

// Async action to initialize auth from Supabase session
export const initializeAuth = () => async (dispatch: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const userProfile = localStorage.getItem('user');
      let user: User;

      if (userProfile) {
        user = JSON.parse(userProfile);
      } else {
        // Create user object from Supabase data
        user = {
          id: 0, // Will be fetched from backend
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'USER',
          provider: session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'LOCAL',
        };
      }

      dispatch(loginSuccess({
        user,
        token: session.access_token,
        supabaseId: session.user.id,
      }));
    } else {
      dispatch(resetLoading());
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    dispatch(resetLoading());
  }
};

// Async action to handle Supabase logout
export const logoutAsync = () => async (dispatch: any) => {
  try {
    await supabase.auth.signOut();
    dispatch(logout());
  } catch (error) {
    console.error('Logout error:', error);
    dispatch(logout()); // Still clear local state
  }
};

export default authSlice.reducer;
