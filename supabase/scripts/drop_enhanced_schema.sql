-- DROP Enhanced Training Schema
-- WARNING: This will delete all data in the enhanced training tables
-- Use with caution - only for development/testing environments

-- Drop policies first
DROP POLICY IF EXISTS "Users can view all races" ON races;
DROP POLICY IF EXISTS "Users can create races" ON races;
DROP POLICY IF EXISTS "Users can update their races" ON races;
DROP POLICY IF EXISTS "Users can delete their races" ON races;
DROP POLICY IF EXISTS "Users can view training phases" ON training_phases;
DROP POLICY IF EXISTS "Coach and runner can view plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Coach can manage plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Users can view public templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can create templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can update their templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can view template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can manage their template phases" ON template_phases;

-- Drop triggers
DROP TRIGGER IF EXISTS update_races_updated_at ON races;
DROP TRIGGER IF EXISTS update_plan_phases_updated_at ON plan_phases;
DROP TRIGGER IF EXISTS update_plan_templates_updated_at ON plan_templates;

-- Drop indexes
DROP INDEX IF EXISTS idx_races_date;
DROP INDEX IF EXISTS idx_races_created_by;
DROP INDEX IF EXISTS idx_training_plans_race_id;
DROP INDEX IF EXISTS idx_training_plans_status;
DROP INDEX IF EXISTS idx_training_plans_runner_id_status;
DROP INDEX IF EXISTS idx_plan_phases_training_plan_id;
DROP INDEX IF EXISTS idx_workouts_phase_id;
DROP INDEX IF EXISTS idx_workouts_category;

-- Remove columns from existing tables (use CASCADE to handle dependencies)
ALTER TABLE training_plans 
DROP COLUMN IF EXISTS race_id CASCADE,
DROP COLUMN IF EXISTS plan_type CASCADE,
DROP COLUMN IF EXISTS goal_type CASCADE,
DROP COLUMN IF EXISTS goal_time_hours CASCADE,
DROP COLUMN IF EXISTS start_date CASCADE,
DROP COLUMN IF EXISTS end_date CASCADE,
DROP COLUMN IF EXISTS current_phase_id CASCADE,
DROP COLUMN IF EXISTS phase_start_date CASCADE,
DROP COLUMN IF EXISTS total_weeks CASCADE,
DROP COLUMN IF EXISTS peak_weekly_miles CASCADE,
DROP COLUMN IF EXISTS previous_plan_id CASCADE,
DROP COLUMN IF EXISTS next_plan_id CASCADE,
DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE workouts
DROP COLUMN IF EXISTS phase_id CASCADE,
DROP COLUMN IF EXISTS workout_category CASCADE,
DROP COLUMN IF EXISTS intensity_level CASCADE,
DROP COLUMN IF EXISTS terrain_type CASCADE,
DROP COLUMN IF EXISTS elevation_gain_feet CASCADE,
DROP COLUMN IF EXISTS weather_conditions CASCADE,
DROP COLUMN IF EXISTS effort_level CASCADE,
DROP COLUMN IF EXISTS completed_with_group CASCADE;

-- Drop tables in dependency order
DROP TABLE IF EXISTS template_phases CASCADE;
DROP TABLE IF EXISTS plan_templates CASCADE;
DROP TABLE IF EXISTS plan_phases CASCADE;
DROP TABLE IF EXISTS training_phases CASCADE;
DROP TABLE IF EXISTS races CASCADE;

-- Note: We keep the update_updated_at_column function as it might be used elsewhere

COMMENT ON SCHEMA public IS 'Enhanced training schema has been dropped. Run the setup scripts to recreate.';