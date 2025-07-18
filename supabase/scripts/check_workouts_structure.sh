#!/bin/bash
set -e

# Check workouts table structure
echo "🔍 Checking workouts table structure..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SUPABASE_DIR")"

# Load environment variables from .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

# Check for required environment variables and build DATABASE_URL if needed
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    if [ -n "$DATABASE_PASSWORD" ]; then
        DATABASE_URL="postgresql://postgres.ccnbzjpccmlribljugve:${DATABASE_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
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

run_sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'workouts' ORDER BY ordinal_position;" "Getting workouts table structure"