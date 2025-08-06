import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '../lib/supabase'
import { 
  initializeAuth, 
  setSession, 
  signOut
} from '../features/auth/supabaseAuthSlice'
import { syncSupabaseUser } from '../services/supabaseApi'
import type { RootState } from '../store'

export const useSupabaseAuth = () => {
  const dispatch = useDispatch()
  const authState = useSelector((state: RootState) => state.supabaseAuth)

  useEffect(() => {
    // Initialize auth state
    dispatch(initializeAuth())

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        if (event === 'SIGNED_IN' && session?.user) {
          const user = {
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
        } else if (event === 'SIGNED_OUT') {
          dispatch(signOut())
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update session with new tokens
          const user = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || 
                   session.user.user_metadata?.full_name || 
                   session.user.email!.split('@')[0]
          }
          dispatch(setSession({ session, user }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [dispatch])

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    isInitialized: authState.isInitialized,
    error: authState.error
  }
}