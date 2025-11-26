-- Coach Invitations Table
-- Allows coaches to invite runners (or other coaches) via email
-- Migration: 0015_coach_invitations.sql

CREATE TABLE IF NOT EXISTS coach_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    invited_role TEXT NOT NULL DEFAULT 'runner' CHECK (invited_role IN ('runner', 'coach')),
    personal_message TEXT,
    token TEXT UNIQUE, -- Nullable: raw token only sent via email, hash stored for validation
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    invitee_user_id TEXT REFERENCES better_auth_users(id) ON DELETE SET NULL,
    coach_runner_relationship_id UUID REFERENCES coach_runners(id) ON DELETE SET NULL,
    resend_count INTEGER NOT NULL DEFAULT 0,
    last_resent_at TIMESTAMPTZ,
    decline_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (inviter_user_id, invitee_email)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_coach_invitations_token_hash ON coach_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_invitee_email ON coach_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_inviter_user_id ON coach_invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_status ON coach_invitations(status);

-- Comments for documentation
COMMENT ON TABLE coach_invitations IS 'Coach invitations for inviting new users to join UltraCoach via email';
COMMENT ON COLUMN coach_invitations.token IS 'Secure URL-safe token for invitation link (also stored as hash for validation)';
COMMENT ON COLUMN coach_invitations.token_hash IS 'SHA-256 hash of token for secure database lookup';
COMMENT ON COLUMN coach_invitations.status IS 'Invitation status: pending, accepted, declined, expired, revoked';
