-- UltraCoach Initial Schema - Production Ready
-- This creates the complete database schema matching src/lib/schema.ts exactly

-- Create Better Auth tables with CORRECT schema
CREATE TABLE better_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'runner',
  full_name TEXT
);

CREATE TABLE better_auth_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  expires_at TIMESTAMPTZ,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Better Auth session schema - includes separate token field as required by Better Auth
CREATE TABLE better_auth_sessions (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE, -- Better Auth requires separate token field
  user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE better_auth_verification_tokens (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application tables matching schema.ts exactly
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  coach_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  runner_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  target_race_date TIMESTAMPTZ,
  target_race_distance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table - NO runner_id column (access through training_plan relationship)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  planned_distance DECIMAL(5,2),
  planned_duration INTEGER, -- Integer in seconds, NOT interval
  planned_type TEXT,
  actual_distance DECIMAL(5,2),
  actual_duration INTEGER, -- Integer in seconds, NOT interval
  actual_type TEXT,
  injury_notes TEXT,
  workout_notes TEXT,
  coach_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table - coach_id/runner_id schema
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  runner_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  training_plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  title VARCHAR(255),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table - correct column names matching schema.ts
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false, -- 'read' not 'is_read'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  context_type VARCHAR(50) DEFAULT 'general',
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE TABLE message_workout_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'reference',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table - correct column names
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false, -- 'read' not 'is_read'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced training system tables (needed for seed data)
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TIMESTAMPTZ,
  distance_miles DECIMAL(6,2) NOT NULL,
  distance_type TEXT NOT NULL,
  location TEXT NOT NULL,
  elevation_gain_feet INTEGER DEFAULT 0,
  terrain_type TEXT DEFAULT 'trail',
  website_url TEXT,
  notes TEXT,
  created_by TEXT REFERENCES better_auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  focus_areas TEXT[],
  typical_duration_weeks INTEGER,
  phase_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  distance_type TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  difficulty_level TEXT DEFAULT 'intermediate',
  peak_weekly_miles DECIMAL(5,2),
  min_base_miles DECIMAL(5,2),
  created_by TEXT REFERENCES better_auth_users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES training_phases(id) ON DELETE CASCADE,
  phase_order INTEGER NOT NULL,
  duration_weeks INTEGER NOT NULL,
  target_weekly_miles DECIMAL(5,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
CREATE INDEX idx_better_auth_sessions_expires_at ON better_auth_sessions(expires_at);
CREATE INDEX idx_training_plans_coach_id ON training_plans(coach_id);
CREATE INDEX idx_training_plans_runner_id ON training_plans(runner_id);
CREATE INDEX idx_workouts_training_plan_id ON workouts(training_plan_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX idx_conversations_runner_id ON conversations(runner_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_races_date ON races(date);
CREATE INDEX idx_races_distance_type ON races(distance_type);
CREATE INDEX idx_training_phases_phase_order ON training_phases(phase_order);
CREATE INDEX idx_plan_templates_distance_type ON plan_templates(distance_type);
CREATE INDEX idx_plan_templates_difficulty_level ON plan_templates(difficulty_level);
CREATE INDEX idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX idx_template_phases_phase_id ON template_phases(phase_id);

-- Enable Row Level Security
ALTER TABLE better_auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies matching current application usage
CREATE POLICY "Users can manage their own data" ON better_auth_users
FOR ALL USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Coaches can manage their training plans" ON training_plans
FOR ALL USING (coach_id = current_setting('app.current_user_id', true));

CREATE POLICY "Runners can view their training plans" ON training_plans
FOR SELECT USING (runner_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can manage workouts through training plans" ON workouts
FOR ALL USING (
  training_plan_id IN (
    SELECT id FROM training_plans 
    WHERE coach_id = current_setting('app.current_user_id', true) 
    OR runner_id = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY "Users can manage their conversations" ON conversations
FOR ALL USING (
  coach_id = current_setting('app.current_user_id', true) 
  OR runner_id = current_setting('app.current_user_id', true)
);

CREATE POLICY "Users can manage their messages" ON messages
FOR ALL USING (
  sender_id = current_setting('app.current_user_id', true) 
  OR recipient_id = current_setting('app.current_user_id', true)
);

CREATE POLICY "Users can manage their notifications" ON notifications
FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Success
SELECT 'UltraCoach initial schema created successfully - matches application code exactly!' AS status;