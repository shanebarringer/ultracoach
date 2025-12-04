-- Migration: Add product tour tracking columns to user_onboarding table
-- Purpose: Support NextStep.js product tours for coach and runner onboarding
-- Date: 2025-12-04

-- Add tour completion tracking columns
ALTER TABLE user_onboarding
ADD COLUMN IF NOT EXISTS coach_tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS runner_tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_tour_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_tour_completed_at TIMESTAMPTZ;

-- Add index for efficient tour status queries
CREATE INDEX IF NOT EXISTS idx_user_onboarding_tour_status
ON user_onboarding (user_id, coach_tour_completed, runner_tour_completed);

-- Comment explaining the columns
COMMENT ON COLUMN user_onboarding.coach_tour_completed IS 'Whether the user has completed the coach product tour (NextStep.js)';
COMMENT ON COLUMN user_onboarding.runner_tour_completed IS 'Whether the user has completed the runner product tour (NextStep.js)';
COMMENT ON COLUMN user_onboarding.last_tour_started_at IS 'Timestamp when the user last started any product tour';
COMMENT ON COLUMN user_onboarding.last_tour_completed_at IS 'Timestamp when the user last completed any product tour';
