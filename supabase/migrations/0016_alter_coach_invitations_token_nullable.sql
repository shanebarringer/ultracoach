-- Alter coach_invitations to make token column nullable
-- Migration: 0016_alter_coach_invitations_token_nullable.sql
--
-- Rationale: The API stores only the token_hash for security purposes.
-- The raw token is sent via email but never persisted to the database.
-- This prevents token exposure if the database is compromised.

-- Only run if the table exists and column is NOT NULL
DO $$
BEGIN
    -- Check if the column exists and is NOT NULL
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'coach_invitations'
        AND column_name = 'token'
        AND is_nullable = 'NO'
    ) THEN
        -- Alter the column to be nullable
        ALTER TABLE coach_invitations ALTER COLUMN token DROP NOT NULL;
        RAISE NOTICE 'Made coach_invitations.token column nullable';
    ELSE
        RAISE NOTICE 'coach_invitations.token is already nullable or does not exist';
    END IF;
END
$$;
