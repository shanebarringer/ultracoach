-- Seed Better Auth Users
-- Creates test coaches and runners for development using Better Auth schema

DO $$
DECLARE
    -- Fixed User IDs for consistent testing (using text for Better Auth)
    coach1_id TEXT := 'coach-8e679919-9824-4733-a726-0bafbba146b3';
    coach2_id TEXT := 'coach-c2222222-2222-2222-2222-222222222222';
    runner1_id TEXT := 'runner-11111111-1111-1111-1111-111111111111';
    runner2_id TEXT := 'runner-22222222-2222-2222-2222-222222222222';
    runner3_id TEXT := 'runner-33333333-3333-3333-3333-333333333333';
    runner4_id TEXT := 'runner-44444444-4444-4444-4444-444444444444';
    runner5_id TEXT := 'runner-55555555-5555-5555-5555-555555555555';
    runner6_id TEXT := 'runner-66666666-6666-6666-6666-666666666666';
    runner7_id TEXT := 'runner-77777777-7777-7777-7777-777777777777';
    runner8_id TEXT := 'runner-88888888-8888-8888-8888-888888888888';
    runner9_id TEXT := 'runner-99999999-9999-9999-9999-999999999999';
    runner10_id TEXT := 'runner-a0101010-1010-1010-1010-101010101010';
    
BEGIN

    -- Insert coaches into Better Auth users table
    INSERT INTO better_auth_users (id, email, name, full_name, role, email_verified, created_at, updated_at) VALUES
    (coach1_id, 'coach1@ultracoach.dev', 'Sarah Mountain', 'Sarah Mountain', 'coach', true, NOW(), NOW()),
    (coach2_id, 'coach2@ultracoach.dev', 'Mike Trailblazer', 'Mike Trailblazer', 'coach', true, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- Insert runners into Better Auth users table
    INSERT INTO better_auth_users (id, email, name, full_name, role, email_verified, created_at, updated_at) VALUES
    (runner1_id, 'runner1@ultracoach.dev', 'Alex Speedster', 'Alex Speedster', 'runner', true, NOW(), NOW()),
    (runner2_id, 'runner2@ultracoach.dev', 'Jordan Endurance', 'Jordan Endurance', 'runner', true, NOW(), NOW()),
    (runner3_id, 'runner3@ultracoach.dev', 'Taylor Swift-feet', 'Taylor Swift-feet', 'runner', true, NOW(), NOW()),
    (runner4_id, 'runner4@ultracoach.dev', 'Casey Hillclimber', 'Casey Hillclimber', 'runner', true, NOW(), NOW()),
    (runner5_id, 'runner5@ultracoach.dev', 'Morgan Longdistance', 'Morgan Longdistance', 'runner', true, NOW(), NOW()),
    (runner6_id, 'runner6@ultracoach.dev', 'Riley Trailrunner', 'Riley Trailrunner', 'runner', true, NOW(), NOW()),
    (runner7_id, 'runner7@ultracoach.dev', 'Avery Pacesetter', 'Avery Pacesetter', 'runner', true, NOW(), NOW()),
    (runner8_id, 'runner8@ultracoach.dev', 'Phoenix Ultramarathoner', 'Phoenix Ultramarathoner', 'runner', true, NOW(), NOW()),
    (runner9_id, 'runner9@ultracoach.dev', 'Sage Mountaineer', 'Sage Mountaineer', 'runner', true, NOW(), NOW()),
    (runner10_id, 'runner10@ultracoach.dev', 'River Flowstate', 'River Flowstate', 'runner', true, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- Create Better Auth accounts for password-based login
    INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
    -- Coaches
    (coach1_id || '-account', coach1_id, 'credential', coach1_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (coach2_id || '-account', coach2_id, 'credential', coach2_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    -- Runners
    (runner1_id || '-account', runner1_id, 'credential', runner1_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner2_id || '-account', runner2_id, 'credential', runner2_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner3_id || '-account', runner3_id, 'credential', runner3_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner4_id || '-account', runner4_id, 'credential', runner4_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner5_id || '-account', runner5_id, 'credential', runner5_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner6_id || '-account', runner6_id, 'credential', runner6_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner7_id || '-account', runner7_id, 'credential', runner7_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner8_id || '-account', runner8_id, 'credential', runner8_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner9_id || '-account', runner9_id, 'credential', runner9_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW()),
    (runner10_id || '-account', runner10_id, 'credential', runner10_id, '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
        password = EXCLUDED.password,
        updated_at = NOW();

    -- Create some training plans to connect coaches and runners
    INSERT INTO training_plans (id, title, description, coach_id, runner_id, plan_type, goal_type, created_at, updated_at) VALUES
    
    -- Coach 1 (Sarah) with runners 1-5
    (gen_random_uuid(), 'Alex - First 50K Training', 'Building up to first ultra distance', coach1_id, runner1_id, 'race_specific', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'Jordan - 50 Mile Goal', 'Stepping up from 50K to 50 miles', coach1_id, runner2_id, 'race_specific', 'time_goal', NOW(), NOW()),
    (gen_random_uuid(), 'Taylor - Marathon Base Building', 'Building aerobic base for future ultras', coach1_id, runner3_id, 'base_building', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'Casey - Hill Training Specialist', 'Mountain ultra preparation', coach1_id, runner4_id, 'race_specific', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'Morgan - 100K Preparation', 'First 100K training cycle', coach1_id, runner5_id, 'race_specific', 'completion', NOW(), NOW()),
    
    -- Coach 2 (Mike) with runners 6-10  
    (gen_random_uuid(), 'Riley - Trail Running Fundamentals', 'New to trail running, building base', coach2_id, runner6_id, 'base_building', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'Avery - Speed Development', 'Working on pace and race strategy', coach2_id, runner7_id, 'race_specific', 'time_goal', NOW(), NOW()),
    (gen_random_uuid(), 'Phoenix - 100 Mile Quest', 'Training for first 100-miler', coach2_id, runner8_id, 'race_specific', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'Sage - Multi-stage Racing', 'Preparing for stage races', coach2_id, runner9_id, 'race_specific', 'completion', NOW(), NOW()),
    (gen_random_uuid(), 'River - Recovery & Comeback', 'Returning from injury', coach2_id, runner10_id, 'recovery', 'completion', NOW(), NOW());

    -- Create some sample workouts for first two training plans
    INSERT INTO workouts (
      id, training_plan_id, user_id, title, description, date, planned_type, planned_distance, planned_duration, 
      intensity, terrain_type, elevation_gain, status, created_at, updated_at
    ) VALUES
    -- Alex's workouts
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), runner1_id, 'Easy Morning Run', 'Comfortable aerobic pace', CURRENT_DATE + 1, 'easy', 6, '50 minutes', 3, 'road', 100, 'planned', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), runner1_id, 'Tempo Run', 'Comfortably hard effort', CURRENT_DATE + 2, 'tempo', 8, '1 hour', 6, 'road', 150, 'planned', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), runner1_id, 'Recovery Run', 'Easy recovery pace', CURRENT_DATE + 3, 'easy', 5, '40 minutes', 2, 'road', 80, 'planned', NOW(), NOW()),
    -- Riley's workouts  
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner6_id LIMIT 1), runner6_id, 'Trail Fundamentals', 'Learning trail running basics', CURRENT_DATE + 1, 'easy', 4, '35 minutes', 3, 'trail', 120, 'planned', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner6_id LIMIT 1), runner6_id, 'Long Trail Run', 'Build endurance on trails', CURRENT_DATE + 2, 'long_run', 12, '1 hour 30 minutes', 5, 'trail', 300, 'planned', NOW(), NOW());

    -- Create conversations between coaches and runners
    INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at) VALUES
    -- Coach 1 conversations
    (gen_random_uuid(), coach1_id, runner1_id, NOW(), NOW()),
    (gen_random_uuid(), coach1_id, runner2_id, NOW(), NOW()),
    -- Coach 2 conversations
    (gen_random_uuid(), coach2_id, runner6_id, NOW(), NOW()),
    (gen_random_uuid(), coach2_id, runner7_id, NOW(), NOW());

    -- Create some sample messages
    INSERT INTO messages (id, conversation_id, sender_id, recipient_id, content, message_type, created_at, updated_at) VALUES
    (gen_random_uuid(), (SELECT id FROM conversations WHERE user1_id = coach1_id AND user2_id = runner1_id LIMIT 1), coach1_id, runner1_id, 'Welcome to your training program! Let''s start with building your aerobic base.', 'text', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM conversations WHERE user1_id = coach1_id AND user2_id = runner1_id LIMIT 1), runner1_id, coach1_id, 'Thanks coach! I''m excited to get started.', 'text', NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM conversations WHERE user1_id = coach2_id AND user2_id = runner6_id LIMIT 1), coach2_id, runner6_id, 'Trail running is all about consistency. Take your time learning the terrain.', 'text', NOW(), NOW());

    -- Create some notifications
    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, updated_at) VALUES
    (gen_random_uuid(), runner1_id, 'New Training Plan', 'Your coach has created a new training plan: Alex - First 50K Training', 'training_plan', false, NOW(), NOW()),
    (gen_random_uuid(), runner1_id, 'Workout Scheduled', 'New workout scheduled for tomorrow: Easy Morning Run', 'workout', false, NOW(), NOW()),
    (gen_random_uuid(), runner6_id, 'New Training Plan', 'Your coach has created a new training plan: Riley - Trail Running Fundamentals', 'training_plan', false, NOW(), NOW());

END $$;

-- Log success
SELECT 'Better Auth test users seeded successfully! Password for all users: password123' AS status;