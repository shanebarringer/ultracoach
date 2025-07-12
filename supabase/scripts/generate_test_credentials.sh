#!/bin/bash
set -e

# Generate Test User Credentials
# Creates a credentials file for development testing

echo "🔐 Generating test user credentials..."

# Create credentials directory if it doesn't exist
mkdir -p "credentials"

# Get timestamp for file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CREDS_FILE="credentials/test_users_${TIMESTAMP}.txt"

# Create credentials file
cat > "$CREDS_FILE" << 'EOF'
# UltraCoach Test User Credentials
# Generated for development and testing purposes
# 
# IMPORTANT: These are test accounts with a common password
# DO NOT use these credentials in production!

## Default Password for All Test Users
password123

## Coach Accounts
coach1@ultracoach.dev | Sarah Mountain | Coach
coach2@ultracoach.dev | Mike Trailblazer | Coach

## Runner Accounts  
runner1@ultracoach.dev | Alex Speedster | Runner (Coach: Sarah Mountain)
runner2@ultracoach.dev | Jordan Endurance | Runner (Coach: Sarah Mountain)
runner3@ultracoach.dev | Taylor Swift-feet | Runner (Coach: Sarah Mountain)
runner4@ultracoach.dev | Casey Hillclimber | Runner (Coach: Sarah Mountain)
runner5@ultracoach.dev | Morgan Longdistance | Runner (Coach: Sarah Mountain)
runner6@ultracoach.dev | Riley Trailrunner | Runner (Coach: Mike Trailblazer)
runner7@ultracoach.dev | Avery Pacesetter | Runner (Coach: Mike Trailblazer)
runner8@ultracoach.dev | Phoenix Ultramarathoner | Runner (Coach: Mike Trailblazer)
runner9@ultracoach.dev | Sage Mountaineer | Runner (Coach: Mike Trailblazer)
runner10@ultracoach.dev | River Flowstate | Runner (Coach: Mike Trailblazer)

## Sample Training Plans Created
- Alex: First 50K Training
- Jordan: 50 Mile Goal
- Taylor: Marathon Base Building  
- Casey: Hill Training Specialist
- Morgan: 100K Preparation
- Riley: Trail Running Fundamentals
- Avery: Speed Development
- Phoenix: 100 Mile Quest
- Sage: Multi-stage Racing
- River: Recovery & Comeback

## Usage Notes
1. All users have the same password: password123
2. Each coach has 5 assigned runners
3. Training plans are pre-created for each coach-runner pair
4. Sample workouts are created for 2 training plans
5. All data is for development/testing only

## Login Testing
You can test different user roles and coach-runner relationships:
- Login as a coach to see their assigned runners
- Login as a runner to see their training plan
- Test chat functionality between coaches and runners
- Test notification system with workout updates

## Security Note
This file contains test credentials and should never be committed to version control.
The .gitignore file should exclude credentials/ directory.

Generated: $(date)
EOF

# Create symlink to latest credentials
ln -sf "test_users_${TIMESTAMP}.txt" "credentials/latest.txt"

echo "✅ Test credentials generated!"
echo ""
echo "📁 File: $CREDS_FILE"
echo "🔗 Latest: credentials/latest.txt"
echo ""
echo "👥 Created accounts:"
echo "   • 2 coaches (coach1@ultracoach.dev, coach2@ultracoach.dev)"
echo "   • 10 runners (runner1-10@ultracoach.dev)"
echo "   • 10 training plans (5 per coach)"
echo "   • Sample workouts for 2 plans"
echo ""
echo "🔑 Password for all accounts: password123"
echo ""
echo "⚠️  This file is excluded from git via .gitignore"
echo "   Share manually with team members as needed."