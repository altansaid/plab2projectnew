import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a properly typed Supabase client
let supabaseClient: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
  // Create a mock client that will gracefully fail
  // This prevents the app from crashing when env vars are missing
  supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({ data: { url: null, provider: 'google' }, error: { message: 'Supabase not configured' } }),
      resetPasswordForEmail: async () => ({ data: {}, error: { message: 'Supabase not configured' } }),
      updateUser: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    },
  } as unknown as SupabaseClient;
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;

export type SupabaseUser = {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
};
