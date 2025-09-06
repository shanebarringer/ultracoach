#!/bin/bash

# CI Setup Script - Seeds test data for E2E tests
echo "Setting up CI test data..."

# Export environment variables
export $(grep -v '^#' .env.local | xargs)

# Add test users directly to database
psql "$DATABASE_URL" << EOF
-- Create additional test coaches (unconnected)
INSERT INTO better_auth_users (id, email, name, full_name, role, user_type, email_verified, created_at, updated_at)
VALUES 
  ('test-coach-1-unconnected', 'test.coach@ultracoach.dev', 'Test Coach', 'Test Coach One', 'user', 'coach', true, NOW(), NOW()),
  ('test-coach-2-unconnected', 'test.coach2@ultracoach.dev', 'Coach Two', 'Test Coach Two', 'user', 'coach', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create additional test runners (unconnected)
INSERT INTO better_auth_users (id, email, name, full_name, role, user_type, email_verified, created_at, updated_at)
VALUES 
  ('test-runner-1-unconnected', 'test.runner@ultracoach.dev', 'Test Runner', 'Test Runner One', 'user', 'runner', true, NOW(), NOW()),
  ('test-runner-2-unconnected', 'test.runner2@ultracoach.dev', 'Runner Two', 'Test Runner Two', 'user', 'runner', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

echo "CI test data setup complete!"