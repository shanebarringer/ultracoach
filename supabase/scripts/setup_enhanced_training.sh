#!/bin/bash
set -e

# Enhanced Training Plans Setup Script
# This script sets up the enhanced training plan system in Supabase

echo "🚀 Setting up Enhanced Training Plans..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 Working from: $SUPABASE_DIR"

# Function to run SQL file
run_sql() {
    local file="$1"
    local description="$2"
    
    if [ ! -f "$file" ]; then
        echo "❌ File not found: $file"
        exit 1
    fi
    
    echo "  🔧 $description"
    if ! supabase db reset --db-url "$DATABASE_URL" --file "$file" 2>/dev/null; then
        # Fallback to psql if supabase command fails
        if [ -n "$DATABASE_URL" ]; then
            psql "$DATABASE_URL" -f "$file" > /dev/null
        else
            echo "❌ Failed to execute $file. Please set DATABASE_URL or use supabase CLI."
            exit 1
        fi
    fi
}

# Check for required environment variables
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Make sure you're connected to your Supabase project."
    echo "   You can set it with: export DATABASE_URL='your-supabase-connection-string'"
    echo "   Or use: supabase link --project-ref your-project-ref"
fi

echo ""
echo "🏗️  Step 1: Installing Enhanced Training Schema..."
run_sql "$SUPABASE_DIR/migrations/v2_enhanced_training/001_enhanced_training_schema.sql" "Enhanced training schema"

echo ""
echo "🌱 Step 2: Seeding Base Data..."
run_sql "$SUPABASE_DIR/seeds/02_seed_training_phases.sql" "Training phases"
run_sql "$SUPABASE_DIR/seeds/03_seed_plan_templates.sql" "Plan templates" 
run_sql "$SUPABASE_DIR/seeds/04_seed_template_phases.sql" "Template phases"

echo ""
echo "👥 Step 3: Creating Test Users (optional)..."
read -p "Create test users (2 coaches, 10 runners)? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_sql "$SUPABASE_DIR/seeds/01_seed_test_users.sql" "Test users and training plans"
    # Generate credentials file
    if [ -f "$SUPABASE_DIR/scripts/generate_test_credentials.sh" ]; then
        cd "$SUPABASE_DIR" && ./scripts/generate_test_credentials.sh
        cd - > /dev/null
    fi
    echo "  ✅ Test users created and credentials generated"
else
    echo "  ⏭️  Skipped test users"
fi

echo ""
echo "🏃 Step 4: Adding Sample Races (optional)..."
read -p "Add sample races for development? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_sql "$SUPABASE_DIR/seeds/05_seed_sample_races.sql" "Sample races"
    echo "  ✅ Sample races added"
else
    echo "  ⏭️  Skipped sample races"
fi

echo ""
echo "✅ Enhanced Training Plans setup complete!"
echo ""
echo "📋 What was installed:"
echo "   • 5 new tables: races, training_phases, plan_phases, plan_templates, template_phases"
echo "   • Enhanced training_plans and workouts tables"
echo "   • 10 standard training phases"
echo "   • 15+ training plan templates"
echo "   • Full RLS security policies"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   • Test users: 2 coaches, 10 runners with training plans"
fi
echo ""
echo "🔧 Next steps:"
echo "   • Update your application to use the new schema"
echo "   • Test the new training plan features"
echo "   • Add your own races and templates"
echo ""
echo "💡 Useful commands:"
echo "   • Reset: ./scripts/reset_database.sh"
echo "   • Seed only: ./scripts/seed_database.sh"