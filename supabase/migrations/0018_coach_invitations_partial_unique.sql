-- Migration: Replace unconditional unique constraint with partial unique index
-- This allows re-invitations after decline/expiry/revoke while still preventing
-- duplicate pending invitations to the same email from the same coach.

-- Step 1: Drop the existing unconditional unique constraint
-- This constraint blocks ALL re-invitations, even after decline/expiry/revoke
ALTER TABLE coach_invitations
DROP CONSTRAINT IF EXISTS coach_invitations_inviter_user_id_invitee_email_key;

-- Also drop the Drizzle-generated constraint name if it exists
ALTER TABLE coach_invitations
DROP CONSTRAINT IF EXISTS coach_invitations_inviter_invitee_unique;

-- Step 2: Create partial unique index for pending invitations only
-- This ensures only ONE pending invitation can exist for a given coach-email pair,
-- but allows re-invitations after the previous one was declined/expired/revoked
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
ON coach_invitations(inviter_user_id, invitee_email)
WHERE status = 'pending';

-- Step 3: Remove the vestigial token column
-- The raw token is never stored - only the token_hash is used for validation
-- First drop the unique constraint on token
ALTER TABLE coach_invitations
DROP CONSTRAINT IF EXISTS coach_invitations_token_unique;

-- Then drop the column itself
ALTER TABLE coach_invitations
DROP COLUMN IF EXISTS token;

-- Add comment explaining the partial unique index
COMMENT ON INDEX idx_unique_pending_invitation IS
'Ensures only one pending invitation per coach-email pair. Allows re-invitations after decline/expiry/revoke.';
