-- Security Fix & Coach Connections
-- Migration: 0016_security_and_coach_connections.sql
--
-- This migration addresses code review feedback from PR #226:
-- 1. SECURITY: Remove raw token column (only store hash for validation)
-- 2. Add coach_connections table for coach-to-coach relationships
-- 3. Remove incorrect unique constraint on invitations
-- 4. Add coach_connection_id column to invitations

-- ============================================
-- 1. Create coach_connections table
-- ============================================
CREATE TABLE IF NOT EXISTS coach_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_a_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
    coach_b_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
    connection_started_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique bidirectional connections
    CONSTRAINT unique_coach_connection UNIQUE (coach_a_id, coach_b_id),
    -- Prevent self-connections
    CONSTRAINT no_self_connection CHECK (coach_a_id <> coach_b_id)
);

-- Indexes for coach_connections
CREATE INDEX IF NOT EXISTS idx_coach_connections_coach_a ON coach_connections(coach_a_id);
CREATE INDEX IF NOT EXISTS idx_coach_connections_coach_b ON coach_connections(coach_b_id);
CREATE INDEX IF NOT EXISTS idx_coach_connections_status ON coach_connections(status);

COMMENT ON TABLE coach_connections IS 'Coach-to-coach professional relationships for collaboration and referrals';

-- ============================================
-- 2. SECURITY: Remove raw token from coach_invitations
-- ============================================
-- The token column stored the raw invitation token which is a security risk
-- If the database is compromised, attackers could use these tokens
-- We only need the token_hash for validation (token comes from URL)

-- First, drop the unique constraint on token (if exists)
ALTER TABLE coach_invitations DROP CONSTRAINT IF EXISTS coach_invitations_token_key;

-- Drop the token column
ALTER TABLE coach_invitations DROP COLUMN IF EXISTS token;

-- Update the comment to reflect the security improvement
COMMENT ON COLUMN coach_invitations.token_hash IS 'SHA-256 hash of invitation token - raw token is never stored for security';

-- ============================================
-- 3. Remove incorrect unique constraint
-- ============================================
-- The unique constraint on (inviter_user_id, invitee_email) prevents
-- re-inviting someone after their invitation was revoked or expired
-- This is incorrect - we should allow re-invitations
-- The API logic handles preventing duplicate PENDING invitations

-- Drop the constraint if it exists
ALTER TABLE coach_invitations DROP CONSTRAINT IF EXISTS coach_invitations_inviter_user_id_invitee_email_key;

-- ============================================
-- 4. Add coach_connection_id column
-- ============================================
-- For coach-to-coach invitations, we need to track the created connection
ALTER TABLE coach_invitations
ADD COLUMN IF NOT EXISTS coach_connection_id UUID REFERENCES coach_connections(id) ON DELETE SET NULL;

-- Index for the new column
CREATE INDEX IF NOT EXISTS idx_coach_invitations_coach_connection ON coach_invitations(coach_connection_id);

COMMENT ON COLUMN coach_invitations.coach_connection_id IS 'Reference to coach_connections when invitation is for coach-to-coach relationship';
