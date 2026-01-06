-- Add invitee_name column to coach_invitations
-- This column stores the name of the person being invited for email personalization
-- Fixes schema drift: column was in Drizzle schema.ts but missing from migrations
-- Migration: 0023_add_invitee_name_column.sql

ALTER TABLE coach_invitations
ADD COLUMN IF NOT EXISTS invitee_name TEXT;

COMMENT ON COLUMN coach_invitations.invitee_name IS 'Optional name for email personalization and signup pre-fill';
