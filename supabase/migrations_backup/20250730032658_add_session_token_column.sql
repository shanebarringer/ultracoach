-- Add token column to better_auth_sessions table to match Better Auth official schema
ALTER TABLE better_auth_sessions 
ADD COLUMN token text NOT NULL DEFAULT 'temp_token_' || generate_random_uuid()::text;

-- Add unique constraint on token column
ALTER TABLE better_auth_sessions 
ADD CONSTRAINT better_auth_sessions_token_unique UNIQUE (token);

-- Remove the default after adding the constraint (production sessions will have proper tokens)
ALTER TABLE better_auth_sessions 
ALTER COLUMN token DROP DEFAULT;