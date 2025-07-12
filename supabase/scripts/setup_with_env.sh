#!/bin/bash
set -e

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    echo "📄 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  .env.local file not found"
fi

# Run the main setup script
echo ""
echo "🚀 Running enhanced training setup..."
./supabase/scripts/setup_enhanced_training.sh