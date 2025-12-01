-- Migration: Add revoked_at timestamp to coach_invitations
-- Purpose: Track when invitations were revoked for proper audit trail

ALTER TABLE coach_invitations
ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN coach_invitations.revoked_at IS 'Timestamp when invitation was revoked by inviter';
