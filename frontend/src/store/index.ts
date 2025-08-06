import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import supabaseAuthReducer from '../features/auth/supabaseAuthSlice';
import sessionReducer from '../features/session/sessionSlice';
import adminReducer from '../features/admin/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer, // Keep legacy auth for gradual migration
    supabaseAuth: supabaseAuthReducer,
    session: sessionReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 