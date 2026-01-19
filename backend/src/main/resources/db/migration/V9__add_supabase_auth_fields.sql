-- Add Supabase Auth integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS migrated_to_supabase BOOLEAN DEFAULT FALSE;

-- Create index for faster Supabase ID lookups
CREATE INDEX IF NOT EXISTS idx_user_supabase_id ON users(supabase_id);
