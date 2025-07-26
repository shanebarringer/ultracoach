-- Rollback for Enhanced Training Plans Schema
-- This safely removes all enhanced training features

-- 1. Drop triggers first
DROP TRIGGER IF EXISTS update_plan_templates_updated_at ON plan_templates;
DROP TRIGGER IF EXISTS update_plan_phases_updated_at ON plan_phases;
DROP TRIGGER IF EXISTS update_races_updated_at ON races;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. Drop indexes
DROP INDEX IF EXISTS idx_workouts_category;
DROP INDEX IF EXISTS idx_workouts_phase_id;
DROP INDEX IF EXISTS idx_plan_phases_training_plan_id;
DROP INDEX IF EXISTS idx_training_plans_runner_id_status;
DROP INDEX IF EXISTS idx_training_plans_status;
DROP INDEX IF EXISTS idx_training_plans_race_id;
DROP INDEX IF EXISTS idx_races_created_by;
DROP INDEX IF EXISTS idx_races_date;

-- 4. Drop RLS policies
DROP POLICY IF EXISTS "Users can manage their template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can view template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can update their templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can create templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON plan_templates;
DROP POLICY IF EXISTS "Coach can manage plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Coach and runner can view plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Users can view training phases" ON training_phases;
DROP POLICY IF EXISTS "Users can delete their races" ON races;
DROP POLICY IF EXISTS "Users can update their races" ON races;
DROP POLICY IF EXISTS "Users can create races" ON races;
DROP POLICY IF EXISTS "Users can view all races" ON races;

-- 5. Remove new columns from workouts table
ALTER TABLE workouts 
DROP COLUMN IF EXISTS completed_with_group,
DROP COLUMN IF EXISTS effort_level,
DROP COLUMN IF EXISTS weather_conditions,
DROP COLUMN IF EXISTS elevation_gain_feet,
DROP COLUMN IF EXISTS terrain_type,
DROP COLUMN IF EXISTS intensity_level,
DROP COLUMN IF EXISTS workout_category,
DROP COLUMN IF EXISTS phase_id;

-- 6. Remove new columns from training_plans table
ALTER TABLE training_plans
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS next_plan_id,
DROP COLUMN IF EXISTS previous_plan_id,
DROP COLUMN IF EXISTS peak_weekly_miles,
DROP COLUMN IF EXISTS total_weeks,
DROP COLUMN IF EXISTS phase_start_date,
DROP COLUMN IF EXISTS current_phase_id,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS goal_time_hours,
DROP COLUMN IF EXISTS goal_type,
DROP COLUMN IF EXISTS plan_type,
DROP COLUMN IF EXISTS race_id;

-- 7. Drop tables in reverse dependency order
DROP TABLE IF EXISTS template_phases;
DROP TABLE IF EXISTS plan_templates;
DROP TABLE IF EXISTS plan_phases;
DROP TABLE IF EXISTS training_phases;
DROP TABLE IF EXISTS races;

-- Success message
SELECT 'Enhanced training schema rollback completed successfully!' AS status;