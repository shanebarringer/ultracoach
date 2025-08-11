-- ⚠️  DEPRECATED: This seed file uses the old 'users' table which no longer exists.
-- 
-- Use instead:
-- - scripts/create-test-users-better-auth-api.ts (recommended)
-- - scripts/create-test-users-automated.ts (browser automation)
-- 
-- Seed Test Users
-- Creates test coaches and runners for development

DO $$
DECLARE
    -- Fixed User IDs for consistent testing
    coach1_id UUID := '8e679919-9824-4733-a726-0bafbba146b3';
    coach2_id UUID := 'c2222222-2222-2222-2222-222222222222';
    runner1_id UUID := '11111111-1111-1111-1111-111111111111';
    runner2_id UUID := '22222222-2222-2222-2222-222222222222';
    runner3_id UUID := '33333333-3333-3333-3333-333333333333';
    runner4_id UUID := '44444444-4444-4444-4444-444444444444';
    runner5_id UUID := '55555555-5555-5555-5555-555555555555';
    runner6_id UUID := '66666666-6666-6666-6666-666666666666';
    runner7_id UUID := '77777777-7777-7777-7777-777777777777';
    runner8_id UUID := '88888888-8888-8888-8888-888888888888';
    runner9_id UUID := '99999999-9999-9999-9999-999999999999';
    runner10_id UUID := 'a0101010-1010-1010-1010-101010101010';
    
    -- Pre-computed password hash for 'password123'
    password_hash TEXT := '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO';
BEGIN

    -- Insert coaches (update password hash if user already exists)
    INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES
    (coach1_id, 'coach1@ultracoach.dev', 'Sarah Mountain', 'coach', password_hash, NOW()),
    (coach2_id, 'coach2@ultracoach.dev', 'Mike Trailblazer', 'coach', password_hash, NOW())
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

    -- Insert runners (update password hash if user already exists)
    INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES
    (runner1_id, 'runner1@ultracoach.dev', 'Alex Speedster', 'runner', password_hash, NOW()),
    (runner2_id, 'runner2@ultracoach.dev', 'Jordan Endurance', 'runner', password_hash, NOW()),
    (runner3_id, 'runner3@ultracoach.dev', 'Taylor Swift-feet', 'runner', password_hash, NOW()),
    (runner4_id, 'runner4@ultracoach.dev', 'Casey Hillclimber', 'runner', password_hash, NOW()),
    (runner5_id, 'runner5@ultracoach.dev', 'Morgan Longdistance', 'runner', password_hash, NOW()),
    (runner6_id, 'runner6@ultracoach.dev', 'Riley Trailrunner', 'runner', password_hash, NOW()),
    (runner7_id, 'runner7@ultracoach.dev', 'Avery Pacesetter', 'runner', password_hash, NOW()),
    (runner8_id, 'runner8@ultracoach.dev', 'Phoenix Ultramarathoner', 'runner', password_hash, NOW()),
    (runner9_id, 'runner9@ultracoach.dev', 'Sage Mountaineer', 'runner', password_hash, NOW()),
    (runner10_id, 'runner10@ultracoach.dev', 'River Flowstate', 'runner', password_hash, NOW())
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

    -- Create some training plans to connect coaches and runners
    INSERT INTO training_plans (id, title, description, coach_id, runner_id, created_at) VALUES
    
    -- Coach 1 (Sarah) with runners 1-5
    (gen_random_uuid(), 'Alex - First 50K Training', 'Building up to first ultra distance', coach1_id, runner1_id, NOW()),
    (gen_random_uuid(), 'Jordan - 50 Mile Goal', 'Stepping up from 50K to 50 miles', coach1_id, runner2_id, NOW()),
    (gen_random_uuid(), 'Taylor - Marathon Base Building', 'Building aerobic base for future ultras', coach1_id, runner3_id, NOW()),
    (gen_random_uuid(), 'Casey - Hill Training Specialist', 'Mountain ultra preparation', coach1_id, runner4_id, NOW()),
    (gen_random_uuid(), 'Morgan - 100K Preparation', 'First 100K training cycle', coach1_id, runner5_id, NOW()),
    
    -- Coach 2 (Mike) with runners 6-10  
    (gen_random_uuid(), 'Riley - Trail Running Fundamentals', 'New to trail running, building base', coach2_id, runner6_id, NOW()),
    (gen_random_uuid(), 'Avery - Speed Development', 'Working on pace and race strategy', coach2_id, runner7_id, NOW()),
    (gen_random_uuid(), 'Phoenix - 100 Mile Quest', 'Training for first 100-miler', coach2_id, runner8_id, NOW()),
    (gen_random_uuid(), 'Sage - Multi-stage Racing', 'Preparing for stage races', coach2_id, runner9_id, NOW()),
    (gen_random_uuid(), 'River - Recovery & Comeback', 'Returning from injury', coach2_id, runner10_id, NOW());

    -- Create some simple sample workouts for first two training plans
    INSERT INTO workouts (
      id, training_plan_id, date, planned_type, planned_distance, planned_duration, workout_notes, status, created_at,
      workout_category, intensity_level, terrain_type, elevation_gain_feet
    ) VALUES
    -- Alex's workouts
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), CURRENT_DATE + 1, 'Easy Run', 6, 50, 'Comfortable aerobic pace', 'planned', NOW(), 'easy', 3, 'road', 100),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), CURRENT_DATE + 2, 'Tempo Run', 8, 60, 'Comfortably hard effort', 'planned', NOW(), 'tempo', 6, 'road', 150),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner1_id LIMIT 1), CURRENT_DATE + 3, 'Easy Run', 5, 40, 'Easy recovery pace', 'planned', NOW(), 'easy', 2, 'road', 80),
    -- Riley's workouts  
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner6_id LIMIT 1), CURRENT_DATE + 1, 'Easy Run', 4, 35, 'Trail running fundamentals', 'planned', NOW(), 'easy', 3, 'trail', 120),
    (gen_random_uuid(), (SELECT id FROM training_plans WHERE runner_id = runner6_id LIMIT 1), CURRENT_DATE + 2, 'Long Run', 12, 90, 'Build endurance on trails', 'planned', NOW(), 'long_run', 5, 'trail', 300);

END $$;