#!/bin/bash
set -e

# Database Seeding Script
# Seeds the database with training phases, templates, and sample data

echo "🌱 Seeding UltraCoach Database..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"

# Function to run SQL file
run_sql() {
    local file="$1"
    local description="$2"
    
    if [ ! -f "$file" ]; then
        echo "❌ File not found: $file"
        exit 1
    fi
    
    echo "  🔧 $description"
    if command -v supabase &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
        supabase db reset --db-url "$SUPABASE_DB_URL" --file "$file" > /dev/null
    elif [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f "$file" > /dev/null
    else
        echo "❌ No database connection available. Set DATABASE_URL or SUPABASE_DB_URL."
        exit 1
    fi
}

echo ""
echo "👥 Seeding Test Users..."
read -p "Include test users (2 coaches, 10 runners)? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_sql "$SUPABASE_DIR/seeds/01_seed_test_users.sql" "Test users and training plans"
    # Generate credentials file
    if [ -f "$SUPABASE_DIR/scripts/generate_test_credentials.sh" ]; then
        cd "$SUPABASE_DIR" && ./scripts/generate_test_credentials.sh
        cd - > /dev/null
    fi
    echo "  ✅ Test users created"
else
    echo "  ⏭️  Skipped test users"
fi

echo ""
echo "📊 Seeding Training Phases..."
run_sql "$SUPABASE_DIR/seeds/02_seed_training_phases.sql" "Training phases"

echo ""
echo "📋 Seeding Plan Templates..."
run_sql "$SUPABASE_DIR/seeds/03_seed_plan_templates.sql" "Plan templates"
run_sql "$SUPABASE_DIR/seeds/04_seed_template_phases.sql" "Template phases"

echo ""
echo "🏁 Seeding Sample Races..."
read -p "Include sample races? (y/N): " -n 1 -r
echo ""
RACES_ADDED=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_sql "$SUPABASE_DIR/seeds/05_seed_sample_races.sql" "Sample races"
    echo "  ✅ Sample races added"
    RACES_ADDED=true
else
    echo "  ⏭️  Skipped sample races"
fi

echo ""
echo "✅ Database seeding complete!"
echo ""
echo "📋 What was seeded:"
echo "   • 10 training phases (Base, Build, Peak, Taper, Recovery)"
echo "   • 15+ training plan templates (50K to 100M)"
echo "   • Template phase structures"
if [ "$RACES_ADDED" = true ]; then
    echo "   • 20+ sample races for 2025 season"
fi
echo ""
echo "🎯 Ready to start creating training plans!"