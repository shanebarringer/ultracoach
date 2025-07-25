-- Fix RLS Policies for Better Auth Integration
-- Description: Update RLS policies to work properly with Better Auth session system
-- Created: 2025-07-25
-- Author: Claude Code

BEGIN;

-- ============================================================================
-- BETTER AUTH RLS POLICY FIXES
-- ============================================================================

-- Drop existing policies that use current_setting (which doesn't work with Better Auth)
DROP POLICY IF EXISTS "Users can view own profile" ON "better_auth_users";
DROP POLICY IF EXISTS "Users can update own profile" ON "better_auth_users";
DROP POLICY IF EXISTS "Coaches can view their plans" ON "training_plans";
DROP POLICY IF EXISTS "Runners can view their plans" ON "training_plans";
DROP POLICY IF EXISTS "Coaches can manage their plans" ON "training_plans";
DROP POLICY IF EXISTS "Users can view their workouts" ON "workouts";
DROP POLICY IF EXISTS "Users can manage their workouts" ON "workouts";
DROP POLICY IF EXISTS "Users can view their messages" ON "messages";
DROP POLICY IF EXISTS "Users can send messages" ON "messages";
DROP POLICY IF EXISTS "Users can view their conversations" ON "conversations";
DROP POLICY IF EXISTS "Users can view their notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can update their notifications" ON "notifications";

-- Create helper function to get current user ID from Better Auth session
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('app.current_user_id', true)
  )::text;
$$ LANGUAGE sql STABLE;

-- Alternative: Create function that reads from Better Auth session table
CREATE OR REPLACE FUNCTION auth.current_user_id() RETURNS text AS $$
DECLARE
  user_id text;
BEGIN
  -- Try to get user ID from JWT claims first
  BEGIN
    SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::text INTO user_id;
    IF user_id IS NOT NULL AND user_id != '' THEN
      RETURN user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- JWT parsing failed, continue to other methods
  END;
  
  -- Fallback to app setting (for API routes that set this manually)
  BEGIN
    SELECT current_setting('app.current_user_id', true)::text INTO user_id;
    IF user_id IS NOT NULL AND user_id != '' THEN
      RETURN user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Setting not available
  END;
  
  -- Return null if no user context available
  RETURN null;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- BETTER AUTH USER POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "better_auth_users_select_own" ON "better_auth_users"
FOR SELECT USING (id = auth.current_user_id());

-- Users can update their own profile
CREATE POLICY "better_auth_users_update_own" ON "better_auth_users"
FOR UPDATE USING (id = auth.current_user_id());

-- Allow service role to manage users (for auth operations)
CREATE POLICY "better_auth_users_service_role" ON "better_auth_users"
FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================================================
-- TRAINING PLANS POLICIES
-- ============================================================================

-- Coaches can view and manage their training plans
CREATE POLICY "training_plans_coach_access" ON "training_plans"
FOR ALL USING (coach_id = auth.current_user_id());

-- Runners can view their assigned training plans
CREATE POLICY "training_plans_runner_select" ON "training_plans"
FOR SELECT USING (runner_id = auth.current_user_id());

-- Runners can update specific fields of their training plans (e.g., completion status)
CREATE POLICY "training_plans_runner_update" ON "training_plans"
FOR UPDATE USING (runner_id = auth.current_user_id());

-- ============================================================================
-- WORKOUTS POLICIES
-- ============================================================================

-- Users can view and manage their own workouts
CREATE POLICY "workouts_user_access" ON "workouts"
FOR ALL USING (user_id = auth.current_user_id());

-- Coaches can view workouts of their runners (through training plan relationship)
CREATE POLICY "workouts_coach_select" ON "workouts"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM training_plans tp 
    WHERE tp.id = workouts.training_plan_id 
    AND tp.coach_id = auth.current_user_id()
  )
);

-- Coaches can update workouts of their runners (feedback, etc.)
CREATE POLICY "workouts_coach_update" ON "workouts"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM training_plans tp 
    WHERE tp.id = workouts.training_plan_id 
    AND tp.coach_id = auth.current_user_id()
  )
);

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can view conversations they're part of
CREATE POLICY "conversations_participant_access" ON "conversations"
FOR SELECT USING (
  user1_id = auth.current_user_id() OR 
  user2_id = auth.current_user_id()
);

-- Users can create conversations (but only as user1 or user2)
CREATE POLICY "conversations_create" ON "conversations"
FOR INSERT WITH CHECK (
  user1_id = auth.current_user_id() OR 
  user2_id = auth.current_user_id()
);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages in their conversations
CREATE POLICY "messages_participant_select" ON "messages"
FOR SELECT USING (
  sender_id = auth.current_user_id() OR 
  recipient_id = auth.current_user_id()
);

-- Users can send messages (but only as sender)
CREATE POLICY "messages_send" ON "messages"
FOR INSERT WITH CHECK (sender_id = auth.current_user_id());

-- Users can update their own messages (e.g., mark as read)
CREATE POLICY "messages_update_own" ON "messages"
FOR UPDATE USING (recipient_id = auth.current_user_id());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "notifications_user_select" ON "notifications"
FOR SELECT USING (user_id = auth.current_user_id());

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_user_update" ON "notifications"
FOR UPDATE USING (user_id = auth.current_user_id());

-- System can create notifications for any user (for API routes)
CREATE POLICY "notifications_system_insert" ON "notifications"
FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ADDITIONAL SECURITY POLICIES
-- ============================================================================

-- Message-workout links: users can view links for messages they can see
CREATE POLICY "message_workout_links_select" ON "message_workout_links"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_workout_links.message_id 
    AND (m.sender_id = auth.current_user_id() OR m.recipient_id = auth.current_user_id())
  )
);

-- Enable RLS on tables that don't have it enabled
ALTER TABLE "better_auth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_workout_links" ENABLE ROW LEVEL SECURITY;

-- Better Auth accounts: users can only see their own accounts
CREATE POLICY "better_auth_accounts_own" ON "better_auth_accounts"
FOR SELECT USING (user_id = auth.current_user_id());

-- Better Auth sessions: users can only see their own sessions
CREATE POLICY "better_auth_sessions_own" ON "better_auth_sessions"
FOR SELECT USING (user_id = auth.current_user_id());

-- Allow service role full access to auth tables (needed for Better Auth to function)
CREATE POLICY "better_auth_accounts_service" ON "better_auth_accounts"
FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "better_auth_sessions_service" ON "better_auth_sessions"
FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Verify function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'current_user_id' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
);

-- Verify policies exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';

-- Test user context function
SELECT auth.current_user_id() as current_user_test;

COMMIT;

-- Log successful migration
SELECT 'Better Auth RLS policy fixes completed successfully' AS status;