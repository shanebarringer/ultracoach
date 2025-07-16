-- Complete Migration to Better Auth IDs
-- This migration updates all tables to use Better Auth IDs

BEGIN;

-- Step 1: Disable RLS policies temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE races DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing RLS policies  
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Coaches can view their training plans" ON training_plans;
DROP POLICY IF EXISTS "Runners can view their training plans" ON training_plans;
DROP POLICY IF EXISTS "Coaches can create training plans" ON training_plans;
DROP POLICY IF EXISTS "Coaches can update their training plans" ON training_plans;
DROP POLICY IF EXISTS "Users can view workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can insert workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can update workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Step 3: Drop all foreign key constraints that reference users table
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_coach_id_fkey;
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_runner_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_user_id_fkey;
ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_recipient_id_fkey;
ALTER TABLE races DROP CONSTRAINT IF EXISTS races_created_by_fkey;
ALTER TABLE plan_templates DROP CONSTRAINT IF EXISTS plan_templates_created_by_fkey;

-- Step 4: Create backup tables before migration
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE training_plans_backup AS SELECT * FROM training_plans;
CREATE TABLE workouts_backup AS SELECT * FROM workouts;
CREATE TABLE messages_backup AS SELECT * FROM messages;
CREATE TABLE notifications_backup AS SELECT * FROM notifications;
CREATE TABLE typing_status_backup AS SELECT * FROM typing_status;
CREATE TABLE races_backup AS SELECT * FROM races;
CREATE TABLE plan_templates_backup AS SELECT * FROM plan_templates;

-- Step 5: Create mapping table for the migration
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    u.id as old_id,
    u.email,
    ba.id as new_id
FROM users u
JOIN better_auth_users ba ON u.email = ba.email;

-- Step 6: Update users table to use Better Auth IDs as primary key
ALTER TABLE users ALTER COLUMN id TYPE text;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Update user IDs to Better Auth IDs
UPDATE users 
SET id = mapping.new_id
FROM user_id_mapping mapping
WHERE users.id::text = mapping.old_id;

-- Re-add primary key constraint
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Step 7: Update all foreign key references to use Better Auth IDs
-- Update training_plans
ALTER TABLE training_plans ALTER COLUMN coach_id TYPE text;
ALTER TABLE training_plans ALTER COLUMN runner_id TYPE text;

UPDATE training_plans 
SET coach_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.coach_id::text = mapping.old_id;

UPDATE training_plans 
SET runner_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.runner_id::text = mapping.old_id;

-- Update messages
ALTER TABLE messages ALTER COLUMN sender_id TYPE text;
ALTER TABLE messages ALTER COLUMN recipient_id TYPE text;

UPDATE messages 
SET sender_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.sender_id::text = mapping.old_id;

UPDATE messages 
SET recipient_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.recipient_id::text = mapping.old_id;

-- Update notifications
ALTER TABLE notifications ALTER COLUMN user_id TYPE text;

UPDATE notifications 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE notifications.user_id::text = mapping.old_id;

-- Update typing_status
ALTER TABLE typing_status ALTER COLUMN user_id TYPE text;
ALTER TABLE typing_status ALTER COLUMN recipient_id TYPE text;

UPDATE typing_status 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE typing_status.user_id::text = mapping.old_id;

UPDATE typing_status 
SET recipient_id = mapping.new_id
FROM user_id_mapping mapping
WHERE typing_status.recipient_id::text = mapping.old_id;

-- Update races
ALTER TABLE races ALTER COLUMN created_by TYPE text;

UPDATE races 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE races.created_by::text = mapping.old_id;

-- Update plan_templates
ALTER TABLE plan_templates ALTER COLUMN created_by TYPE text;

UPDATE plan_templates 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE plan_templates.created_by::text = mapping.old_id;

-- Step 8: Re-add foreign key constraints
ALTER TABLE training_plans ADD CONSTRAINT training_plans_coach_id_fkey 
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE training_plans ADD CONSTRAINT training_plans_runner_id_fkey 
    FOREIGN KEY (runner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE typing_status ADD CONSTRAINT typing_status_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE typing_status ADD CONSTRAINT typing_status_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE races ADD CONSTRAINT races_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE plan_templates ADD CONSTRAINT plan_templates_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 9: Re-enable RLS and recreate policies with text IDs
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies with text IDs
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Coaches can view their training plans" ON training_plans FOR SELECT USING (auth.uid()::text = coach_id);
CREATE POLICY "Runners can view their training plans" ON training_plans FOR SELECT USING (auth.uid()::text = runner_id);
CREATE POLICY "Coaches can create training plans" ON training_plans FOR INSERT WITH CHECK (auth.uid()::text = coach_id);
CREATE POLICY "Coaches can update their training plans" ON training_plans FOR UPDATE USING (auth.uid()::text = coach_id);

CREATE POLICY "Users can view workouts for their training plans" ON workouts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Users can insert workouts for their training plans" ON workouts FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Users can update workouts for their training plans" ON workouts FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);

-- Step 10: Verify data integrity
DO $$
DECLARE
    user_count_before INTEGER;
    user_count_after INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count_before FROM users_backup;
    SELECT COUNT(*) INTO user_count_after FROM users;
    
    IF user_count_before != user_count_after THEN
        RAISE EXCEPTION 'User count mismatch: before=%, after=%', user_count_before, user_count_after;
    END IF;
    
    RAISE NOTICE 'Migration verification: % users migrated successfully', user_count_after;
END $$;

COMMIT;

-- Success message
SELECT 'Database migration to Better Auth IDs completed successfully!' as migration_status;