#!/bin/bash
set -e

# Working Test Data Script
# This script adds test data that works with the actual database constraints

echo "🌱 Adding Working Test Data..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables using robust loader
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
echo "🔍 Step 1: Checking training_plans structure..."

run_sql "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'training_plans' 
ORDER BY ordinal_position;
" "Checking training_plans structure"

echo ""
echo "🏃 Step 2: Adding workouts with correct status values..."

# Add workouts with status 'planned' (which is allowed)
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
        'planned',
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
        'planned',
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
        'planned',
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
" "Adding workouts with planned status"

echo ""
echo "📝 Step 3: Adding plan phases..."

# Add plan phases with proper structure
run_sql "
INSERT INTO plan_phases (
    training_plan_id,
    phase_id,
    phase_order,
    start_date,
    end_date,
    target_weekly_miles,
    completed,
    created_at
)
SELECT 
    tp.id,
    tph.id,
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '4 weeks',
    30,
    false,
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
echo "✅ Working Test Data Added Successfully!"
echo ""
echo "📊 Summary:"
echo "  • Added workouts with 'planned' status (constraint compliant)"
echo "  • Added plan phases with proper structure"
echo "  • Linked training plans to target races"
echo ""
echo "🔄 Your database now has working test data that respects all constraints!"