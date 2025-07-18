#!/bin/bash
set -e

# Add Test Data Script
# This script adds realistic test data to the current database schema

echo "🌱 Adding Test Data to Current Schema..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SUPABASE_DIR")"

# Load environment variables from .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "📄 Loading environment variables from .env.local..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

# Check for required environment variables and build DATABASE_URL if needed
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    if [ -n "$DATABASE_PASSWORD" ]; then
        DATABASE_URL="postgresql://postgres.ccnbzjpccmlribljugve:${DATABASE_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
        echo "✅ Built DATABASE_URL from environment variables"
    else
        echo "⚠️  DATABASE_URL not set."
        exit 1
    fi
fi

# Function to run SQL
run_sql() {
    local sql="$1"
    local description="$2"
    
    echo "  🔧 $description"
    if command -v supabase &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
        echo "$sql" | supabase db query --db-url "$SUPABASE_DB_URL"
    elif [ -n "$DATABASE_URL" ]; then
        echo "$sql" | psql "$DATABASE_URL"
    else
        echo "❌ No database connection available."
        exit 1
    fi
}

echo ""
echo "🔄 Step 1: Updating existing training plans..."

# Update existing training plans with enhanced fields
run_sql "
UPDATE training_plans 
SET 
    goal_type = CASE 
        WHEN goal_type IS NULL THEN 'completion'
        ELSE goal_type
    END,
    plan_type = CASE 
        WHEN plan_type IS NULL THEN 'race_specific'
        ELSE plan_type
    END
WHERE goal_type IS NULL OR plan_type IS NULL;
" "Updating training plans with enhanced fields"

echo ""
echo "🏃 Step 2: Adding sample workouts..."

# Add sample workouts with proper field names
run_sql "
INSERT INTO workouts (
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
    created_at
) VALUES 
    (
        (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1),
        CURRENT_DATE + INTERVAL '1 day',
        10.0,
        75,
        'Easy Run',
        'easy',
        4,
        'trail',
        200,
        'Comfortable aerobic pace run to build base fitness',
        'scheduled',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1),
        CURRENT_DATE + INTERVAL '3 days',
        8.0,
        50,
        'Tempo Run',
        'tempo',
        7,
        'trail',
        150,
        'Comfortably hard effort to improve lactate threshold',
        'scheduled',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1),
        CURRENT_DATE + INTERVAL '6 days',
        20.0,
        180,
        'Long Run',
        'long_run',
        5,
        'trail',
        600,
        'Extended distance run to build endurance',
        'scheduled',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1),
        CURRENT_DATE + INTERVAL '10 days',
        12.0,
        90,
        'Hill Repeats',
        'interval',
        8,
        'trail',
        400,
        '8 x 2 min hill repeats with 2 min recovery',
        'scheduled',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1),
        CURRENT_DATE + INTERVAL '13 days',
        6.0,
        45,
        'Recovery Run',
        'easy',
        3,
        'trail',
        100,
        'Very easy recovery run, focus on form',
        'scheduled',
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
" "Adding sample workouts"

echo ""
echo "🏁 Step 3: Creating training plan connections to races..."

# Link some training plans to target races
run_sql "
UPDATE training_plans 
SET target_race_id = (
    SELECT id FROM races 
    WHERE name = 'Western States 100' 
    LIMIT 1
)
WHERE target_race_id IS NULL 
AND id = (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1);
" "Linking training plan to Western States 100"

echo ""
echo "📝 Step 4: Adding some plan phases..."

# Add plan phases for existing training plans
run_sql "
INSERT INTO plan_phases (
    training_plan_id,
    phase_id,
    phase_order,
    start_date,
    end_date,
    status,
    created_at
)
SELECT 
    tp.id,
    tph.id,
    1,
    tp.start_date,
    tp.start_date + INTERVAL '4 weeks',
    'active',
    CURRENT_TIMESTAMP
FROM training_plans tp
CROSS JOIN training_phases tph
WHERE tph.name = 'Base Building'
AND tp.id = (SELECT id FROM training_plans ORDER BY created_at DESC LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM plan_phases pp 
    WHERE pp.training_plan_id = tp.id
);
" "Adding plan phases for base building"

echo ""
echo "💬 Step 5: Creating conversations..."

# Create conversations between coaches and runners
run_sql "
INSERT INTO conversations (coach_id, runner_id, last_message_at, created_at)
SELECT DISTINCT 
    tp.coach_id,
    tp.runner_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM training_plans tp
WHERE tp.coach_id IS NOT NULL 
AND tp.runner_id IS NOT NULL
AND tp.coach_id != tp.runner_id
ON CONFLICT (coach_id, runner_id) DO NOTHING;
" "Creating conversations between coaches and runners"

echo ""
echo "✅ Test Data Added Successfully!"
echo ""
echo "📊 Summary of test data added:"
echo "  • Updated existing training plans with enhanced fields"
echo "  • Added 5 sample workouts with different types and intensities"
echo "  • Linked training plans to target races"
echo "  • Added plan phases for training progression"
echo "  • Created conversations between coaches and runners"
echo ""
echo "🔄 Your database now has realistic test data for development!"
echo "   You can test the enhanced training features with this data."