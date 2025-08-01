#!/bin/bash
set -e

# Database Reset Script (non-interactive)

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
        echo "⚠️  DATABASE_URL not set. You can set DATABASE_PASSWORD in your .env.local file"
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
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f "$file" > /dev/null
    else
        echo "❌ No database connection available. Set DATABASE_URL."
        exit 1
    fi
}

echo ""
echo "🗑️  Step 1: Dropping Enhanced Schema..."
run_sql "$SUPABASE_DIR/scripts/drop_enhanced_schema.sql" "Dropping enhanced tables"

echo ""
echo "🏗️  Step 2: Rebuilding Schema..."
run_sql "$SUPABASE_DIR/migrations/20250729000001_initial_schema.sql" "Enhanced training schema"

echo ""
echo "🌱 Step 3: Re-seeding Base Data..."
run_sql "$SUPABASE_DIR/seeds/02_seed_training_phases.sql" "Training phases"
run_sql "$SUPABASE_DIR/seeds/03_seed_plan_templates.sql" "Plan templates"
run_sql "$SUPABASE_DIR/seeds/04_seed_template_phases.sql" "Template phases"

echo ""
echo "🏃 Step 4: Seeding Sample Data..."
run_sql "$SUPABASE_DIR/seeds/05_seed_sample_races.sql" "Sample races"
echo "  ✅ Sample races added"

echo ""
echo "✅ Database reset complete!"
