-- Better Auth Migration
-- This migration creates the necessary tables for Better Auth

-- Create users table compatible with Better Auth
CREATE TABLE IF NOT EXISTS better_auth_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Additional fields for UltraCoach
    role TEXT DEFAULT 'runner' CHECK (role IN ('runner', 'coach')),
    full_name TEXT
);

-- Create accounts table for Better Auth
CREATE TABLE IF NOT EXISTS better_auth_accounts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, account_id)
);

-- Create sessions table for Better Auth
CREATE TABLE IF NOT EXISTS better_auth_sessions (
    id TEXT PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification tokens table
CREATE TABLE IF NOT EXISTS better_auth_verification_tokens (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_better_auth_users_email ON better_auth_users(email);
CREATE INDEX IF NOT EXISTS idx_better_auth_accounts_user_id ON better_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_token ON better_auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_better_auth_verification_tokens_identifier ON better_auth_verification_tokens(identifier);

-- Add RLS policies for Better Auth tables
ALTER TABLE better_auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access their own data" ON better_auth_users
    FOR ALL USING (auth.uid()::text = id);

-- Accounts can only be accessed by their owner
CREATE POLICY "Users can access their own accounts" ON better_auth_accounts
    FOR ALL USING (auth.uid()::text = user_id);

-- Sessions can only be accessed by their owner
CREATE POLICY "Users can access their own sessions" ON better_auth_sessions
    FOR ALL USING (auth.uid()::text = user_id);

-- Verification tokens are managed by the system
CREATE POLICY "System can manage verification tokens" ON better_auth_verification_tokens
    FOR ALL USING (TRUE);

-- Create a function to migrate existing users
CREATE OR REPLACE FUNCTION migrate_users_to_better_auth()
RETURNS VOID AS $$
BEGIN
    -- Insert existing users into better_auth_users
    INSERT INTO better_auth_users (id, email, name, role, full_name, created_at, updated_at)
    SELECT 
        id,
        email,
        full_name,
        role,
        full_name,
        created_at,
        updated_at
    FROM users
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = EXCLUDED.updated_at;

    -- Create accounts for existing users with password authentication
    INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
    SELECT 
        gen_random_uuid()::text,
        email,
        'credential',
        id,
        password_hash,
        created_at,
        updated_at
    FROM users
    WHERE password_hash IS NOT NULL
    ON CONFLICT (provider_id, account_id) DO UPDATE SET
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;