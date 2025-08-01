-- DROP Complete UltraCoach Schema
-- WARNING: This will delete ALL data from ALL application tables.
-- Use with caution - only for development/testing environments.

-- Drop tables in reverse dependency order.
-- CASCADE will handle dependent objects like policies, triggers, indexes, and foreign key constraints.

DROP TABLE IF EXISTS message_workout_links CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS training_plans CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS template_phases CASCADE;
DROP TABLE IF EXISTS plan_templates CASCADE;
DROP TABLE IF EXISTS training_phases CASCADE;
DROP TABLE IF EXISTS races CASCADE;
DROP TABLE IF EXISTS better_auth_verification_tokens CASCADE;
DROP TABLE IF EXISTS better_auth_sessions CASCADE;
DROP TABLE IF EXISTS better_auth_accounts CASCADE;
DROP TABLE IF EXISTS better_auth_users CASCADE;

COMMENT ON SCHEMA public IS 'Complete UltraCoach schema has been dropped. Run the setup scripts to recreate.';
