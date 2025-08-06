import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { supabase, type AuthUser, type SupabaseSession } from '../../lib/supabase'
import { syncSupabaseUser } from '../../services/supabaseApi'

// Updated User type to match both Supabase and backend
interface User {
  id: string // Supabase UUID
  email: string
  name: string
  role?: 'USER' | 'ADMIN'
  // Keep compatibility with backend
  backendId?: number
  provider?: 'LOCAL' | 'GOOGLE'
}

interface AuthState {
  user: User | null
  session: SupabaseSession | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  isInitialized: boolean
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true, // Start as loading until we check existing session
  error: null,
  isAuthenticated: false,
  isInitialized: false
}

const supabaseAuthSlice = createSlice({
  name: 'supabaseAuth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload
      if (action.payload) {
        state.isLoading = false
      }
    },
    setSession: (state, action: PayloadAction<{
      session: SupabaseSession | null
      user: User | null
    }>) => {
      state.session = action.payload.session
      state.user = action.payload.user
      state.isAuthenticated = !!action.payload.session
      state.error = null
      state.isLoading = false
    },
    signInStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    signInSuccess: (state, action: PayloadAction<{
      session: SupabaseSession
      user: User
    }>) => {
      state.session = action.payload.session
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
    },
    signInFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      state.isAuthenticated = false
      state.session = null
      state.user = null
    },
    signOut: (state) => {
      state.user = null
      state.session = null
      state.isAuthenticated = false
      state.error = null
      state.isLoading = false
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setLoading,
  setInitialized,
  setSession,
  signInStart,
  signInSuccess,
  signInFailure,
  signOut,
  updateUser,
  clearError
} = supabaseAuthSlice.actions

// Async thunks for Supabase operations
export const initializeAuth = () => async (dispatch: any) => {
  try {
    // Get initial session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      dispatch(setSession({ session: null, user: null }))
      dispatch(setInitialized(true))
      return
    }

            if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || 
                   session.user.user_metadata?.full_name || 
                   session.user.email!.split('@')[0]
          }
          dispatch(setSession({ session, user }))
          
          // Sync user with backend
          try {
            await syncSupabaseUser()
          } catch (error) {
            console.error('Failed to sync user with backend:', error)
          }
        } else {
          dispatch(setSession({ session: null, user: null }))
        }
    
    dispatch(setInitialized(true))
  } catch (error) {
    console.error('Error initializing auth:', error)
    dispatch(setSession({ session: null, user: null }))
    dispatch(setInitialized(true))
  }
}

export const signUpWithEmail = (email: string, password: string, name: string) => 
  async (dispatch: any) => {
    dispatch(signInStart())
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name
          }
        }
      })

      if (error) {
        dispatch(signInFailure(error.message))
        return { error: error.message }
      }

      if (data.user && !data.session) {
        // Email confirmation required
        return { 
          success: true, 
          message: 'Please check your email to confirm your account before signing in.' 
        }
      }

      if (data.session && data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: name
        }
        dispatch(signInSuccess({ session: data.session, user }))
        return { success: true }
      }

      return { error: 'Unexpected error during sign up' }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed'
      dispatch(signInFailure(errorMessage))
      return { error: errorMessage }
    }
  }

export const signInWithEmail = (email: string, password: string) => 
  async (dispatch: any) => {
    dispatch(signInStart())
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        dispatch(signInFailure(error.message))
        return { error: error.message }
      }

      if (data.session && data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || 
                 data.user.user_metadata?.full_name || 
                 data.user.email!.split('@')[0]
        }
        dispatch(signInSuccess({ session: data.session, user }))
        return { success: true }
      }

      return { error: 'Unexpected error during sign in' }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed'
      dispatch(signInFailure(errorMessage))
      return { error: errorMessage }
    }
  }

export const signInWithGoogle = () => async (dispatch: any) => {
  dispatch(signInStart())
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      dispatch(signInFailure(error.message))
      return { error: error.message }
    }

    // OAuth redirect will handle the session
    return { success: true }
  } catch (error: any) {
    const errorMessage = error.message || 'Google sign in failed'
    dispatch(signInFailure(errorMessage))
    return { error: errorMessage }
  }
}

export const signOutUser = () => async (dispatch: any) => {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error signing out:', error)
    }
    
    dispatch(signOut())
  } catch (error) {
    console.error('Error signing out:', error)
    dispatch(signOut())
  }
}

export const resetPassword = (email: string) => async (dispatch: any) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      return { error: error.message }
    }

    return { 
      success: true, 
      message: 'Check your email for the password reset link.' 
    }
  } catch (error: any) {
    return { error: error.message || 'Password reset failed' }
  }
}

export const updatePassword = (password: string) => async (dispatch: any) => {
  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { error: error.message }
    }

    return { success: true, message: 'Password updated successfully.' }
  } catch (error: any) {
    return { error: error.message || 'Password update failed' }
  }
}

export default supabaseAuthSlice.reducer