#!/bin/bash

# Robust environment variable loader for UltraCoach database scripts
# This script properly handles special characters in environment variables

# Get the directory where this script is located
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
    PROJECT_ROOT="$(dirname "$SUPABASE_DIR")"
else
    # If sourced from elsewhere, try to find the project root
    PROJECT_ROOT="$(pwd)"
    # Look for .env.local in current directory or parent directories
    while [ "$PROJECT_ROOT" != "/" ] && [ ! -f "$PROJECT_ROOT/.env.local" ]; do
        PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
    done
fi

# Load environment variables from .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "📄 Loading environment variables from .env.local..."
    
    # Use a more robust approach to load environment variables
    # This handles special characters properly
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Extract key and value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            
            # Remove quotes if present
            if [[ "$value" =~ ^"(.*)"$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "$value" =~ ^'(.*)'$ ]]; then
                value="${BASH_REMATCH[1]}"
            fi
            
            # Export the variable
            export "$key"="$value"
        fi
    done < "$PROJECT_ROOT/.env.local"
else
    echo "⚠️  No .env.local file found at $PROJECT_ROOT/.env.local"
fi

# Check for required environment variables and build DATABASE_URL if needed
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    # Set default values for database connection components
    DB_HOST="${DB_HOST:-aws-0-us-east-2.pooler.supabase.com}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-postgres}"
    
    # Check if we have the minimum required information
    if [ -n "$DATABASE_PASSWORD" ] && [ -n "$DB_USER" ]; then
        # Build DATABASE_URL from components
        DATABASE_URL="postgresql://${DB_USER}:${DATABASE_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
        export DATABASE_URL
        echo "✅ Built DATABASE_URL from environment variables"
        echo "   Host: $DB_HOST:$DB_PORT"
        echo "   Database: $DB_NAME"
        echo "   User: $DB_USER"
    elif [ -n "$DATABASE_PASSWORD" ]; then
        # Legacy fallback - warn user about deprecated usage
        echo "⚠️  Using legacy database configuration. Please update your .env.local file:"
        echo "   Add: DB_USER=postgres.your-project-ref"
        echo "   Add: DB_HOST=aws-0-us-east-2.pooler.supabase.com"
        echo "   This fallback will be removed in a future version."
        
        # Use legacy default (will be removed in future)
        DB_USER="${DB_USER:-postgres.ccnbzjpccmlribljugve}"
        DATABASE_URL="postgresql://${DB_USER}:${DATABASE_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
        export DATABASE_URL
        echo "✅ Built DATABASE_URL from legacy configuration"
    else
        echo "❌ Database configuration incomplete. You need to set:"
        echo "   Option 1: Set DATABASE_URL directly in .env.local"
        echo "   Option 2: Set all required components:"
        echo "     - DATABASE_PASSWORD (required)"
        echo "     - DB_USER (required, e.g., postgres.your-project-ref)"
        echo "     - DB_HOST (optional, defaults to aws-0-us-east-2.pooler.supabase.com)"
        echo "     - DB_PORT (optional, defaults to 5432)"
        echo "     - DB_NAME (optional, defaults to postgres)"
        echo ""
        echo "   Example .env.local:"
        echo "     DATABASE_PASSWORD=your-password"
        echo "     DB_USER=postgres.your-project-ref"
        echo ""
        echo "   Or use: supabase link --project-ref your-project-ref"
        exit 1
    fi
fi

# Verify DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URL is properly loaded"
else
    echo "❌ DATABASE_URL is not set"
    exit 1
fi
