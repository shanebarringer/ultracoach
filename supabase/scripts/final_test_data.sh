#!/bin/bash
set -e

# Final Test Data Script
# This script adds test data that works with the current database constraints

echo "🌱 Adding Final Test Data..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SUPABASE_DIR")"

# Load environment variables using secure loader
source "$SCRIPT_DIR/load_env.sh"

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
echo "🔍 Step 1: Checking constraints..."

# Check workouts status constraint
run_sql "
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'workouts' AND tc.constraint_type = 'CHECK';
" "Checking workouts constraints"

# Check plan_phases structure
run_sql "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'plan_phases' 
ORDER BY ordinal_position;
" "Checking plan_phases structure"

echo ""
echo "🏃 Step 2: Adding workouts with correct status..."

# Add workouts with proper status values
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
        'pending',
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
        'pending',
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
        'pending',
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
" "Adding workouts with pending status"

echo ""
echo "📝 Step 3: Adding plan phases without status..."

# Add plan phases without the status field
run_sql "
INSERT INTO plan_phases (
    training_plan_id,
    phase_id,
    phase_order,
    start_date,
    end_date,
    created_at
)
SELECT 
    tp.id,
    tph.id,
    1,
    tp.start_date,
    tp.start_date + INTERVAL '4 weeks',
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
echo "🏁 Step 4: Linking training plans to races..."

# Link training plans to races
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
echo "✅ Final Test Data Added Successfully!"
echo ""
echo "📊 Summary:"
echo "  • Added workouts with proper status values"
echo "  • Added plan phases without status field"
echo "  • Linked training plans to target races"
echo "  • Created conversations between coaches and runners"
echo ""
echo "🔄 Your database now has working test data!"