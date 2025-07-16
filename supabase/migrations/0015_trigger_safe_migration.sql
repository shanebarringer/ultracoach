-- Trigger-Safe Migration to Better Auth IDs
-- This migration handles triggers properly to prevent conflicts

BEGIN;

-- Step 1: Show migration status
SELECT 'Starting TRIGGER-SAFE Better Auth ID migration' as status;

-- Step 2: Disable ALL triggers on relevant tables
ALTER TABLE notifications DISABLE TRIGGER ALL;
ALTER TABLE users DISABLE TRIGGER ALL;
ALTER TABLE training_plans DISABLE TRIGGER ALL;
ALTER TABLE workouts DISABLE TRIGGER ALL;
ALTER TABLE messages DISABLE TRIGGER ALL;
ALTER TABLE typing_status DISABLE TRIGGER ALL;
ALTER TABLE races DISABLE TRIGGER ALL;
ALTER TABLE plan_templates DISABLE TRIGGER ALL;
ALTER TABLE plan_phases DISABLE TRIGGER ALL;
ALTER TABLE template_phases DISABLE TRIGGER ALL;

-- Step 3: Disable RLS on ALL tables
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
ALTER TABLE better_auth_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_verification_tokens DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies
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
DROP POLICY IF EXISTS "Users can view workouts from their training plans" ON workouts;
DROP POLICY IF EXISTS "Users can update workouts from their training plans" ON workouts;
DROP POLICY IF EXISTS "Coaches can create workouts" ON workouts;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view training phases" ON training_phases;
DROP POLICY IF EXISTS "Coach and runner can view plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Coach can manage plan phases" ON plan_phases;
DROP POLICY IF EXISTS "Users can view public templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can create templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can update their templates" ON plan_templates;
DROP POLICY IF EXISTS "Users can view template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can manage their template phases" ON template_phases;
DROP POLICY IF EXISTS "Users can manage their own typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can see typing status directed at them" ON typing_status;
DROP POLICY IF EXISTS "Users can view all races" ON races;
DROP POLICY IF EXISTS "Users can create races" ON races;
DROP POLICY IF EXISTS "Users can update their races" ON races;
DROP POLICY IF EXISTS "Users can delete their races" ON races;
DROP POLICY IF EXISTS "Users can access their own data" ON better_auth_users;
DROP POLICY IF EXISTS "Users can access their own sessions" ON better_auth_sessions;
DROP POLICY IF EXISTS "Users can access their own accounts" ON better_auth_accounts;
DROP POLICY IF EXISTS "System can manage verification tokens" ON better_auth_verification_tokens;

-- Step 5: Drop ALL foreign key constraints
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
ALTER TABLE better_auth_sessions DROP CONSTRAINT IF EXISTS better_auth_sessions_user_id_better_auth_users_id_fk;
ALTER TABLE better_auth_accounts DROP CONSTRAINT IF EXISTS better_auth_accounts_user_id_better_auth_users_id_fk;

-- Step 6: Create backup tables
CREATE TABLE users_backup_trigger_safe AS SELECT * FROM users;
CREATE TABLE training_plans_backup_trigger_safe AS SELECT * FROM training_plans;
CREATE TABLE workouts_backup_trigger_safe AS SELECT * FROM workouts;
CREATE TABLE messages_backup_trigger_safe AS SELECT * FROM messages;
CREATE TABLE notifications_backup_trigger_safe AS SELECT * FROM notifications;
CREATE TABLE typing_status_backup_trigger_safe AS SELECT * FROM typing_status;
CREATE TABLE races_backup_trigger_safe AS SELECT * FROM races;
CREATE TABLE plan_templates_backup_trigger_safe AS SELECT * FROM plan_templates;

-- Step 7: Create user mapping
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    u.id::text as old_id,
    u.email,
    ba.id as new_id
FROM users u
JOIN better_auth_users ba ON u.email = ba.email;

-- Show mapping info
SELECT 'User ID mapping created:' as info;
SELECT COUNT(*) as total_mappings FROM user_id_mapping;

-- Step 8: Update users table
SELECT 'Updating users table...' as status;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;

UPDATE users 
SET id = mapping.new_id
FROM user_id_mapping mapping
WHERE users.id = mapping.old_id;

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Step 9: Update training_plans table
SELECT 'Updating training_plans table...' as status;
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

-- Step 10: Update messages table
SELECT 'Updating messages table...' as status;
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

-- Step 11: Update notifications table (with triggers disabled)
SELECT 'Updating notifications table...' as status;
ALTER TABLE notifications ALTER COLUMN user_id TYPE text USING user_id::text;

UPDATE notifications 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE notifications.user_id = mapping.old_id;

-- Step 12: Update typing_status table
SELECT 'Updating typing_status table...' as status;
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

-- Step 13: Update races table
SELECT 'Updating races table...' as status;
ALTER TABLE races ALTER COLUMN created_by TYPE text USING created_by::text;

UPDATE races 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE races.created_by = mapping.old_id;

-- Step 14: Update plan_templates table
SELECT 'Updating plan_templates table...' as status;
ALTER TABLE plan_templates ALTER COLUMN created_by TYPE text USING created_by::text;

UPDATE plan_templates 
SET created_by = mapping.new_id
FROM user_id_mapping mapping
WHERE plan_templates.created_by = mapping.old_id;

-- Step 15: Re-add foreign key constraints
SELECT 'Re-adding foreign key constraints...' as status;
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
ALTER TABLE better_auth_sessions ADD CONSTRAINT better_auth_sessions_user_id_better_auth_users_id_fk 
    FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;
ALTER TABLE better_auth_accounts ADD CONSTRAINT better_auth_accounts_user_id_better_auth_users_id_fk 
    FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;

-- Step 16: Re-enable triggers
SELECT 'Re-enabling triggers...' as status;
ALTER TABLE notifications ENABLE TRIGGER ALL;
ALTER TABLE users ENABLE TRIGGER ALL;
ALTER TABLE training_plans ENABLE TRIGGER ALL;
ALTER TABLE workouts ENABLE TRIGGER ALL;
ALTER TABLE messages ENABLE TRIGGER ALL;
ALTER TABLE typing_status ENABLE TRIGGER ALL;
ALTER TABLE races ENABLE TRIGGER ALL;
ALTER TABLE plan_templates ENABLE TRIGGER ALL;
ALTER TABLE plan_phases ENABLE TRIGGER ALL;
ALTER TABLE template_phases ENABLE TRIGGER ALL;

-- Step 17: Re-enable RLS
SELECT 'Re-enabling RLS...' as status;
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
ALTER TABLE better_auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Step 18: Recreate RLS policies with text IDs
SELECT 'Recreating RLS policies...' as status;

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
CREATE POLICY "Users can view workouts from their training plans" ON workouts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Users can update workouts from their training plans" ON workouts FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND (tp.coach_id = auth.uid()::text OR tp.runner_id = auth.uid()::text)
    )
);

CREATE POLICY "Coaches can create workouts" ON workouts FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM training_plans tp 
        WHERE tp.id = training_plan_id 
        AND tp.coach_id = auth.uid()::text
    )
);

-- Messages policies
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Users can update their received messages" ON messages FOR UPDATE USING (
    auth.uid()::text = recipient_id
);

-- Notifications policies
CREATE POLICY "Users can see their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);

-- Other policies
CREATE POLICY "Users can view training phases" ON training_phases FOR SELECT USING (true);

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

CREATE POLICY "Users can view public templates" ON plan_templates FOR SELECT USING (
    is_public = true OR created_by = auth.uid()::text
);

CREATE POLICY "Users can create templates" ON plan_templates FOR INSERT WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update their templates" ON plan_templates FOR UPDATE USING (auth.uid()::text = created_by);

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

CREATE POLICY "Users can manage their own typing status" ON typing_status FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can see typing status directed at them" ON typing_status FOR SELECT USING (auth.uid()::text = recipient_id);

CREATE POLICY "Users can view all races" ON races FOR SELECT USING (true);
CREATE POLICY "Users can create races" ON races FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "Users can update their races" ON races FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "Users can delete their races" ON races FOR DELETE USING (auth.uid()::text = created_by);

CREATE POLICY "Users can access their own data" ON better_auth_users FOR ALL USING (auth.uid()::text = id);
CREATE POLICY "Users can access their own sessions" ON better_auth_sessions FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can access their own accounts" ON better_auth_accounts FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "System can manage verification tokens" ON better_auth_verification_tokens FOR ALL USING (true);

-- Step 19: Final verification
SELECT 'Final verification...' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_training_plans FROM training_plans;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as total_notifications FROM notifications;

-- Show sample migrated data
SELECT 'Sample migrated user IDs:' as info;
SELECT id, email FROM users LIMIT 3;

COMMIT;

SELECT 'TRIGGER-SAFE DATABASE MIGRATION COMPLETED SUCCESSFULLY!' as final_status;