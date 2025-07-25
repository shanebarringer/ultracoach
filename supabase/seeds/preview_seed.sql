-- Preview Branch Seed Data
-- Realistic test data for Preview Branches created from Pull Requests
-- This file runs automatically when a Preview Branch is created

-- Insert enhanced test data for preview environments
INSERT INTO better_auth_users (id, email, name, role, created_at, updated_at)
VALUES 
  -- Preview test coach
  ('preview-coach-001', 'coach.preview@ultracoach.dev', 'Alex Mountain', 'coach', NOW(), NOW()),
  -- Preview test runners  
  ('preview-runner-001', 'runner1.preview@ultracoach.dev', 'Sarah Trail', 'runner', NOW(), NOW()),
  ('preview-runner-002', 'runner2.preview@ultracoach.dev', 'Mike Summit', 'runner', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create sample training plan for preview testing
INSERT INTO training_plans (
  id, title, description, user_id, coach_id, plan_type, target_race_date, 
  goal_type, target_time, created_at, updated_at
)
VALUES (
  'preview-plan-001',
  'Preview Test: 50K Mountain Ultra',
  'Test training plan for preview branch validation - focuses on mountain terrain preparation',
  'preview-runner-001',
  'preview-coach-001', 
  'race_specific',
  CURRENT_DATE + INTERVAL '12 weeks',
  'time_goal',
  '5:30:00',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample workouts for testing
INSERT INTO workouts (
  id, title, description, date, planned_type, planned_distance, planned_duration,
  intensity, terrain_type, training_plan_id, user_id, created_at, updated_at
)
VALUES 
  (
    'preview-workout-001',
    'Preview Test: Easy Trail Run',
    'Testing workout display and functionality in preview branch',
    CURRENT_DATE + INTERVAL '1 day',
    'easy',
    8.0,
    '01:00:00',
    3,
    'trail',
    'preview-plan-001', 
    'preview-runner-001',
    NOW(),
    NOW()
  ),
  (
    'preview-workout-002', 
    'Preview Test: Long Run',
    'Testing long run workout with elevation gain tracking',
    CURRENT_DATE + INTERVAL '3 days',
    'long_run',
    18.0,
    '02:30:00',
    4,
    'trail',
    'preview-plan-001',
    'preview-runner-001', 
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample conversation for chat testing
INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at)
VALUES (
  'preview-conv-001',
  'preview-coach-001',
  'preview-runner-001', 
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample messages for chat functionality testing
INSERT INTO messages (
  id, conversation_id, sender_id, recipient_id, content, 
  message_type, workout_id, created_at, updated_at
)
VALUES 
  (
    'preview-msg-001',
    'preview-conv-001',
    'preview-coach-001', 
    'preview-runner-001',
    'Welcome to the preview branch! This message tests the chat functionality.',
    'text',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'preview-msg-002',
    'preview-conv-001',
    'preview-coach-001',
    'preview-runner-001', 
    'Here''s your workout for tomorrow - let me know how it goes!',
    'workout_link',
    'preview-workout-001',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample notifications for testing
INSERT INTO notifications (
  id, user_id, title, message, type, is_read, 
  related_id, created_at, updated_at
)
VALUES 
  (
    'preview-notif-001',
    'preview-runner-001',
    'New Training Plan Created',
    'Your coach has created a new training plan: Preview Test: 50K Mountain Ultra',
    'training_plan',
    false,
    'preview-plan-001',
    NOW(),
    NOW()
  ),
  (
    'preview-notif-002', 
    'preview-runner-001',
    'Workout Scheduled',
    'New workout scheduled for tomorrow: Preview Test: Easy Trail Run',
    'workout',
    false,
    'preview-workout-001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Log successful preview seed completion
SELECT 'Preview branch seed data loaded successfully' AS status;