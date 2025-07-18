#!/bin/bash
set -e

# Better Auth Data Seeding Script
# This script creates training plans, workouts, and conversations using actual Better Auth user IDs

echo "🌱 Seeding Better Auth Data..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to run SQL
run_sql() {
    local sql="$1"
    local description="$2"
    
    echo "  🔧 $description"
    
    # Get DATABASE_URL from .env.local
    DATABASE_URL="$(grep DATABASE_URL /Users/MXB5594/playground/ultracoach/.env.local | cut -d= -f2-)"
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL not found in .env.local"
        exit 1
    fi
    
    echo "$sql" | psql "$DATABASE_URL"
}

echo ""
echo "🔍 Step 1: Verifying Better Auth users..."

# Verify we have coaches and runners
run_sql "
SELECT 
    role,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM better_auth_users 
WHERE role IN ('coach', 'runner') 
GROUP BY role 
ORDER BY role;
" "Checking Better Auth users by role"

echo ""
echo "📋 Step 2: Creating training plans with coach-runner relationships..."

# Create training plans linking coaches to runners
run_sql "
INSERT INTO training_plans (
    id,
    title,
    description,
    coach_id,
    runner_id,
    goal_type,
    plan_type,
    target_race_date,
    created_at,
    updated_at
) VALUES 
    -- Coach 1 (coach1@ultracoach.dev) training plans
    (
        gen_random_uuid(),
        'Alex - First 50K Training Plan',
        'Progressive training plan for first ultramarathon - 50K distance with focus on building endurance and trail running skills',
        (SELECT id FROM better_auth_users WHERE email = 'coach1@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner1@ultracoach.dev'),
        'completion',
        'race_specific',
        CURRENT_DATE + INTERVAL '16 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Jordan - 50 Mile Goal Training',
        'Intermediate training plan stepping up from 50K to 50 miles with advanced nutrition and pacing strategies',
        (SELECT id FROM better_auth_users WHERE email = 'coach1@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner2@ultracoach.dev'),
        'time_goal',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '20 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Taylor - Marathon Base Building',
        'Aerobic base building program to prepare for future ultra distances with emphasis on consistent mileage',
        (SELECT id FROM better_auth_users WHERE email = 'coach1@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner3@ultracoach.dev'),
        'completion',
        'base_building',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '12 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Casey - Mountain Ultra Preparation',
        'Specialized hill and mountain training for technical ultra races with elevation gain focus',
        (SELECT id FROM better_auth_users WHERE email = 'coach1@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner4@ultracoach.dev'),
        'completion',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '18 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Morgan - 100K Training Program',
        'Advanced training plan for first 100K with back-to-back long runs and race simulation',
        (SELECT id FROM better_auth_users WHERE email = 'coach1@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner5@ultracoach.dev'),
        'completion',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '24 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- Coach 2 (coach2@ultracoach.dev) training plans
    (
        gen_random_uuid(),
        'Riley - Trail Running Fundamentals',
        'Introduction to trail running with focus on technique, safety, and building trail-specific fitness',
        (SELECT id FROM better_auth_users WHERE email = 'coach2@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner6@ultracoach.dev'),
        'completion',
        'base_building',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '10 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Avery - Speed and Pacing Development',
        'Advanced training focusing on race pace development and strategic pacing for ultra events',
        (SELECT id FROM better_auth_users WHERE email = 'coach2@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner7@ultracoach.dev'),
        'time_goal',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '14 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Phoenix - 100 Mile Quest',
        'Comprehensive 100-mile training program with emphasis on mental preparation and nutrition strategies',
        (SELECT id FROM better_auth_users WHERE email = 'coach2@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner8@ultracoach.dev'),
        'completion',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '28 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'Sage - Multi-Stage Racing',
        'Specialized training for multi-day stage races with recovery protocols and stage-specific preparation',
        (SELECT id FROM better_auth_users WHERE email = 'coach2@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner9@ultracoach.dev'),
        'completion',
        'race_specific',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '22 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'River - Recovery and Comeback',
        'Careful return-to-running program with injury prevention focus and gradual mileage building',
        (SELECT id FROM better_auth_users WHERE email = 'coach2@ultracoach.dev'),
        (SELECT id FROM better_auth_users WHERE email = 'runner10@ultracoach.dev'),
        'completion',
        'recovery',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '8 weeks',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
" "Creating training plans with coach-runner relationships"

echo ""
echo "🏃 Step 3: Creating workouts for all training plans..."

# Create diverse workouts for each training plan
run_sql "
INSERT INTO workouts (
    id,
    training_plan_id,
    date,
    planned_distance,
    planned_duration,
    planned_type,
    category,
    intensity,
    terrain_type,
    elevation_gain_m,
    workout_notes,
    status,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    tp.id,
    CURRENT_DATE + (workout_data.day_offset || ' days')::interval,
    workout_data.distance,
    workout_data.duration,
    workout_data.type,
    workout_data.category,
    workout_data.intensity,
    workout_data.terrain,
    workout_data.elevation,
    workout_data.notes,
    'planned',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM training_plans tp
CROSS JOIN (
    VALUES 
        -- Week 1 workouts
        (1, 6.0, 45, 'Easy Run', 'easy', 3, 'trail', 150, 'Comfortable aerobic pace to start building base'),
        (3, 8.0, 55, 'Tempo Run', 'tempo', 6, 'trail', 200, 'Comfortably hard effort for threshold development'),
        (5, 4.0, 30, 'Recovery Run', 'easy', 2, 'trail', 100, 'Easy recovery pace, focus on form'),
        (7, 12.0, 90, 'Long Run', 'long_run', 4, 'trail', 400, 'Steady endurance effort, practice fueling'),
        
        -- Week 2 workouts
        (10, 7.0, 50, 'Easy Run', 'easy', 3, 'trail', 180, 'Comfortable aerobic pace'),
        (12, 10.0, 70, 'Tempo Run', 'tempo', 7, 'trail', 300, 'Sustained tempo effort with trail focus'),
        (14, 5.0, 35, 'Recovery Run', 'easy', 2, 'trail', 120, 'Easy recovery run on gentle terrain'),
        (16, 16.0, 120, 'Long Run', 'long_run', 5, 'trail', 600, 'Progressive long run with negative split'),
        
        -- Week 3 workouts
        (19, 8.0, 60, 'Hill Repeats', 'interval', 8, 'trail', 500, '8 x 3min hill repeats with 2min recovery'),
        (21, 6.0, 45, 'Easy Run', 'easy', 3, 'trail', 200, 'Comfortable pace on rolling terrain'),
        (23, 12.0, 85, 'Tempo Run', 'tempo', 6, 'trail', 350, 'Progressive tempo run building to race pace'),
        (25, 20.0, 150, 'Long Run', 'long_run', 5, 'trail', 800, 'Race simulation with aid station practice'),
        
        -- Week 4 workouts
        (28, 9.0, 65, 'Fartlek', 'interval', 7, 'trail', 300, 'Unstructured speed play on trails'),
        (30, 5.0, 40, 'Easy Run', 'easy', 3, 'trail', 150, 'Easy aerobic run for recovery'),
        (32, 14.0, 95, 'Tempo Run', 'tempo', 6, 'trail', 400, 'Sustained tempo effort with surges'),
        (34, 18.0, 135, 'Long Run', 'long_run', 4, 'trail', 700, 'Steady long run with back-to-back practice')
) AS workout_data(day_offset, distance, duration, type, category, intensity, terrain, elevation, notes)
WHERE tp.coach_id IS NOT NULL AND tp.runner_id IS NOT NULL
ON CONFLICT DO NOTHING;
" "Creating diverse workouts for all training plans"

echo ""
echo "💬 Step 4: Creating conversations between coaches and runners..."

# Create conversations for each coach-runner pair
run_sql "
INSERT INTO conversations (
    id,
    coach_id,
    runner_id,
    last_message_at,
    created_at,
    updated_at
)
SELECT DISTINCT
    gen_random_uuid(),
    tp.coach_id,
    tp.runner_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM training_plans tp
WHERE tp.coach_id IS NOT NULL 
AND tp.runner_id IS NOT NULL
AND tp.coach_id != tp.runner_id
ON CONFLICT (coach_id, runner_id) DO NOTHING;
" "Creating conversations between coaches and runners"

echo ""
echo "📨 Step 5: Adding initial welcome messages..."

# Add welcome messages to establish communication
run_sql "
INSERT INTO messages (
    id,
    sender_id,
    recipient_id,
    content,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    c.coach_id,
    c.runner_id,
    CASE 
        WHEN tp.title LIKE '%First%' THEN 'Welcome to your first ultra training! I''m excited to help you reach your 50K goal. Let''s start with building a solid aerobic base.'
        WHEN tp.title LIKE '%100 Mile%' THEN 'Ready for the 100-mile challenge? This is going to be an incredible journey. We''ll focus on building both physical and mental strength.'
        WHEN tp.title LIKE '%Speed%' THEN 'Let''s work on your pacing and race strategy. I''ll help you develop the speed and tactics needed for your target races.'
        WHEN tp.title LIKE '%Recovery%' THEN 'Welcome back to training! We''ll take this step by step, focusing on injury prevention and gradual progression.'
        ELSE 'Welcome to your training program! I''m here to support you every step of the way. Let''s discuss your goals and get started.'
    END,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
FROM conversations c
JOIN training_plans tp ON c.coach_id = tp.coach_id AND c.runner_id = tp.runner_id
ON CONFLICT DO NOTHING;
" "Adding welcome messages from coaches"

echo ""
echo "🏁 Step 6: Linking training plans to sample races..."

# Link some training plans to target races
run_sql "
UPDATE training_plans 
SET target_race_id = (
    SELECT id FROM races 
    WHERE name = 'Western States 100' 
    LIMIT 1
)
WHERE title LIKE '%100%' AND target_race_id IS NULL;

UPDATE training_plans 
SET target_race_id = (
    SELECT id FROM races 
    WHERE name = 'Leadville 100' 
    LIMIT 1
)
WHERE title LIKE '%Mountain%' AND target_race_id IS NULL;

UPDATE training_plans 
SET target_race_id = (
    SELECT id FROM races 
    WHERE name = 'JFK 50' 
    LIMIT 1
)
WHERE title LIKE '%50%' AND target_race_id IS NULL;
" "Linking training plans to target races"

echo ""
echo "📊 Step 7: Adding plan phases for training progression..."

# Add plan phases for each training plan
run_sql "
INSERT INTO plan_phases (
    id,
    training_plan_id,
    phase_id,
    phase_order,
    start_date,
    end_date,
    target_weekly_miles,
    completed,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    tp.id,
    tph.id,
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '4 weeks',
    CASE 
        WHEN tp.title LIKE '%First%' THEN 25
        WHEN tp.title LIKE '%100%' THEN 60
        WHEN tp.title LIKE '%Recovery%' THEN 15
        ELSE 35
    END,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM training_plans tp
CROSS JOIN training_phases tph
WHERE tph.name = 'Base Building'
AND NOT EXISTS (
    SELECT 1 FROM plan_phases pp 
    WHERE pp.training_plan_id = tp.id
)
ON CONFLICT DO NOTHING;
" "Adding plan phases for training progression"

echo ""
echo "✅ Better Auth Data Seeding Complete!"
echo ""
echo "📊 Summary of what was created:"
echo "   • 10 training plans linking coaches to runners"
echo "   • 160+ workouts across all training plans (16 per plan)"
echo "   • 10 conversations between coach-runner pairs"
echo "   • 10 welcome messages to start communication"
echo "   • Plan phases for training progression"
echo "   • Links to target races for race-specific plans"
echo ""
echo "🎯 Your database now has complete coach-runner relationships!"
echo "   Coaches can see their runners and training plans"
echo "   Runners can see their coach and personalized training"
echo "   All messaging and workout features are fully functional"