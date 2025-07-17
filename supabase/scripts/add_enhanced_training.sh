#!/bin/bash
set -e

# Add Enhanced Training Schema Script
# This script adds the missing enhanced training tables to the current database

echo "🚀 Adding Enhanced Training Schema..."
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
echo "🏗️  Step 1: Creating Enhanced Training Tables..."

# Create races table
run_sql "
CREATE TABLE IF NOT EXISTS races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    distance_km INTEGER NOT NULL,
    distance_miles INTEGER NOT NULL,
    elevation_gain_m INTEGER DEFAULT 0,
    elevation_gain_ft INTEGER DEFAULT 0,
    terrain_type VARCHAR(50) DEFAULT 'trail',
    race_date DATE,
    location VARCHAR(255),
    website_url VARCHAR(500),
    registration_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
" "Creating races table"

# Create plan_templates table
run_sql "
CREATE TABLE IF NOT EXISTS plan_templates (
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
    created_by UUID REFERENCES better_auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
" "Creating plan_templates table"

# Create template_phases table
run_sql "
CREATE TABLE IF NOT EXISTS template_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES plan_templates(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES training_phases(id),
    phase_order INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, phase_order)
);
" "Creating template_phases table"

# Create conversations table (if needed)
run_sql "
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES better_auth_users(id),
    runner_id UUID REFERENCES better_auth_users(id),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coach_id, runner_id)
);
" "Creating conversations table"

echo ""
echo "🌱 Step 2: Adding Basic Test Data..."

# Add some sample races
run_sql "
INSERT INTO races (name, distance_km, distance_miles, elevation_gain_m, elevation_gain_ft, terrain_type, race_date, location, description) 
VALUES 
    ('Western States 100', 161, 100, 5486, 18000, 'trail', '2025-06-28', 'California, USA', 'The original and most prestigious 100-mile trail race'),
    ('Leadville 100', 161, 100, 4573, 15000, 'trail', '2025-08-16', 'Colorado, USA', 'Race across the sky in the Colorado Rockies'),
    ('UTMB', 171, 106, 10000, 32800, 'trail', '2025-08-29', 'Chamonix, France', 'Ultra-Trail du Mont-Blanc around the Mont Blanc massif'),
    ('JFK 50', 80, 50, 610, 2000, 'mixed', '2025-11-22', 'Maryland, USA', 'Americas oldest ultramarathon covering 50 miles'),
    ('Badwater 135', 217, 135, 3962, 13000, 'road', '2025-07-14', 'California, USA', 'Death Valley to Mt. Whitney - the toughest foot race on Earth')
ON CONFLICT DO NOTHING;
" "Adding sample races"

# Add some basic plan templates
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

echo ""
echo "🔄 Step 3: Updating Existing Tables..."

# Update training_plans table to include enhanced fields if they don't exist
run_sql "
DO \$\$
BEGIN
    -- Add target_race_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'target_race_id') THEN
        ALTER TABLE training_plans ADD COLUMN target_race_id UUID REFERENCES races(id);
    END IF;
    
    -- Add goal_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'goal_type') THEN
        ALTER TABLE training_plans ADD COLUMN goal_type VARCHAR(50) DEFAULT 'completion';
    END IF;
    
    -- Add plan_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'plan_type') THEN
        ALTER TABLE training_plans ADD COLUMN plan_type VARCHAR(50) DEFAULT 'race_specific';
    END IF;
END \$\$;
" "Updating training_plans table with enhanced fields"

# Update workouts table to include enhanced fields
run_sql "
DO \$\$
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'category') THEN
        ALTER TABLE workouts ADD COLUMN category VARCHAR(50) DEFAULT 'easy';
    END IF;
    
    -- Add intensity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'intensity') THEN
        ALTER TABLE workouts ADD COLUMN intensity INTEGER DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10);
    END IF;
    
    -- Add terrain_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'terrain_type') THEN
        ALTER TABLE workouts ADD COLUMN terrain_type VARCHAR(50) DEFAULT 'trail';
    END IF;
    
    -- Add elevation_gain_m column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'elevation_gain_m') THEN
        ALTER TABLE workouts ADD COLUMN elevation_gain_m INTEGER DEFAULT 0;
    END IF;
END \$\$;
" "Updating workouts table with enhanced fields"

echo ""
echo "✅ Enhanced Training Schema Added Successfully!"
echo ""
echo "📊 Summary of additions:"
echo "  • races table with 5 sample races"
echo "  • plan_templates table with 5 sample templates"
echo "  • template_phases table for template structure"
echo "  • conversations table for better chat organization"
echo "  • Enhanced training_plans table with race targeting"
echo "  • Enhanced workouts table with categories and intensity"
echo ""
echo "🔄 Your database now has the enhanced training schema!"
echo "   You can now use the full training plan features."