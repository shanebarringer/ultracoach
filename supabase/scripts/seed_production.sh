#!/bin/bash
set -e

# Production Database Seeding Script
# Seeds the production database with training phases, templates, and test users

echo "🌱 Seeding Production UltraCoach Database..."
echo "🚨 WARNING: This will modify your PRODUCTION database!"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SUPABASE_DIR")"

# Load environment variables from .env.local
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "  📋 Loading environment variables from .env.local"
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
else
    echo "  ⚠️  No .env.local file found"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment variables"
    exit 1
fi

# Confirm production seeding
read -p "Are you sure you want to seed PRODUCTION database? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Production seeding cancelled"
    exit 1
fi

echo ""
echo "🔧 Seeding training phases..."
psql "$DATABASE_URL" -f ./supabase/seeds/02_seed_training_phases.sql > /dev/null

echo "🔧 Seeding plan templates..."
psql "$DATABASE_URL" -f ./supabase/seeds/03_seed_plan_templates.sql > /dev/null

echo "🔧 Seeding template phases..."
psql "$DATABASE_URL" -f ./supabase/seeds/04_seed_template_phases.sql > /dev/null

echo "🔧 Creating test users with Better Auth schema..."
psql "$DATABASE_URL" -c "
INSERT INTO better_auth_users (id, email, name, full_name, role, created_at) VALUES 
('coach1', 'testcoach@ultracoach.dev', 'Test Coach', 'Test Coach User', 'coach', NOW()),
('coach2', 'coach2@ultracoach.dev', 'Sarah Mountain', 'Sarah Mountain', 'coach', NOW()),
('runner1', 'testrunner@ultracoach.dev', 'Test Runner', 'Test Runner User', 'runner', NOW()),
('runner2', 'runner2@ultracoach.dev', 'Mike Trailblazer', 'Mike Trailblazer', 'runner', NOW())
ON CONFLICT (email) DO NOTHING;
" > /dev/null

echo "🔧 Creating sample training plan..."
psql "$DATABASE_URL" -c "
DO \$\$
DECLARE
    plan_id UUID;
BEGIN
    -- Create a sample training plan
    INSERT INTO training_plans (id, title, description, coach_id, runner_id, target_race_date, target_race_distance, created_at)
    VALUES (gen_random_uuid(), 'Sample 50K Training Plan', 'A beginner-friendly 50K training plan', 'coach1', 'runner1', '2025-09-15', '50K', NOW())
    RETURNING id INTO plan_id;
    
    -- Add some sample workouts
    INSERT INTO workouts (training_plan_id, date, planned_distance, planned_duration, planned_type, status, created_at) VALUES
    (plan_id, CURRENT_DATE + INTERVAL '1 day', 5.0, 2400, 'easy', 'planned', NOW()),
    (plan_id, CURRENT_DATE + INTERVAL '3 days', 8.0, 4800, 'long_run', 'planned', NOW()),
    (plan_id, CURRENT_DATE + INTERVAL '5 days', 3.0, 1800, 'recovery', 'planned', NOW());
    
    RAISE NOTICE 'Sample training plan created with ID: %', plan_id;
END
\$\$;
" > /dev/null

echo ""
read -p "Include sample races? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Seeding sample races..."
    psql "$DATABASE_URL" -f ./supabase/seeds/05_seed_sample_races.sql > /dev/null
    echo "  ✅ Sample races added"
else
    echo "  ⏭️  Skipped sample races"
fi

echo ""
echo "✅ Production database seeding complete!"
echo ""
echo "📊 Database summary:"
psql "$DATABASE_URL" -c "
SELECT 
    'Users' as table_name, COUNT(*) as count FROM better_auth_users
UNION ALL
SELECT 'Training Plans', COUNT(*) FROM training_plans
UNION ALL
SELECT 'Workouts', COUNT(*) FROM workouts
UNION ALL
SELECT 'Training Phases', COUNT(*) FROM training_phases
UNION ALL
SELECT 'Plan Templates', COUNT(*) FROM plan_templates
ORDER BY table_name;
"

echo ""
echo "👥 Test Users Created:"
psql "$DATABASE_URL" -c "SELECT id, email, role FROM better_auth_users WHERE email LIKE '%ultracoach.dev' OR email LIKE '%@%' ORDER BY role, email;"

echo ""
echo "🎯 Ready to test authentication with:"
echo "   • testcoach@ultracoach.dev (coach)"
echo "   • testrunner@ultracoach.dev (runner)"
echo ""
echo "ℹ️  Note: Users need to sign up through your app to set passwords"