-- Seed Test Users
-- Creates test coaches and runners for development

DO $$
DECLARE
    -- User IDs for reference
    coach1_id UUID := gen_random_uuid();
    coach2_id UUID := gen_random_uuid();
    runner1_id UUID := gen_random_uuid();
    runner2_id UUID := gen_random_uuid();
    runner3_id UUID := gen_random_uuid();
    runner4_id UUID := gen_random_uuid();
    runner5_id UUID := gen_random_uuid();
    runner6_id UUID := gen_random_uuid();
    runner7_id UUID := gen_random_uuid();
    runner8_id UUID := gen_random_uuid();
    runner9_id UUID := gen_random_uuid();
    runner10_id UUID := gen_random_uuid();
    
    -- Pre-computed password hash for 'password123'
    password_hash TEXT := '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
BEGIN

    -- Insert coaches
    INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES
    (coach1_id, 'coach1@ultracoach.dev', 'Sarah Mountain', 'coach', password_hash, NOW()),
    (coach2_id, 'coach2@ultracoach.dev', 'Mike Trailblazer', 'coach', password_hash, NOW());

    -- Insert runners  
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
    (runner10_id, 'runner10@ultracoach.dev', 'River Flowstate', 'runner', password_hash, NOW());

    -- Create some training plans to connect coaches and runners
    INSERT INTO training_plans (id, title, description, coach_id, runner_id, archived, created_at) VALUES
    
    -- Coach 1 (Sarah) with runners 1-5
    (gen_random_uuid(), 'Alex - First 50K Training', 'Building up to first ultra distance', coach1_id, runner1_id, false, NOW()),
    (gen_random_uuid(), 'Jordan - 50 Mile Goal', 'Stepping up from 50K to 50 miles', coach1_id, runner2_id, false, NOW()),
    (gen_random_uuid(), 'Taylor - Marathon Base Building', 'Building aerobic base for future ultras', coach1_id, runner3_id, false, NOW()),
    (gen_random_uuid(), 'Casey - Hill Training Specialist', 'Mountain ultra preparation', coach1_id, runner4_id, false, NOW()),
    (gen_random_uuid(), 'Morgan - 100K Preparation', 'First 100K training cycle', coach1_id, runner5_id, false, NOW()),
    
    -- Coach 2 (Mike) with runners 6-10  
    (gen_random_uuid(), 'Riley - Trail Running Fundamentals', 'New to trail running, building base', coach2_id, runner6_id, false, NOW()),
    (gen_random_uuid(), 'Avery - Speed Development', 'Working on pace and race strategy', coach2_id, runner7_id, false, NOW()),
    (gen_random_uuid(), 'Phoenix - 100 Mile Quest', 'Training for first 100-miler', coach2_id, runner8_id, false, NOW()),
    (gen_random_uuid(), 'Sage - Multi-stage Racing', 'Preparing for stage races', coach2_id, runner9_id, false, NOW()),
    (gen_random_uuid(), 'River - Recovery & Comeback', 'Returning from injury', coach2_id, runner10_id, false, NOW());

    -- Create some sample workouts for a few training plans
    INSERT INTO workouts (id, training_plan_id, date, planned_type, planned_distance, planned_duration, description, status, created_at)
    SELECT 
        gen_random_uuid(),
        tp.id,
        CURRENT_DATE + (INTERVAL '1 day' * generate_series(1, 7)),
        CASE (generate_series(1, 7) % 7)
            WHEN 1 THEN 'Easy Run'
            WHEN 2 THEN 'Tempo Run' 
            WHEN 3 THEN 'Easy Run'
            WHEN 4 THEN 'Intervals'
            WHEN 5 THEN 'Easy Run'
            WHEN 6 THEN 'Long Run'
            WHEN 0 THEN 'Rest Day'
        END,
        CASE (generate_series(1, 7) % 7)
            WHEN 1 THEN 6
            WHEN 2 THEN 8
            WHEN 3 THEN 5
            WHEN 4 THEN 7
            WHEN 5 THEN 4
            WHEN 6 THEN 15
            WHEN 0 THEN NULL
        END,
        CASE (generate_series(1, 7) % 7)
            WHEN 1 THEN 50
            WHEN 2 THEN 60
            WHEN 3 THEN 40
            WHEN 4 THEN 55
            WHEN 5 THEN 35
            WHEN 6 THEN 120
            WHEN 0 THEN NULL
        END,
        CASE (generate_series(1, 7) % 7)
            WHEN 1 THEN 'Comfortable aerobic pace'
            WHEN 2 THEN 'Comfortably hard effort'
            WHEN 3 THEN 'Easy recovery pace'
            WHEN 4 THEN '5 x 1K at 5K pace with 90s recovery'
            WHEN 5 THEN 'Easy shakeout run'
            WHEN 6 THEN 'Long steady effort, practice nutrition'
            WHEN 0 THEN 'Complete rest or gentle stretching'
        END,
        'planned',
        NOW()
    FROM training_plans tp
    WHERE tp.runner_id IN (runner1_id, runner6_id); -- Just create workouts for 2 plans to start

END $$;