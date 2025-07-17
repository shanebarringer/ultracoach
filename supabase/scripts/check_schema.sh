#!/bin/bash
set -e

# Database Schema Check Script
# This script checks what tables currently exist in the database

echo "🔍 Checking Current Database Schema..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables using robust loader
source "$SCRIPT_DIR/load_env.sh"

# Function to run SQL query
run_query() {
    local query="$1"
    local description="$2"
    
    echo "  🔧 $description"
    if command -v supabase &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
        supabase db query --db-url "$SUPABASE_DB_URL" "$query"
    elif [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -c "$query"
    else
        echo "❌ No database connection available. Set DATABASE_URL or SUPABASE_DB_URL."
        exit 1
    fi
}

echo ""
echo "📋 All Tables in Database:"
run_query "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" "Getting all public tables"

echo ""
echo "🔗 Table Relationships (Foreign Keys):"
run_query "
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
" "Getting foreign key relationships"

echo ""
echo "🏗️ Enhanced Training Tables Check:"
ENHANCED_TABLES=("races" "training_phases" "plan_phases" "plan_templates" "template_phases")

for table in "${ENHANCED_TABLES[@]}"; do
    echo "  Checking $table..."
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if [[ "$EXISTS" =~ "t" ]]; then
        echo "    ✅ $table exists"
        # Get row count
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;")
        echo "    📊 Row count: $COUNT"
    else
        echo "    ❌ $table does not exist"
    fi
done

echo ""
echo "👥 User Tables Check:"
USER_TABLES=("users" "better_auth_users" "user_mapping")

for table in "${USER_TABLES[@]}"; do
    echo "  Checking $table..."
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if [[ "$EXISTS" =~ "t" ]]; then
        echo "    ✅ $table exists"
        # Get row count
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;")
        echo "    📊 Row count: $COUNT"
    else
        echo "    ❌ $table does not exist"
    fi
done

echo ""
echo "🔄 Core Tables Check:"
CORE_TABLES=("training_plans" "workouts" "conversations" "messages" "notifications")

for table in "${CORE_TABLES[@]}"; do
    echo "  Checking $table..."
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if [[ "$EXISTS" =~ "t" ]]; then
        echo "    ✅ $table exists"
        # Get row count
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;")
        echo "    📊 Row count: $COUNT"
    else
        echo "    ❌ $table does not exist"
    fi
done

echo ""
echo "✅ Schema check complete!"