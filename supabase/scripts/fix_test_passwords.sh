#!/bin/bash
set -e

# Fix Test User Password Hashes
# Updates all test user passwords to the correct bcrypt hash for 'password123'

echo "🔐 Fixing test user password hashes..."

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    echo "📄 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
else
    echo "⚠️  .env.local file not found"
    echo "   Please ensure DATABASE_PASSWORD is set in your environment"
fi

# Check if we have the database password
if [ -z "$DATABASE_PASSWORD" ]; then
    echo "❌ DATABASE_PASSWORD not found in environment"
    echo "   Please add it to your .env.local file"
    exit 1
fi

# Build DATABASE_URL
DATABASE_URL="postgresql://postgres.ccnbzjpccmlribljugve:${DATABASE_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

echo "🔧 Updating password hashes for test users..."

# Update all test user password hashes
PGPASSWORD="$DATABASE_PASSWORD" psql -h aws-0-us-east-2.pooler.supabase.com -U postgres.ccnbzjpccmlribljugve -d postgres << 'EOF'
-- Update test user password hashes to correct bcrypt hash for 'password123'
UPDATE users 
SET password_hash = '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO',
    updated_at = NOW()
WHERE email LIKE '%ultracoach.dev';

-- Show results
SELECT 
    COUNT(*) as total_updated,
    string_agg(DISTINCT role, ', ') as roles_updated
FROM users 
WHERE email LIKE '%ultracoach.dev' 
AND password_hash = '$2b$10$X8I5wWTv1hemEAXQsZX3y.iWGnBG/gCCZ0iP/Q1VsupZkIhD3PQcO';
EOF

echo ""
echo "✅ Password hashes updated successfully!"
echo ""
echo "🔑 Test users can now login with:"
echo "   Email: coach1@ultracoach.dev (or any test user)"
echo "   Password: password123"