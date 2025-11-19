-- Migration: Add missing indexes for coach-runner workout queries
-- Fixes 6+ second query time by adding indexes on columns used in WHERE clauses and JOINs
-- Addresses performance issue discovered during weekly planner testing

-- Add index on workouts.user_id for direct user workout queries
-- This supports: WHERE workouts.user_id IN (...)
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts (user_id);

-- Add index on training_plans.coach_id for coach filtering
-- This supports: WHERE training_plans.coach_id = $1
CREATE INDEX IF NOT EXISTS idx_training_plans_coach_id ON training_plans (coach_id);

-- Add index on training_plans.runner_id for runner filtering
-- This supports: WHERE training_plans.runner_id IN (...)
CREATE INDEX IF NOT EXISTS idx_training_plans_runner_id ON training_plans (runner_id);

-- Add comments to document index purposes
COMMENT ON INDEX idx_workouts_user_id IS 'Index for filtering workouts by user_id in direct user queries. Improves performance of standalone workout lookups.';
COMMENT ON INDEX idx_training_plans_coach_id IS 'Index for filtering training plans by coach_id. Essential for coach dashboard and workout queries.';
COMMENT ON INDEX idx_training_plans_runner_id IS 'Index for filtering training plans by runner_id. Essential for runner filtering in coach dashboard queries.';
