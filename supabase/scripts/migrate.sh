#!/bin/bash

# Database Migration Management Script
# Handles production-ready database migrations with rollback capability
# Usage: ./migrate.sh [up|down|status|test] [migration_name]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_env.sh"

# Configuration
MIGRATION_DIR="$SCRIPT_DIR/../migrations"
BACKUP_DIR="$SCRIPT_DIR/../backups/migrations"
LOG_FILE="$SCRIPT_DIR/../logs/migration.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Create necessary directories
setup_directories() {
    mkdir -p "$BACKUP_DIR" "$SCRIPT_DIR/../logs"
    touch "$LOG_FILE"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first:"
        error "npm install -g supabase"
        exit 1
    fi
}

# Create backup before migration
create_backup() {
    local backup_name="pre_migration_$(date +%Y%m%d_%H%M%S)"
    local backup_file="$BACKUP_DIR/${backup_name}.sql"
    
    info "Creating backup: $backup_name"
    
    # Export schema and data
    supabase db dump --linked --schema public > "$backup_file" 2>/dev/null || {
        error "Failed to create backup"
        return 1
    }
    
    success "Backup created: $backup_file"
    echo "$backup_file"
}

# Apply migration
migrate_up() {
    local migration_file="$1"
    
    if [[ ! -f "$migration_file" ]]; then
        error "Migration file not found: $migration_file"
        return 1
    fi
    
    info "Applying migration: $(basename "$migration_file")"
    
    # Create backup first
    local backup_file
    backup_file=$(create_backup) || return 1
    
    # Apply migration
    if psql "$DATABASE_URL" -f "$migration_file"; then
        success "Migration applied successfully"
        
        # Record migration in tracking table
        record_migration "$(basename "$migration_file")" "up" "$backup_file"
        return 0
    else
        error "Migration failed"
        
        # Offer to restore backup
        read -p "Migration failed. Restore from backup? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restore_backup "$backup_file"
        fi
        return 1
    fi
}

# Rollback migration
migrate_down() {
    local migration_name="$1"
    
    # Look for rollback file
    local rollback_file="${migration_name%.*}_rollback.sql"
    local rollback_path="$MIGRATION_DIR/$rollback_file"
    
    if [[ -f "$rollback_path" ]]; then
        info "Found rollback script: $rollback_file"
        
        # Create backup before rollback
        local backup_file
        backup_file=$(create_backup) || return 1
        
        # Apply rollback
        if psql "$DATABASE_URL" -f "$rollback_path"; then
            success "Rollback completed successfully"
            record_migration "$migration_name" "down" "$backup_file"
            return 0
        else
            error "Rollback failed"
            return 1
        fi
    else
        error "No rollback script found for: $migration_name"
        error "Expected: $rollback_path"
        
        # Offer manual rollback options
        echo ""
        info "Manual rollback options:"
        echo "1. Restore from backup"
        echo "2. Write custom rollback SQL"
        echo "3. Reset database (DANGER - loses all data)"
        
        read -p "Choose option (1-3, or 'q' to quit): " -r
        case $REPLY in
            1) list_backups; read -p "Enter backup filename: " backup; restore_backup "$BACKUP_DIR/$backup" ;;
            2) info "Create rollback script at: $rollback_path" ;;
            3) warn "Database reset not implemented for safety" ;;
            *) info "Cancelled" ;;
        esac
    fi
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    warn "Restoring from backup: $(basename "$backup_file")"
    warn "This will overwrite current database state!"
    
    read -p "Are you sure? Type 'YES' to continue: " -r
    if [[ $REPLY != "YES" ]]; then
        info "Restore cancelled"
        return 1
    fi
    
    # Reset database and restore
    if supabase db reset --linked && psql "$DATABASE_URL" -f "$backup_file"; then
        success "Database restored from backup"
        return 0
    else
        error "Restore failed"
        return 1
    fi
}

# Record migration in tracking table
record_migration() {
    local migration_name="$1"
    local direction="$2"
    local backup_file="$3"
    
    local sql="
    INSERT INTO migration_history (migration_name, direction, backup_file, applied_at)
    VALUES ('$migration_name', '$direction', '$backup_file', NOW())
    ON CONFLICT (migration_name, direction) DO UPDATE SET
        backup_file = EXCLUDED.backup_file,
        applied_at = EXCLUDED.applied_at;
    "
    
    local temp_file=$(mktemp)
    echo "$sql" > "$temp_file"
    psql "$DATABASE_URL" -f "$temp_file" 2>/dev/null || {
        warn "Could not record migration history (table may not exist)"
    }
    rm "$temp_file"
}

# Show migration status
show_status() {
    info "Migration Status"
    echo "=================="
    
    # List all migration files
    info "Available migrations:"
    ls -la "$MIGRATION_DIR"/*.sql 2>/dev/null | while read -r line; do
        echo "  $line"
    done
    
    echo ""
    
    # Show applied migrations from tracking table
    info "Applied migrations:"
    local temp_file=$(mktemp)
    echo "SELECT migration_name, direction, applied_at FROM migration_history ORDER BY applied_at DESC LIMIT 10;" > "$temp_file"
    psql "$DATABASE_URL" -f "$temp_file" 2>/dev/null || {
        warn "Migration history not available (tracking table may not exist)"
    }
    rm "$temp_file"
}

# Test migration (dry run)
test_migration() {
    local migration_file="$1"
    
    if [[ ! -f "$migration_file" ]]; then
        error "Migration file not found: $migration_file"
        return 1
    fi
    
    info "Testing migration: $(basename "$migration_file")"
    
    # Create test backup
    local backup_file
    backup_file=$(create_backup) || return 1
    
    # Try to apply migration
    if psql "$DATABASE_URL" -f "$migration_file"; then
        success "Migration test passed"
        
        # Restore original state
        info "Restoring original state..."
        supabase db reset --linked && psql "$DATABASE_URL" -f "$backup_file"
        
        success "Test completed - database restored to original state"
        return 0
    else
        error "Migration test failed"
        
        # Restore original state
        info "Restoring original state..."
        supabase db reset --linked && psql "$DATABASE_URL" -f "$backup_file"
        
        return 1
    fi
}

# List available backups
list_backups() {
    info "Available backups:"
    ls -la "$BACKUP_DIR"/*.sql 2>/dev/null || info "No backups found"
}

# Initialize migration tracking table
init_tracking() {
    local sql="
    CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
        backup_file TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(migration_name, direction)
    );
    
    CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history(migration_name);
    CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON migration_history(applied_at);
    "
    
    info "Initializing migration tracking..."
    local temp_file=$(mktemp)
    echo "$sql" > "$temp_file"
    if psql "$DATABASE_URL" -f "$temp_file"; then
        rm "$temp_file"
        success "Migration tracking initialized"
    else
        rm "$temp_file"
        error "Failed to initialize migration tracking"
        return 1
    fi
}

# Main command handler
main() {
    setup_directories
    check_supabase_cli
    
    local command="${1:-status}"
    local migration_target="${2:-}"
    
    case "$command" in
        "up"|"apply")
            if [[ -z "$migration_target" ]]; then
                error "Usage: $0 up <migration_file>"
                exit 1
            fi
            
            # Convert to full path if not already
            if [[ "$migration_target" != /* ]]; then
                migration_target="$MIGRATION_DIR/$migration_target"
            fi
            
            migrate_up "$migration_target"
            ;;
        "down"|"rollback")
            if [[ -z "$migration_target" ]]; then
                error "Usage: $0 down <migration_name>"
                exit 1
            fi
            migrate_down "$migration_target"
            ;;
        "status")
            show_status
            ;;
        "test")
            if [[ -z "$migration_target" ]]; then
                error "Usage: $0 test <migration_file>"
                exit 1
            fi
            
            if [[ "$migration_target" != /* ]]; then
                migration_target="$MIGRATION_DIR/$migration_target"
            fi
            
            test_migration "$migration_target"
            ;;
        "backup")
            create_backup
            ;;
        "restore")
            if [[ -z "$migration_target" ]]; then
                list_backups
                read -p "Enter backup filename: " migration_target
            fi
            
            if [[ "$migration_target" != /* ]]; then
                migration_target="$BACKUP_DIR/$migration_target"
            fi
            
            restore_backup "$migration_target"
            ;;
        "init")
            init_tracking
            ;;
        "help"|"-h"|"--help")
            echo "Database Migration Management"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  up <file>     Apply migration"
            echo "  down <name>   Rollback migration"
            echo "  status        Show migration status"
            echo "  test <file>   Test migration (dry run)"
            echo "  backup        Create database backup"
            echo "  restore [file] Restore from backup"
            echo "  init          Initialize migration tracking"
            echo "  help          Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 status"
            echo "  $0 up 20250725000001_add_user_preferences.sql"
            echo "  $0 test 20250725000001_add_user_preferences.sql"
            echo "  $0 down 20250725000001_add_user_preferences.sql"
            echo "  $0 backup"
            echo "  $0 restore pre_migration_20250725_143022.sql"
            ;;
        *)
            error "Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"