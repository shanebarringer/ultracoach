-- Comprehensive Migration to Better Auth IDs
-- This migration handles ALL tables with RLS policies that reference user columns

BEGIN;

-- Step 1: Show migration status
SELECT 'Starting comprehensive Better Auth ID migration' as status;

-- Step 2: Disable RLS policies on ALL tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE races DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_phases DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_phases DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Coaches can view their training plans" ON training_plans;
DROP POLICY IF EXISTS "Runners can view their training plans" ON training_plans;
DROP POLICY IF EXISTS "Coaches can create training plans" ON training_plans;
DROP POLICY IF EXISTS "Coaches can update their training plans" ON training_plans;
DROP POLICY IF EXISTS "Coaches can delete their training plans" ON training_plans;
DROP POLICY IF EXISTS "Users can view workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can insert workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can update workouts for their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view training phases" ON training_phases;
DROP POLICY IF EXISTS "Coach and runner can view plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Coach can manage plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Users can view public templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can create templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can update their templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can view template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can manage their template phases" ON template_phases;

-- Step 4: Drop ALL foreign key constraints
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_coach_id_fkey;
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_runner_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_user_id_fkey;
ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_recipient_id_fkey;
ALTER TABLE races DROP CONSTRAINT IF EXISTS races_created_by_fkey;
ALTER TABLE plan_templates DROP CONSTRAINT IF EXISTS plan_templates_created_by_fkey;
ALTER TABLE plan_phases DROP CONSTRAINT IF EXISTS plan_phases_training_plan_id_fkey;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_training_plan_id_fkey;
ALTER TABLE template_phases DROP CONSTRAINT IF EXISTS template_phases_template_id_fkey;

-- Step 5: Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE training_plans_backup AS SELECT * FROM training_plans;
CREATE TABLE workouts_backup AS SELECT * FROM workouts;
CREATE TABLE messages_backup AS SELECT * FROM messages;
CREATE TABLE notifications_backup AS SELECT * FROM notifications;
CREATE TABLE typing_status_backup AS SELECT * FROM typing_status;
CREATE TABLE races_backup AS SELECT * FROM races;
CREATE TABLE plan_templates_backup AS SELECT * FROM plan_templates;
CREATE TABLE training_phases_backup AS SELECT * FROM training_phases;
CREATE TABLE plan_phases_backup AS SELECT * FROM plan_phases;
CREATE TABLE template_phases_backup AS SELECT * FROM template_phases;

-- Step 6: Create mapping table
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    u.id::text as old_id,
    u.email,
    ba.id as new_id
FROM users u
JOIN better_auth_users ba ON u.email = ba.email;

-- Step 7: Update users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;

UPDATE users 
SET id = mapping.new_id
FROM user_id_mapping mapping
WHERE users.id = mapping.old_id;

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Step 8: Update training_plans table
ALTER TABLE training_plans ALTER COLUMN coach_id TYPE text USING coach_id::text;
ALTER TABLE training_plans ALTER COLUMN runner_id TYPE text USING runner_id::text;

UPDATE training_plans 
SET coach_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.coach_id = mapping.old_id;

UPDATE training_plans 
SET runner_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.runner_id = mapping.old_id;

-- Step 9: Update messages table
ALTER TABLE messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE messages ALTER COLUMN recipient_id TYPE text USING recipient_id::text;

UPDATE messages 
SET sender_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.sender_id = mapping.old_id;

UPDATE messages 
SET recipient_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.recipient_id = mapping.old_id;

-- Step 10: Update notifications table
ALTER TABLE notifications ALTER COLUMN user_id TYPE text USING user_id::text;

UPDATE notifications 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE notifications.user_id = mapping.old_id;

-- Step 11: Update typing_status table
ALTER TABLE typing_status ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE typing_status ALTER COLUMN recipient_id TYPE text USING recipient_id::text;

UPDATE typing_status 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE typing_status.user_id = mapping.old_id;

UPDATE typing_status 
SET recipient_id = mapping.new_id
FROM user_id_mapping mapping
WHERE typing_status.recipient_id = mapping.old_id;

-- Step 12: Update races table
ALTER TABLE races ALTER COLUMN created_by TYPE text USING created_by::text;

UPDATE races 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE races.created_by = mapping.old_id;

-- Step 13: Update plan_templates table
ALTER TABLE plan_templates ALTER COLUMN created_by TYPE text USING created_by::text;

UPDATE plan_templates 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE plan_templates.created_by = mapping.old_id;

-- Step 14: Re-add foreign key constraints
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
ALTER TABLE plan_phases ADD CONSTRAINT plan_phases_training_plan_id_fkey 
    FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE CASCADE;
ALTER TABLE workouts ADD CONSTRAINT workouts_training_plan_id_fkey 
    FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE CASCADE;
ALTER TABLE template_phases ADD CONSTRAINT template_phases_template_id_fkey 
    FOREIGN KEY (template_id) REFERENCES plan_templates(id) ON DELETE CASCADE;

-- Step 15: Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;

-- Step 16: Recreate RLS policies with text IDs
-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id);

-- Training plans policies
CREATE POLICY "Coaches can view their training plans" ON training_plans FOR SELECT USING (auth.uid()::text = coach_id);
CREATE POLICY "Runners can view their training plans" ON training_plans FOR SELECT USING (auth.uid()::text = runner_id);
CREATE POLICY "Coaches can create training plans" ON training_plans FOR INSERT WITH CHECK (auth.uid()::text = coach_id);
CREATE POLICY "Coaches can update their training plans" ON training_plans FOR UPDATE USING (auth.uid()::text = coach_id);
CREATE POLICY "Coaches can delete their training plans" ON training_plans FOR DELETE USING (auth.uid()::text = coach_id);

-- Workouts policies
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

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);

-- Training phases policies
CREATE POLICY "Users can view training phases" ON training_phases FOR SELECT USING (true);

-- Plan phases policies
CREATE POLICY "Coach and runner can view plan phases" ON plan_phases FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Coach can manage plan phases" ON plan_phases FOR ALL USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND tp.coach_id = auth.uid()::text
    )
);

-- Plan templates policies
CREATE POLICY "Users can view public templates" ON plan_templates FOR SELECT USING (
    is_public = true OR created_by = auth.uid()::text
);

CREATE POLICY "Users can create templates" ON plan_templates FOR INSERT WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update their templates" ON plan_templates FOR UPDATE USING (auth.uid()::text = created_by);

-- Template phases policies
CREATE POLICY "Users can view template phases" ON template_phases FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM plan_templates pt 
        WHERE pt.id = template_id 
        AND (pt.is_public = true OR pt.created_by = auth.uid()::text)
    )
);

CREATE POLICY "Users can manage their template phases" ON template_phases FOR ALL USING (
    EXISTS (
        SELECT 1 FROM plan_templates pt 
        WHERE pt.id = template_id 
        AND pt.created_by = auth.uid()::text
    )
);

-- Step 17: Verify data integrity
DO $$
DECLARE
    user_count_before INTEGER;
    user_count_after INTEGER;
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count_before FROM users_backup;
    SELECT COUNT(*) INTO user_count_after FROM users;
    SELECT COUNT(*) INTO mapping_count FROM user_id_mapping;
    
    IF user_count_before != user_count_after THEN
        RAISE EXCEPTION 'User count mismatch: before=%, after=%', user_count_before, user_count_after;
    END IF;
    
    RAISE NOTICE 'Migration verification: % users migrated successfully with % mappings', user_count_after, mapping_count;
END $$;

COMMIT;

-- Success message
SELECT 'Comprehensive database migration to Better Auth IDs completed successfully!' as migration_status;