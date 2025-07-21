#!/bin/bash
set -e

# Database Reset Script for Current Schema
# This script resets the database to a clean state with current Better Auth schema

echo "⚠️  DATABASE RESET WARNING ⚠️"
echo ""
echo "This will PERMANENTLY DELETE all data in the following tables:"
echo "  • All workouts (8 currently)"
echo "  • All plan phases (1 currently)"
echo "  • All conversations (11 currently)"
echo "  • All messages (34 currently)"
echo "  • All notifications (15 currently)"
echo "  • All training plans (13 currently)"
echo "  • All template phases (1 currently)"
echo "  • All plan templates (5 currently)"
echo "  • All races (5 currently)"
echo ""
echo "⚠️  This will NOT delete users or authentication data"
echo ""

read -p "Are you ABSOLUTELY sure you want to continue? (type 'RESET' to confirm): " -r
if [ "$REPLY" != "RESET" ]; then
    echo "❌ Reset cancelled. No changes made."
    exit 1
fi

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
echo "🗑️  Step 1: Clearing Data Tables..."

# Clear data tables in dependency order
run_sql "TRUNCATE TABLE template_phases RESTART IDENTITY CASCADE;" "Clearing template phases"
run_sql "TRUNCATE TABLE plan_templates RESTART IDENTITY CASCADE;" "Clearing plan templates"
run_sql "TRUNCATE TABLE plan_phases RESTART IDENTITY CASCADE;" "Clearing plan phases"
run_sql "TRUNCATE TABLE workouts RESTART IDENTITY CASCADE;" "Clearing workouts"
run_sql "TRUNCATE TABLE conversations RESTART IDENTITY CASCADE;" "Clearing conversations"
run_sql "TRUNCATE TABLE messages RESTART IDENTITY CASCADE;" "Clearing messages"
run_sql "TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;" "Clearing notifications"
run_sql "TRUNCATE TABLE training_plans RESTART IDENTITY CASCADE;" "Clearing training plans"
run_sql "TRUNCATE TABLE races RESTART IDENTITY CASCADE;" "Clearing races"

echo ""
echo "🌱 Step 2: Re-adding Base Data..."

# Re-add races
run_sql "
INSERT INTO races (name, distance_km, distance_miles, elevation_gain_m, elevation_gain_ft, terrain_type, race_date, location, description) 
VALUES 
    ('Western States 100', 161, 100, 5486, 18000, 'trail', '2025-06-28', 'California, USA', 'The original and most prestigious 100-mile trail race'),
    ('Leadville 100', 161, 100, 4573, 15000, 'trail', '2025-08-16', 'Colorado, USA', 'Race across the sky in the Colorado Rockies'),
    ('UTMB', 171, 106, 10000, 32800, 'trail', '2025-08-29', 'Chamonix, France', 'Ultra-Trail du Mont-Blanc around the Mont Blanc massif'),
    ('JFK 50', 80, 50, 610, 2000, 'mixed', '2025-11-22', 'Maryland, USA', 'Americas oldest ultramarathon covering 50 miles'),
    ('Badwater 135', 217, 135, 3962, 13000, 'road', '2025-07-14', 'California, USA', 'Death Valley to Mt. Whitney - the toughest foot race on Earth');
" "Re-adding sample races"

# Re-add plan templates
run_sql "
INSERT INTO plan_templates (name, description, plan_type, distance_km, distance_miles, difficulty_level, duration_weeks, focus_area, is_public) 
VALUES 
    ('50K Training Plan - Beginner', 'A 16-week plan for first-time 50K runners', 'race_specific', 50, 31, 'beginner', 16, 'completion', true),
    ('50K Training Plan - Intermediate', 'A 16-week plan for experienced 50K runners', 'race_specific', 50, 31, 'intermediate', 16, 'time_goal', true),
    ('50M Training Plan - Intermediate', 'A 20-week plan for 50-mile races', 'race_specific', 80, 50, 'intermediate', 20, 'completion', true),
    ('100K Training Plan - Advanced', 'A 24-week plan for 100K races', 'race_specific', 100, 62, 'advanced', 24, 'time_goal', true),
    ('Base Building - 12 Week', 'Build aerobic base for future training', 'base_building', 0, 0, 'intermediate', 12, 'aerobic_base', true);
" "Re-adding sample plan templates"

echo ""
echo "✅ Database Reset Complete!"
echo ""
echo "📊 Database has been reset to clean state with:"
echo "  • 5 sample races"
echo "  • 5 plan templates"
echo "  • 10 training phases (preserved)"
echo "  • 17 users (preserved)"
echo "  • All other data tables cleared"
echo ""
echo "🔄 To add test data, run: ./supabase/scripts/working_test_data.sh"
echo "⚠️  Remember to update any running applications that may have cached data."