#!/bin/bash
set -e

# Database Schema Check Script
# This script checks what tables currently exist in the database
# For production environments, consider using .pgpass files for enhanced security.

echo "🔍 Checking Current Database Schema..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables using robust loader
source "$SCRIPT_DIR/load_env.sh"

# Determine the database connection string to use
DB_CONN="$DATABASE_URL"
if [ -n "$SUPABASE_DB_URL" ]; then
    DB_CONN="$SUPABASE_DB_URL"
fi

if [ -z "$DB_CONN" ]; then
    echo "❌ No database connection available. Set DATABASE_URL or SUPABASE_DB_URL."
    exit 1
fi

# Function to run SQL query
run_query() {
    local query="$1"
    local description="$2"
    
    echo "  🔧 $description"
    if command -v supabase &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
        supabase db query --db-url "$DB_CONN" "$query"
    else
        psql "$DB_CONN" -c "$query"
    fi
}

# Function to check for table existence and row count
check_table() {
    local table_name="$1"
    echo "  Checking $table_name..."
    
    # Use a parameterized query to prevent SQL injection
    EXISTS_QUERY="SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');"
    
    EXISTS=$(psql "$DB_CONN" -t -c "$EXISTS_QUERY")

    if [[ "$EXISTS" =~ "t" ]]; then
        echo "    ✅ $table_name exists"
        # Get row count
        COUNT_QUERY="SELECT COUNT(*) FROM \"$table_name\";"
        COUNT=$(psql "$DB_CONN" -t -c "$COUNT_QUERY")
        echo "    📊 Row count: $COUNT"
    else
        echo "    ❌ $table_name does not exist"
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
# Function to safely check if table exists and get row count
check_table_safely() {
    local table_name="$1"
    
    # Validate table name contains only safe characters
    if [[ ! "$table_name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        echo "    ❌ Invalid table name: $table_name"
        return 1
    fi
    
    echo "  Checking $table_name..."
    
    # Use parameterized query approach with psql
    EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = \$1);" "$table_name")
    if [[ "$EXISTS" =~ "t" ]]; then
        echo "    ✅ $table_name exists"
        # Get row count using quoted identifier for safety
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table_name\";")
        echo "    📊 Row count: $COUNT"
    else
        echo "    ❌ $table_name does not exist"
    fi
}

for table in "${ENHANCED_TABLES[@]}"; do
    check_table_safely "$table"
done

echo ""
echo "👥 User Tables Check:"
USER_TABLES=("users" "better_auth_users" "user_mapping")
for table in "${USER_TABLES[@]}"; do
    check_table_safely "$table"
done

echo ""
echo "🔄 Core Tables Check:"
CORE_TABLES=("training_plans" "workouts" "conversations" "messages" "notifications")
for table in "${CORE_TABLES[@]}"; do
    check_table_safely "$table"
done

echo ""
echo "✅ Schema check complete!"
