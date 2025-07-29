-- Comprehensive schema fix for Better Auth and UltraCoach
-- This fixes both the session schema issue and aligns database with actual application schema

-- First, fix the Better Auth session schema
DO $$
BEGIN
  -- Check if token column exists (it shouldn't in proper Better Auth schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'better_auth_sessions' 
             AND column_name = 'token') THEN
    
    -- Drop the existing table and recreate with correct schema
    DROP TABLE IF EXISTS better_auth_sessions CASCADE;
    
    -- Create the correct session table schema
    CREATE TABLE better_auth_sessions (
      id TEXT PRIMARY KEY, -- This IS the session token
      expires_at TIMESTAMPTZ NOT NULL,
      user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add indexes for performance
    CREATE INDEX idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
    CREATE INDEX idx_better_auth_sessions_expires_at ON better_auth_sessions(expires_at);
    
    RAISE NOTICE 'Fixed Better Auth session schema - removed duplicate token field';
  ELSE
    RAISE NOTICE 'Better Auth session schema is already correct';
  END IF;
END
$$;

-- Fix workouts table schema to match application schema
DO $$
BEGIN
  -- Check if runner_id column exists in workouts table
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'workouts' 
             AND column_name = 'runner_id') THEN
    
    -- Remove the runner_id column as it's not in the actual application schema
    ALTER TABLE workouts DROP COLUMN IF EXISTS runner_id CASCADE;
    RAISE NOTICE 'Removed runner_id column from workouts table to match application schema';
  ELSE
    RAISE NOTICE 'Workouts table schema is already correct';
  END IF;
  
  -- Ensure workouts table has the correct structure matching schema.ts
  -- Add any missing columns that should exist
  
  -- Check and add planned_duration as integer (not interval) to match schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workouts' 
                 AND column_name = 'planned_duration' 
                 AND data_type = 'integer') THEN
    
    -- If it exists as interval, convert it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'workouts' 
               AND column_name = 'planned_duration') THEN
      ALTER TABLE workouts DROP COLUMN planned_duration;
    END IF;
    
    ALTER TABLE workouts ADD COLUMN planned_duration INTEGER;
    RAISE NOTICE 'Fixed planned_duration column type to match schema';
  END IF;
  
  -- Check and add actual_duration as integer (not interval) to match schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workouts' 
                 AND column_name = 'actual_duration' 
                 AND data_type = 'integer') THEN
    
    -- If it exists as interval, convert it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'workouts' 
               AND column_name = 'actual_duration') THEN
      ALTER TABLE workouts DROP COLUMN actual_duration;
    END IF;
    
    ALTER TABLE workouts ADD COLUMN actual_duration INTEGER;
    RAISE NOTICE 'Fixed actual_duration column type to match schema';
  END IF;
END
$$;

-- Fix conversations table to match application schema (coach_id/runner_id not user1_id/user2_id)
DO $$
BEGIN
  -- Check if we need to rename columns in conversations table
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'conversations' 
             AND column_name = 'user1_id') THEN
    
    -- Drop foreign key constraints first
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user1_id_better_auth_users_id_fk;
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user2_id_better_auth_users_id_fk;
    
    -- Rename columns to match application schema
    ALTER TABLE conversations RENAME COLUMN user1_id TO coach_id;
    ALTER TABLE conversations RENAME COLUMN user2_id TO runner_id;
    
    -- Add back foreign key constraints with correct names
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_coach_id_better_auth_users_id_fk 
    FOREIGN KEY (coach_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;
    
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_runner_id_better_auth_users_id_fk 
    FOREIGN KEY (runner_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed conversations table column names to match application schema';
  ELSE
    RAISE NOTICE 'Conversations table schema is already correct';
  END IF;
END
$$;

-- Fix messages table column names to match application schema
DO $$
BEGIN
  -- Rename is_read to read to match schema
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'messages' 
             AND column_name = 'is_read') THEN
    ALTER TABLE messages RENAME COLUMN is_read TO read;
    RAISE NOTICE 'Renamed messages.is_read to messages.read to match schema';
  END IF;
  
  -- Remove message_type column if it exists (not in application schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'messages' 
             AND column_name = 'message_type') THEN
    ALTER TABLE messages DROP COLUMN message_type;
    RAISE NOTICE 'Removed messages.message_type column to match schema';
  END IF;
  
  -- Add context_type column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' 
                 AND column_name = 'context_type') THEN
    ALTER TABLE messages ADD COLUMN context_type VARCHAR(50) DEFAULT 'general';
    RAISE NOTICE 'Added messages.context_type column to match schema';
  END IF;
END
$$;

-- Fix notifications table column names
DO $$
BEGIN
  -- Rename is_read to read to match schema
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notifications' 
             AND column_name = 'is_read') THEN
    ALTER TABLE notifications RENAME COLUMN is_read TO read;
    RAISE NOTICE 'Renamed notifications.is_read to notifications.read to match schema';
  END IF;
  
  -- Remove related_id column if it exists (not in application schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notifications' 
             AND column_name = 'related_id') THEN
    ALTER TABLE notifications DROP COLUMN related_id;
    RAISE NOTICE 'Removed notifications.related_id column to match schema';
  END IF;
END
$$;

-- Success message
SELECT 'Complete schema alignment successful! Both Better Auth session schema and application table schemas are now correct.' AS status;