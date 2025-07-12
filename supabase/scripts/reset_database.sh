#!/bin/bash
set -e

# Database Reset Script
# WARNING: This will delete ALL data in enhanced training tables

echo "⚠️  DATABASE RESET WARNING ⚠️"
echo ""
echo "This will PERMANENTLY DELETE all data in the enhanced training tables:"
echo "  • All races"
echo "  • All training plan templates" 
echo "  • All plan phases and progressions"
echo "  • All enhanced workout data"
echo ""
echo "Standard training phases will be preserved as they will be re-seeded."
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
    fi
fi

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
echo "🗑️  Step 1: Dropping Enhanced Schema..."
run_sql "$SUPABASE_DIR/scripts/drop_enhanced_schema.sql" "Dropping enhanced tables"

echo ""
echo "🏗️  Step 2: Rebuilding Schema..."
run_sql "$SUPABASE_DIR/migrations/v2_enhanced_training/001_enhanced_training_schema.sql" "Enhanced training schema"

echo ""
echo "🌱 Step 3: Re-seeding Base Data..."
run_sql "$SUPABASE_DIR/seeds/02_seed_training_phases.sql" "Training phases"
run_sql "$SUPABASE_DIR/seeds/03_seed_plan_templates.sql" "Plan templates"
run_sql "$SUPABASE_DIR/seeds/04_seed_template_phases.sql" "Template phases"

echo ""
echo "🏃 Step 4: Sample Data..."
read -p "Add sample races? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_sql "$SUPABASE_DIR/seeds/05_seed_sample_races.sql" "Sample races"
    echo "  ✅ Sample races added"
else
    echo "  ⏭️  Skipped sample races"
fi

echo ""
echo "✅ Database reset complete!"
echo ""
echo "🔄 Database has been reset to clean enhanced training state."
echo "   All custom data has been removed."
echo "   Base templates and phases have been restored."
echo ""
echo "⚠️  Remember to update any running applications that may have cached data."