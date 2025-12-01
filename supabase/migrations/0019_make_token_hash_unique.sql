-- Migration: Make token_hash index unique
-- The token_hash should be unique for security - each invitation token should only exist once
-- This prevents token collision attacks and ensures one-to-one token-invitation mapping

-- Drop the existing non-unique index
DROP INDEX IF EXISTS idx_coach_invitations_token_hash;

-- Create unique index on token_hash
-- This is crucial for security: prevents the same token from being reused across invitations
CREATE UNIQUE INDEX idx_coach_invitations_token_hash
ON coach_invitations (token_hash);

COMMENT ON INDEX idx_coach_invitations_token_hash IS 'Unique index on token_hash for secure token lookup and collision prevention';
