-- Fix strava_activity_syncs schema mismatch
-- The Drizzle schema expects sync_error and synced_at columns that don't exist in production

-- Add missing columns expected by Drizzle schema
ALTER TABLE "strava_activity_syncs"
ADD COLUMN IF NOT EXISTS "sync_error" text,
ADD COLUMN IF NOT EXISTS "synced_at" timestamp with time zone;

-- Note: strava_activity_id is TEXT in production but BIGINT in Drizzle schema
-- We're keeping it as TEXT (safer for large activity IDs) and updating the schema to match
-- Also keeping sync_type and match_confidence columns that exist in production
