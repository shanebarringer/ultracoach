-- Fix Better Auth session schema to match expected format
-- The session ID should be the token, not a separate field

-- First, check if the sessions table has the wrong schema
DO $$
BEGIN
  -- Check if token column exists (it shouldn't in proper Better Auth schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'better_auth_sessions' 
             AND column_name = 'token') THEN
    
    -- Drop the existing table and recreate with correct schema
    DROP TABLE IF EXISTS better_auth_sessions CASCADE;
    
    -- Create the correct session table schema
    CREATE TABLE better_auth_sessions (
      id TEXT PRIMARY KEY, -- This IS the session token
      expires_at TIMESTAMPTZ NOT NULL,
      user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add indexes for performance
    CREATE INDEX idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
    CREATE INDEX idx_better_auth_sessions_expires_at ON better_auth_sessions(expires_at);
    
    RAISE NOTICE 'Fixed Better Auth session schema - removed duplicate token field';
  ELSE
    RAISE NOTICE 'Better Auth session schema is already correct';
  END IF;
END
$$;