#!/bin/bash

# Migration script to Better Auth IDs
# This script runs the database migration to use Better Auth IDs directly

set -e

echo "🚀 Starting migration to Better Auth IDs..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

# Create backup first
echo "📦 Creating backup before migration..."
backup_file="backup_before_better_auth_migration_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DATABASE_URL" > "supabase/backups/$backup_file"
echo "✅ Backup created: $backup_file"

# Run the migration
echo "🔄 Running Better Auth ID migration..."
psql "$DATABASE_URL" -f supabase/migrations/0007_migrate_to_better_auth_ids.sql

echo "✅ Migration completed successfully!"

# Run verification
echo "🔍 Verifying migration..."
psql "$DATABASE_URL" -c "
SELECT 
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM training_plans) as training_plan_count,
    (SELECT COUNT(*) FROM workouts) as workout_count,
    (SELECT COUNT(*) FROM messages) as message_count,
    (SELECT COUNT(*) FROM conversations) as conversation_count;
"

echo "🎉 Migration to Better Auth IDs completed successfully!"
echo "📝 Remember to:"
echo "   1. Update API routes to use Better Auth IDs directly"
echo "   2. Remove user mapping system"
echo "   3. Test all functionality"
echo "   4. Deploy changes to production"