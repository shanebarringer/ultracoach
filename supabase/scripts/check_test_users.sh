#!/bin/bash
set -e

# Check Test Users Script
echo "👥 Checking Test Users..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables using secure loader
source "$SCRIPT_DIR/load_env.sh"

# Check if test users exist
echo ""
echo "🔍 Checking for test users in better_auth_users table:"
psql "$DATABASE_URL" -c "
SELECT 
    email, 
    role, 
    created_at::date as created 
FROM better_auth_users 
WHERE email LIKE '%ultracoach.dev' 
ORDER BY email 
LIMIT 10;
"

echo ""
echo "📊 Total test users count:"
psql "$DATABASE_URL" -c "
SELECT COUNT(*) as test_users_count 
FROM better_auth_users 
WHERE email LIKE '%ultracoach.dev';
"

echo ""
echo "🎯 Testing specific credentials:"
echo "Checking if runner1@ultracoach.dev exists..."
psql "$DATABASE_URL" -c "
SELECT 
    email,
    role,
    id,
    CASE WHEN email = 'runner1@ultracoach.dev' THEN '✅ Found' ELSE '❌ Missing' END as status
FROM better_auth_users 
WHERE email = 'runner1@ultracoach.dev';
"

echo ""
echo "Checking if coach1@ultracoach.dev exists..."
psql "$DATABASE_URL" -c "
SELECT 
    email,
    role,
    id,
    CASE WHEN email = 'coach1@ultracoach.dev' THEN '✅ Found' ELSE '❌ Missing' END as status
FROM better_auth_users 
WHERE email = 'coach1@ultracoach.dev';
"