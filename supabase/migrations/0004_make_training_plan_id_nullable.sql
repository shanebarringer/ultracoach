-- Migration: Make training_plan_id nullable in workouts table
-- This allows workouts to exist independently of training plans
-- Fixes the issue where workouts don't show up on calendar/weekly planner

-- Remove the NOT NULL constraint from training_plan_id
ALTER TABLE workouts ALTER COLUMN training_plan_id DROP NOT NULL;

-- Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_training_plan_id ON workouts(training_plan_id) WHERE training_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_date_status ON workouts(date, status);

-- Add a comment to document the change
COMMENT ON COLUMN workouts.training_plan_id IS 'Optional reference to training plan. Workouts can exist independently of training plans for ad-hoc logging.';