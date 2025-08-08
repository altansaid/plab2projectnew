import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface DecodedJwtPayload {
  exp?: number;
  [key: string]: any;
}

const base64UrlDecode = (base64Url: string): string => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  try {
    // Decode and handle UTF-8 properly
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch {
    return '';
  }
};

const getJwtExpirationMs = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = base64UrlDecode(parts[1]);
    if (!payloadJson) return null;
    const payload: DecodedJwtPayload = JSON.parse(payloadJson);
    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000; // exp is in seconds
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const expMs = getJwtExpirationMs(token);
  if (!expMs) return true; // Treat undecodable/invalid tokens as expired
  return Date.now() >= expMs;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Initialize state with token validation
const initializeState = (): AuthState => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // Check if token exists and is not expired (basic validation)
  if (token && userStr) {
    try {
      if (isTokenExpired(token)) {
        // Token expired → force logout state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        const user = JSON.parse(userStr);
        return {
          user,
          token,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        };
      }
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  
  return {
    user: null,
    token: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  };
};

const initialState: AuthState = initializeState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      
      // Persist to localStorage
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
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
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  resetLoading
} = authSlice.actions;

export default authSlice.reducer; 