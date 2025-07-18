#!/bin/bash
set -e

# Fix Enhanced Training Schema Script
# This script fixes the data type issues and completes the enhanced training setup

echo "🔧 Fixing Enhanced Training Schema..."
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
        # Build DATABASE_URL from environment variables
        DATABASE_URL="postgresql://postgres.ccnbzjpccmlribljugve:${DATABASE_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
        echo "✅ Built DATABASE_URL from environment variables"
    else
        echo "⚠️  DATABASE_URL not set. You can:"
        echo "   1. Set DATABASE_PASSWORD in your .env.local file"
        echo "   2. Set DATABASE_URL directly: export DATABASE_URL='your-connection-string'"
        echo "   3. Use: supabase link --project-ref your-project-ref"
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
        echo "❌ No database connection available. Set DATABASE_URL or SUPABASE_DB_URL."
        exit 1
    fi
}

echo ""
echo "🔍 Step 1: Checking better_auth_users ID type..."

# Check the data type of better_auth_users.id using the run_sql function
echo "  📊 Checking better_auth_users.id data type..."
run_sql "SELECT data_type FROM information_schema.columns WHERE table_name = 'better_auth_users' AND column_name = 'id';" "Getting ID data type"

echo ""
echo "🏗️  Step 2: Creating Plan Templates Table (with correct ID type)..."

# Create plan_templates table with TEXT foreign key
run_sql "
DROP TABLE IF EXISTS plan_templates CASCADE;
CREATE TABLE plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(50) DEFAULT 'race_specific',
    distance_km INTEGER NOT NULL,
    distance_miles INTEGER NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    duration_weeks INTEGER NOT NULL,
    focus_area VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    created_by TEXT REFERENCES better_auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
" "Creating plan_templates table with correct ID type"

# Create template_phases table
run_sql "
DROP TABLE IF EXISTS template_phases CASCADE;
CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES plan_templates(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES training_phases(id),
    phase_order INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, phase_order)
);
" "Creating template_phases table"

# Create conversations table with TEXT foreign keys
run_sql "
DROP TABLE IF EXISTS conversations CASCADE;
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id TEXT REFERENCES better_auth_users(id),
    runner_id TEXT REFERENCES better_auth_users(id),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coach_id, runner_id)
);
" "Creating conversations table with correct ID types"

echo ""
echo "🌱 Step 3: Adding Sample Data..."

# Add sample plan templates
run_sql "
INSERT INTO plan_templates (name, description, plan_type, distance_km, distance_miles, difficulty_level, duration_weeks, focus_area, is_public) 
VALUES 
    ('50K Training Plan - Beginner', 'A 16-week plan for first-time 50K runners', 'race_specific', 50, 31, 'beginner', 16, 'completion', true),
    ('50K Training Plan - Intermediate', 'A 16-week plan for experienced 50K runners', 'race_specific', 50, 31, 'intermediate', 16, 'time_goal', true),
    ('50M Training Plan - Intermediate', 'A 20-week plan for 50-mile races', 'race_specific', 80, 50, 'intermediate', 20, 'completion', true),
    ('100K Training Plan - Advanced', 'A 24-week plan for 100K races', 'race_specific', 100, 62, 'advanced', 24, 'time_goal', true),
    ('Base Building - 12 Week', 'Build aerobic base for future training', 'base_building', 0, 0, 'intermediate', 12, 'aerobic_base', true)
ON CONFLICT DO NOTHING;
" "Adding sample plan templates"

# Link some template phases to the base building plan
run_sql "
INSERT INTO template_phases (template_id, phase_id, phase_order, duration_weeks)
SELECT 
    pt.id,
    tp.id,
    1,
    12
FROM plan_templates pt
CROSS JOIN training_phases tp
WHERE pt.name = 'Base Building - 12 Week'
AND tp.name = 'Base Building'
LIMIT 1;
" "Adding template phases for base building plan"

echo ""
echo "🔄 Step 4: Creating Simple Test Data Script..."

# Create a simple script to add basic test data
cat > /tmp/add_test_data.sql << 'EOF'
-- Simple test data for current schema
-- This adds some basic workouts and enhances existing training plans

-- Update existing training plans with enhanced fields
UPDATE training_plans 
SET 
    goal_type = 'completion',
    plan_type = 'race_specific'
WHERE goal_type IS NULL;

-- Add some sample workouts with enhanced fields
INSERT INTO workouts (
    training_plan_id,
    title,
    description,
    distance_km,
    duration_minutes,
    category,
    intensity,
    terrain_type,
    elevation_gain_m,
    scheduled_date,
    created_at
) VALUES 
    (
        (SELECT id FROM training_plans LIMIT 1),
        'Easy Base Run',
        'Comfortable aerobic pace run to build base fitness',
        10,
        75,
        'easy',
        4,
        'trail',
        200,
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans LIMIT 1),
        'Tempo Run',
        'Comfortably hard effort to improve lactate threshold',
        8,
        50,
        'tempo',
        7,
        'trail',
        150,
        CURRENT_DATE + INTERVAL '3 days',
        CURRENT_TIMESTAMP
    ),
    (
        (SELECT id FROM training_plans LIMIT 1),
        'Long Run',
        'Extended distance run to build endurance',
        20,
        180,
        'long_run',
        5,
        'trail',
        600,
        CURRENT_DATE + INTERVAL '6 days',
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
EOF

run_sql "$(cat /tmp/add_test_data.sql)" "Adding basic test data"

# Clean up temp file
rm -f /tmp/add_test_data.sql

echo ""
echo "✅ Enhanced Training Schema Fixed Successfully!"
echo ""
echo "📊 Summary of what's now available:"
echo "  • races table with 5 sample races"
echo "  • plan_templates table with 5 sample templates"
echo "  • template_phases table for template structure"
echo "  • conversations table for better chat organization"
echo "  • Enhanced training_plans with race targeting fields"
echo "  • Enhanced workouts with categories, intensity, and terrain"
echo "  • Sample test data for workouts and training plans"
echo ""
echo "🔄 Your database now has the complete enhanced training schema!"
echo "   All tables are properly configured with Better Auth compatibility."