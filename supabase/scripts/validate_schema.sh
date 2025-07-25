#!/bin/bash

# Database Schema Validation Script
# Validates database schema integrity, constraints, and RLS policies
# Usage: ./validate_schema.sh [--fix] [--verbose]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_env.sh"

# Configuration
VERBOSE=false
AUTO_FIX=false
LOG_FILE="$SCRIPT_DIR/../logs/schema_validation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            AUTO_FIX=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Database Schema Validation Script"
            echo "Usage: $0 [--fix] [--verbose]"
            echo ""
            echo "Options:"
            echo "  --fix      Attempt to fix found issues automatically"
            echo "  --verbose  Show detailed output"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log() {
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "${timestamp} ${message}" >> "$LOG_FILE"
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${message}"
    fi
}

info() { 
    echo -e "${BLUE}[INFO]${NC} $*"
    log "[INFO] $*"
}

warn() { 
    echo -e "${YELLOW}[WARN]${NC} $*"
    log "[WARN] $*"
}

error() { 
    echo -e "${RED}[ERROR]${NC} $*"
    log "[ERROR] $*"
}

success() { 
    echo -e "${GREEN}[SUCCESS]${NC} $*"
    log "[SUCCESS] $*"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
FIXED_ISSUES=0

# Execute SQL query and return result
query() {
    local sql="$1"
    supabase db query -c "$sql" --linked 2>/dev/null || {
        error "Query failed: $sql"
        return 1
    }
}

# Check if table exists
check_table_exists() {
    local table_name="$1"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '$table_name'
    );" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        success "Table exists: $table_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "Table missing: $table_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check if column exists in table
check_column_exists() {
    local table_name="$1"
    local column_name="$2"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '$table_name' 
        AND column_name = '$column_name'
    );" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        log "Column exists: $table_name.$column_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "Column missing: $table_name.$column_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check foreign key constraint
check_foreign_key() {
    local constraint_name="$1"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND constraint_name = '$constraint_name'
    );" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        log "Foreign key exists: $constraint_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "Foreign key missing: $constraint_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check if RLS is enabled on table
check_rls_enabled() {
    local table_name="$1"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT row_security 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = '$table_name';" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        log "RLS enabled: $table_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        warn "RLS not enabled: $table_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        
        if [[ "$AUTO_FIX" == true ]]; then
            if query "ALTER TABLE \"$table_name\" ENABLE ROW LEVEL SECURITY;"; then
                success "Fixed: Enabled RLS on $table_name"
                FIXED_ISSUES=$((FIXED_ISSUES + 1))
                return 0
            fi
        fi
        return 1
    fi
}

# Check if RLS policy exists
check_rls_policy() {
    local table_name="$1"
    local policy_name="$2"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = '$table_name' 
        AND policyname = '$policy_name'
    );" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        log "RLS policy exists: $table_name.$policy_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "RLS policy missing: $table_name.$policy_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check index exists
check_index_exists() {
    local index_name="$1"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = '$index_name'
    );" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "t" ]]; then
        log "Index exists: $index_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        warn "Index missing: $index_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check data integrity
check_data_integrity() {
    local table_name="$1"
    local description="$2"
    local check_sql="$3"
    local result
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    result=$(query "$check_sql" | tail -n1 | tr -d ' ')
    
    if [[ "$result" == "0" ]]; then
        log "Data integrity OK: $table_name - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "Data integrity issue: $table_name - $description ($result records affected)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Main validation function
validate_schema() {
    info "Starting database schema validation..."
    
    # Core table existence checks
    info "Checking core tables..."
    check_table_exists "better_auth_users"
    check_table_exists "better_auth_sessions"
    check_table_exists "better_auth_accounts"
    check_table_exists "training_plans"
    check_table_exists "workouts"
    check_table_exists "conversations"
    check_table_exists "messages"
    check_table_exists "notifications"
    
    # Enhanced training system tables
    info "Checking enhanced training system tables..."
    check_table_exists "races"
    check_table_exists "training_phases"
    check_table_exists "plan_templates"
    check_table_exists "template_phases"
    
    # Critical column checks
    info "Checking critical columns..."
    check_column_exists "better_auth_users" "role"
    check_column_exists "better_auth_users" "full_name"
    check_column_exists "training_plans" "coach_id"
    check_column_exists "training_plans" "runner_id"
    check_column_exists "workouts" "user_id"
    check_column_exists "workouts" "training_plan_id"
    check_column_exists "messages" "workout_id"
    
    # Foreign key constraint checks
    info "Checking foreign key constraints..."
    check_foreign_key "training_plans_coach_id_better_auth_users_id_fk"
    check_foreign_key "training_plans_runner_id_better_auth_users_id_fk"
    check_foreign_key "workouts_training_plan_id_training_plans_id_fk"
    check_foreign_key "workouts_user_id_better_auth_users_id_fk"
    check_foreign_key "messages_sender_id_better_auth_users_id_fk"
    check_foreign_key "messages_recipient_id_better_auth_users_id_fk"
    
    # RLS checks
    info "Checking Row Level Security..."
    check_rls_enabled "better_auth_users"
    check_rls_enabled "training_plans"
    check_rls_enabled "workouts"
    check_rls_enabled "conversations"
    check_rls_enabled "messages"
    check_rls_enabled "notifications"
    
    # RLS policy checks
    info "Checking RLS policies..."
    check_rls_policy "better_auth_users" "Users can view own profile"
    check_rls_policy "training_plans" "Coaches can view their plans"
    check_rls_policy "training_plans" "Runners can view their plans"
    check_rls_policy "workouts" "Users can view their workouts"
    check_rls_policy "messages" "Users can view their messages"
    check_rls_policy "notifications" "Users can view their notifications"
    
    # Performance index checks
    info "Checking performance indexes..."
    check_index_exists "idx_training_plans_coach_id"
    check_index_exists "idx_training_plans_runner_id"
    check_index_exists "idx_workouts_training_plan_id"
    check_index_exists "idx_workouts_user_id"
    check_index_exists "idx_workouts_date"
    check_index_exists "idx_messages_conversation_id"
    check_index_exists "idx_notifications_user_id"
    
    # Data integrity checks
    info "Checking data integrity..."
    check_data_integrity "training_plans" "orphaned coach references" \
        "SELECT COUNT(*) FROM training_plans tp 
         LEFT JOIN better_auth_users u ON tp.coach_id = u.id 
         WHERE u.id IS NULL"
    
    check_data_integrity "training_plans" "orphaned runner references" \
        "SELECT COUNT(*) FROM training_plans tp 
         LEFT JOIN better_auth_users u ON tp.runner_id = u.id 
         WHERE u.id IS NULL"
    
    check_data_integrity "workouts" "orphaned training plan references" \
        "SELECT COUNT(*) FROM workouts w 
         LEFT JOIN training_plans tp ON w.training_plan_id = tp.id 
         WHERE tp.id IS NULL"
    
    check_data_integrity "workouts" "orphaned user references" \
        "SELECT COUNT(*) FROM workouts w 
         LEFT JOIN better_auth_users u ON w.user_id = u.id 
         WHERE u.id IS NULL"
    
    check_data_integrity "messages" "orphaned sender references" \
        "SELECT COUNT(*) FROM messages m 
         LEFT JOIN better_auth_users u ON m.sender_id = u.id 
         WHERE u.id IS NULL"
    
    # Schema version check (if migration tracking exists)
    if query "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_history');" | tail -n1 | tr -d ' ' | grep -q "t"; then
        info "Checking migration history..."
        local last_migration
        last_migration=$(query "SELECT migration_name FROM migration_history WHERE direction = 'up' ORDER BY applied_at DESC LIMIT 1;" | tail -n1 | tr -d ' ')
        if [[ -n "$last_migration" ]]; then
            success "Last applied migration: $last_migration"
        else
            warn "No migrations found in history"
        fi
    else
        warn "Migration tracking table not found - run './migrate.sh init' to create it"
    fi
}

# Generate schema report
generate_report() {
    info "Generating schema validation report..."
    
    local report_file="$SCRIPT_DIR/../logs/schema_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "UltraCoach Database Schema Validation Report"
        echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="
        echo ""
        echo "Summary:"
        echo "  Total Checks: $TOTAL_CHECKS"
        echo "  Passed: $PASSED_CHECKS"
        echo "  Failed: $FAILED_CHECKS"
        echo "  Fixed: $FIXED_ISSUES"
        echo ""
        echo "Success Rate: $(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))%"
        echo ""
        
        if [[ $FAILED_CHECKS -gt 0 ]]; then
            echo "Issues Found:"
            echo "============="
            grep "\[ERROR\]" "$LOG_FILE" | tail -n 20
            echo ""
        fi
        
        if [[ $FIXED_ISSUES -gt 0 ]]; then
            echo "Issues Fixed:"
            echo "============="
            grep "Fixed:" "$LOG_FILE"
            echo ""
        fi
        
        echo "Detailed Log: $LOG_FILE"
        
    } > "$report_file"
    
    success "Report saved: $report_file"
    
    # Display summary
    echo ""
    info "Validation Summary:"
    echo "  Total Checks: $TOTAL_CHECKS"
    echo "  Passed: $PASSED_CHECKS"
    echo "  Failed: $FAILED_CHECKS"
    if [[ $AUTO_FIX == true ]]; then
        echo "  Fixed: $FIXED_ISSUES"
    fi
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        success "All schema validations passed!"
        return 0
    else
        error "Schema validation failed with $FAILED_CHECKS issues"
        if [[ $AUTO_FIX == false ]]; then
            info "Run with --fix to attempt automatic repairs"
        fi
        return 1
    fi
}

# Main execution
main() {
    info "Database Schema Validation Tool"
    echo "==============================="
    
    if [[ $AUTO_FIX == true ]]; then
        warn "Auto-fix mode enabled - will attempt to repair issues"
    fi
    
    if [[ $VERBOSE == true ]]; then
        info "Verbose mode enabled"
    fi
    
    echo ""
    
    # Run validation
    validate_schema
    
    # Generate report
    generate_report
}

# Execute main function
main