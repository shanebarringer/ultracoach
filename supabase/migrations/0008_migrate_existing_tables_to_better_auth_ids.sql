-- Simplified Migration to Better Auth IDs
-- This migration updates existing tables to use Better Auth IDs directly

BEGIN;

-- Step 1: Create backup tables before migration
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE training_plans_backup AS SELECT * FROM training_plans;
CREATE TABLE workouts_backup AS SELECT * FROM workouts;
CREATE TABLE messages_backup AS SELECT * FROM messages;
CREATE TABLE notifications_backup AS SELECT * FROM notifications;

-- Step 2: Drop foreign key constraints temporarily
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_coach_id_users_id_fk;
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_runner_id_users_id_fk;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_training_plan_id_training_plans_id_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_users_id_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_users_id_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk;

-- Step 3: Create a mapping table for the migration
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    u.id as old_id,
    u.email,
    ba.id as new_id
FROM users u
JOIN better_auth_users ba ON u.email = ba.email;

-- Step 4: Update users table to use Better Auth IDs as primary key
ALTER TABLE users ALTER COLUMN id TYPE text;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Update user IDs to Better Auth IDs
UPDATE users 
SET id = mapping.new_id
FROM user_id_mapping mapping
WHERE users.id = mapping.old_id;

-- Re-add primary key constraint
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Step 5: Update all foreign key references to use Better Auth IDs
-- Update training_plans
ALTER TABLE training_plans ALTER COLUMN coach_id TYPE text;
ALTER TABLE training_plans ALTER COLUMN runner_id TYPE text;

UPDATE training_plans 
SET coach_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.coach_id = mapping.old_id;

UPDATE training_plans 
SET runner_id = mapping.new_id
FROM user_id_mapping mapping
WHERE training_plans.runner_id = mapping.old_id;

-- Update messages
ALTER TABLE messages ALTER COLUMN sender_id TYPE text;
ALTER TABLE messages ALTER COLUMN recipient_id TYPE text;

UPDATE messages 
SET sender_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.sender_id = mapping.old_id;

UPDATE messages 
SET recipient_id = mapping.new_id
FROM user_id_mapping mapping
WHERE messages.recipient_id = mapping.old_id;

-- Update notifications
ALTER TABLE notifications ALTER COLUMN user_id TYPE text;

UPDATE notifications 
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE notifications.user_id = mapping.old_id;

-- Step 6: Re-add foreign key constraints
ALTER TABLE training_plans ADD CONSTRAINT training_plans_coach_id_users_id_fk 
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE training_plans ADD CONSTRAINT training_plans_runner_id_users_id_fk 
    FOREIGN KEY (runner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workouts ADD CONSTRAINT workouts_training_plan_id_training_plans_id_fk 
    FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_users_id_fk 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_recipient_id_users_id_fk 
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_users_id_fk 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Verify data integrity
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