#!/bin/bash
#
# Setup Database Keep-Alive Cron Job
#
# This script sets up a cron job to run the database keep-alive script every 6 hours
# to prevent Supabase production database from auto-pausing due to inactivity.
#

set -e

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Setting up database keep-alive cron job..."
echo "📁 Project directory: $PROJECT_DIR"

# Create the cron command
CRON_COMMAND="0 */6 * * * cd $PROJECT_DIR && NODE_ENV=production pnpm tsx scripts/database-keepalive.ts >> $PROJECT_DIR/logs/keepalive.log 2>&1"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "database-keepalive.ts"; then
    echo "⚠️  Database keep-alive cron job already exists"
    echo "📋 Current cron entries containing 'database-keepalive':"
    crontab -l 2>/dev/null | grep "database-keepalive" || true
    
    read -p "🤔 Do you want to replace the existing cron job? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 0
    fi
    
    # Remove existing entries
    (crontab -l 2>/dev/null | grep -v "database-keepalive") | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

echo "✅ Database keep-alive cron job added successfully!"
echo ""
echo "📋 Cron job details:"
echo "   Schedule: Every 6 hours (0 */6 * * *)"
echo "   Script: $PROJECT_DIR/scripts/database-keepalive.ts"
echo "   Logs: $PROJECT_DIR/logs/keepalive.log"
echo ""
echo "🔍 To verify the cron job:"
echo "   crontab -l | grep keepalive"
echo ""
echo "📊 To monitor logs:"
echo "   tail -f $PROJECT_DIR/logs/keepalive.log"
echo ""
echo "⚠️  Note: Ensure your production environment variables are properly configured!"