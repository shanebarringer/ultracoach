-- Rollback Migration: Fix RLS Policies for Better Auth Integration
-- Description: Rollback Better Auth RLS policy changes
-- Created: 2025-07-25
-- Author: Claude Code

BEGIN;

-- ============================================================================
-- ROLLBACK BETTER AUTH RLS POLICY FIXES
-- ============================================================================

-- Drop new policies
DROP POLICY IF EXISTS "better_auth_users_select_own" ON "better_auth_users";
DROP POLICY IF EXISTS "better_auth_users_update_own" ON "better_auth_users";
DROP POLICY IF EXISTS "better_auth_users_service_role" ON "better_auth_users";
DROP POLICY IF EXISTS "training_plans_coach_access" ON "training_plans";
DROP POLICY IF EXISTS "training_plans_runner_select" ON "training_plans";
DROP POLICY IF EXISTS "training_plans_runner_update" ON "training_plans";
DROP POLICY IF EXISTS "workouts_user_access" ON "workouts";
DROP POLICY IF EXISTS "workouts_coach_select" ON "workouts";
DROP POLICY IF EXISTS "workouts_coach_update" ON "workouts";
DROP POLICY IF EXISTS "conversations_participant_access" ON "conversations";
DROP POLICY IF EXISTS "conversations_create" ON "conversations";
DROP POLICY IF EXISTS "messages_participant_select" ON "messages";
DROP POLICY IF EXISTS "messages_send" ON "messages";
DROP POLICY IF EXISTS "messages_update_own" ON "messages";
DROP POLICY IF EXISTS "notifications_user_select" ON "notifications";
DROP POLICY IF EXISTS "notifications_user_update" ON "notifications";
DROP POLICY IF EXISTS "notifications_system_insert" ON "notifications";
DROP POLICY IF EXISTS "message_workout_links_select" ON "message_workout_links";
DROP POLICY IF EXISTS "better_auth_accounts_own" ON "better_auth_accounts";
DROP POLICY IF EXISTS "better_auth_sessions_own" ON "better_auth_sessions";
DROP POLICY IF EXISTS "better_auth_accounts_service" ON "better_auth_accounts";
DROP POLICY IF EXISTS "better_auth_sessions_service" ON "better_auth_sessions";

-- Drop helper functions
DROP FUNCTION IF EXISTS auth.current_user_id();
DROP FUNCTION IF EXISTS auth.user_id();

-- Restore original policies (using current_setting approach)
CREATE POLICY "Users can view own profile" ON "better_auth_users"
FOR SELECT USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own profile" ON "better_auth_users"
FOR UPDATE USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Coaches can view their plans" ON "training_plans"
FOR SELECT USING (coach_id = current_setting('app.current_user_id', true));

CREATE POLICY "Runners can view their plans" ON "training_plans"
FOR SELECT USING (runner_id = current_setting('app.current_user_id', true));

CREATE POLICY "Coaches can manage their plans" ON "training_plans"
FOR ALL USING (coach_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can view their workouts" ON "workouts"
FOR SELECT USING (runner_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can manage their workouts" ON "workouts"
FOR ALL USING (runner_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can view their messages" ON "messages"
FOR SELECT USING (sender_id = current_setting('app.current_user_id', true) OR recipient_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can send messages" ON "messages"
FOR INSERT WITH CHECK (sender_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can view their conversations" ON "conversations"
FOR SELECT USING (user1_id = current_setting('app.current_user_id', true) OR user2_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can view their notifications" ON "notifications"
FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their notifications" ON "notifications"
FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

-- Disable RLS on tables that were enabled
ALTER TABLE "better_auth_accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "message_workout_links" DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Log successful rollback
SELECT 'Rollback for Better Auth RLS policy fixes completed successfully' AS status;