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
            if [[ "$value" =~ ^\"(.*)\"$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
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
    if [ -n "$DATABASE_PASSWORD" ]; then
        DATABASE_URL="postgresql://postgres.ccnbzjpccmlribljugve:${DATABASE_PASSWORD}@3.139.14.59:5432/postgres"
        export DATABASE_URL
        echo "✅ Built DATABASE_URL from environment variables"
    else
        echo "⚠️  DATABASE_URL not set. You can:"
        echo "   1. Set DATABASE_PASSWORD in your .env.local file"
        echo "   2. Set DATABASE_URL directly in .env.local"
        echo "   3. Use: supabase link --project-ref your-project-ref"
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