#!/bin/bash
set -e

# User Data Backup Script
# Backs up user data before major schema changes

echo "💾 Backing up UltraCoach User Data..."

# Get timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# Function to backup table
backup_table() {
    local table="$1"
    local description="$2"
    
    echo "  📊 Backing up $description..."
    
    if command -v supabase &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
        supabase db dump --db-url "$SUPABASE_DB_URL" --data-only --table "$table" > "$BACKUP_DIR/${table}.sql"
    elif [ -n "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" --data-only --table="$table" > "$BACKUP_DIR/${table}.sql"
    else
        echo "❌ No database connection available. Set DATABASE_URL or SUPABASE_DB_URL."
        exit 1
    fi
}

echo ""
echo "🔒 Backing up core user data..."
backup_table "users" "User accounts"
backup_table "training_plans" "Training plans"
backup_table "workouts" "Workouts"
backup_table "conversations" "Chat conversations"
backup_table "messages" "Chat messages"
backup_table "notifications" "Notifications"

echo ""
echo "🏁 Backing up race data (if exists)..."
backup_table "races" "User races" 2>/dev/null || echo "  ⏭️  No races table found"

echo ""
echo "📝 Creating backup manifest..."
cat > "$BACKUP_DIR/manifest.txt" << EOF
UltraCoach Database Backup
Created: $(date)
Backup ID: $TIMESTAMP

Tables included:
- users: User accounts and profiles
- training_plans: All training plans
- workouts: All workout records
- conversations: Chat conversations
- messages: Chat message history
- notifications: User notifications
- races: User-created races (if exists)

Restore instructions:
1. Ensure database schema is compatible
2. Run: psql \$DATABASE_URL -f users.sql
3. Run: psql \$DATABASE_URL -f training_plans.sql
4. Run: psql \$DATABASE_URL -f workouts.sql
5. Run: psql \$DATABASE_URL -f conversations.sql
6. Run: psql \$DATABASE_URL -f messages.sql
7. Run: psql \$DATABASE_URL -f notifications.sql
8. Run: psql \$DATABASE_URL -f races.sql (if exists)

Note: This backup only includes data, not schema.
Schema changes may require manual data migration.
EOF

echo ""
echo "✅ Backup complete!"
echo ""
echo "📋 Backup details:"
echo "   • Location: $BACKUP_DIR"
echo "   • Tables: $(ls -1 "$BACKUP_DIR"/*.sql | wc -l) tables backed up"
echo "   • Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo "💡 To restore this backup:"
echo "   1. Ensure compatible schema is installed"
echo "   2. Run restore commands from manifest.txt"
echo ""
echo "⚠️  Keep this backup safe before making schema changes!"