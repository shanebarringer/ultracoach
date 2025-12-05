-- Fix strava_activity_syncs schema mismatch
-- The Drizzle schema expects sync_error and synced_at columns that don't exist in production

-- Add missing columns expected by Drizzle schema
ALTER TABLE "strava_activity_syncs"
ADD COLUMN IF NOT EXISTS "sync_error" text,
ADD COLUMN IF NOT EXISTS "synced_at" timestamp with time zone;

-- Note: strava_activity_id is TEXT in both production and the Drizzle schema
-- We're keeping strava_activity_id as TEXT and preserving existing sync_type and match_confidence columns
-- while adding the new sync_error and synced_at columns expected by the Drizzle schema
