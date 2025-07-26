-- Rollback for Initial Better Auth and UltraCoach schema migration
-- This safely removes all tables and constraints created in the initial migration

-- Drop indexes first
DROP INDEX IF EXISTS "idx_notifications_is_read";
DROP INDEX IF EXISTS "idx_notifications_user_id";
DROP INDEX IF EXISTS "idx_messages_recipient_id";
DROP INDEX IF EXISTS "idx_messages_sender_id";
DROP INDEX IF EXISTS "idx_messages_conversation_id";
DROP INDEX IF EXISTS "idx_workouts_date";
DROP INDEX IF EXISTS "idx_workouts_runner_id";
DROP INDEX IF EXISTS "idx_workouts_training_plan_id";
DROP INDEX IF EXISTS "idx_training_plans_runner_id";
DROP INDEX IF EXISTS "idx_training_plans_coach_id";

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can update their notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can view their notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can view their conversations" ON "conversations";
DROP POLICY IF EXISTS "Users can send messages" ON "messages";
DROP POLICY IF EXISTS "Users can view their messages" ON "messages";
DROP POLICY IF EXISTS "Runners can manage their workouts" ON "workouts";
DROP POLICY IF EXISTS "Runners can view their workouts" ON "workouts";
DROP POLICY IF EXISTS "Coaches can manage their plans" ON "training_plans";
DROP POLICY IF EXISTS "Runners can view their plans" ON "training_plans";
DROP POLICY IF EXISTS "Coaches can view their plans" ON "training_plans";
DROP POLICY IF EXISTS "Users can update own profile" ON "better_auth_users";
DROP POLICY IF EXISTS "Users can view own profile" ON "better_auth_users";

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "template_phases";
DROP TABLE IF EXISTS "plan_templates";
DROP TABLE IF EXISTS "training_phases";
DROP TABLE IF EXISTS "races";
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "message_workout_links";
DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "workouts";
DROP TABLE IF EXISTS "training_plans";

-- Drop Better Auth tables
DROP TABLE IF EXISTS "better_auth_verification_tokens";
DROP TABLE IF EXISTS "better_auth_sessions";
DROP TABLE IF EXISTS "better_auth_accounts";
DROP TABLE IF EXISTS "better_auth_users";

-- Success message
SELECT 'UltraCoach schema rollback completed successfully!' AS status;