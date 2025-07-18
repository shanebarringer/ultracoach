# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

**At the start of EVERY new conversation:**
1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check TASKS.md** to see current milestone, pending tasks, and priorities  
3. **Review this file** for project-specific guidance and context
4. **Mark completed tasks** in TASKS.md immediately upon completion
5. **Add newly discovered tasks** to TASKS.md when found during development

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-07-17)
- **Active Milestone**: All Core Development Complete - Ready for Production Polish 🎉
- **Completion**: 100% (169/169 tasks) + **ALL MILESTONES COMPLETE**
- **Recent Major Achievement**: Complete database schema migration with legacy users table removal
- **Performance**: All builds passing, zero warnings, database modernized, user mapping system eliminated
- **Current Focus**: Production optimization, testing validation, and final polish before deployment

## 🏗️ Architecture & Technology

### Core Stack
- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v3 with HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: Better Auth (migrated from NextAuth.js for improved stability)
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management

### ✅ Completed Session: Database Schema Migration (COMPLETE)

**Database Schema Migration - ✅ COMPLETED:**
- ✅ **Comprehensive Backup**: Complete database backup with 14 users, 13 training plans, 34 messages
- ✅ **Schema Analysis**: Identified all foreign key dependencies and Better Auth mapping relationships
- ✅ **Migration Scripts**: Built transaction-safe migration with rollback capability and error handling
- ✅ **ID Consolidation**: Converted 67 data records across training_plans, workouts, messages, conversations, notifications
- ✅ **User Mapping Removal**: Eliminated hybrid ID system and runtime conversion complexity throughout codebase
- ✅ **API Updates**: Updated 11 references across 7 API files to use better_auth_users table directly
- ✅ **Build Verification**: Verified production build succeeds and TypeScript compilation passes
- ✅ **Legacy Cleanup**: Dropped legacy users table and updated schema definitions completely

**Technical Achievements - ✅ COMPLETED:**
- ✅ **Database Modernization**: Eliminated complex user ID mapping system in favor of direct Better Auth ID usage
- ✅ **Data Integrity**: Successfully migrated 67 records across 12 users with zero data loss
- ✅ **Architecture Simplification**: Removed runtime ID conversion overhead and hybrid table dependencies
- ✅ **Schema Consistency**: Database now uses single source of truth for user identification throughout

**Migration Status: 100% Complete - Database fully modernized with Better Auth IDs! 🎉**

**Key Benefits Achieved:**
- **Single Source of Truth**: Database uses Better Auth IDs directly throughout all tables
- **Eliminated Complexity**: No more runtime ID conversion or mapping system maintenance
- **Zero Data Loss**: Successful migration of all 67 data records with full integrity preservation
- **Production Ready**: All builds pass, TypeScript errors resolved, fully tested architecture
- **Simplified Maintenance**: Reduced codebase complexity and improved long-term maintainability

## 💻 Development Commands

### Essential Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production  
pnpm build

# Run linting
pnpm lint
```

### Database Operations
```bash
# Complete setup (first time)
./supabase/scripts/setup_enhanced_training.sh

# Seed test data
./supabase/scripts/seed_database.sh

# Backup before changes (ALWAYS run before schema changes)
./supabase/scripts/backup_user_data.sh

# Reset database (development only)
./supabase/scripts/reset_database.sh
```

### Supabase CLI Best Practices (2025)
```bash
# Run SQL queries directly (preferred for automation)
supabase db query "SELECT * FROM better_auth_users LIMIT 5;"

# Execute SQL files (for complex operations)
supabase db query --file ./supabase/migrations/001_setup.sql

# Database operations with explicit environment
supabase db reset --linked
supabase db push --linked

# Local development
supabase start
supabase db seed
```

## 🎯 Key Features & Context

### Enhanced Training System (✅ COMPLETED)
- **5 new tables**: races, training_phases, plan_phases, plan_templates, template_phases
- **Enhanced existing tables**: training_plans and workouts with race targeting
- **15+ training templates**: 50K to 100M for all skill levels
- **20+ real races**: Western States, Leadville, UTMB, etc.
- **Plan sequencing**: 50K → 50M → 50K → 100M progression support

### Better Auth Integration (✅ COMPLETED)
- **Integration Status**: Full Better Auth migration completed with database schema modernization
- **Security**: Migrated to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Architecture**: Direct Better Auth ID usage throughout database - no more user mapping system
- **API Routes**: All routes working seamlessly with Better Auth authentication
- **Benefits**: Better TypeScript support, improved session management, production-ready build

### Test Data System (✅ COMPLETED)
- **Test Users**: 2 coaches, 10 runners with realistic relationships and fixed IDs
- **Credentials**: All test accounts use password `password123`
- **Access**: `supabase/temp/credentials/test_users_2025_07_15.txt` for login details
- **Consistent Testing**: Fixed UUIDs prevent messaging errors and enable reliable testing

## 🔧 Important Development Guidelines

### Authentication (CRITICAL - PRODUCTION READY)
- **Better Auth**: Successfully migrated from NextAuth.js to Better Auth for improved stability
- **Direct ID Usage**: Database uses Better Auth IDs directly - no more user mapping system
- **Testing**: All existing test credentials work seamlessly with the modernized system
- **Sessions**: Better Auth provides superior session management and security

### State Management (CRITICAL)
- **NO React Context** for global state - use Jotai atoms only
- **NO useState** for shared state - use Jotai atoms
- **Pattern**: Create hooks that use Jotai atoms (see `useNotifications`, `useWorkouts`)
- **Derived State**: Use derived atoms for computed/filtered data
- **File**: All atoms live in `src/lib/atoms.ts`

### Code Quality
- **TypeScript**: Strict mode enabled, full type coverage required
- **ESLint**: Next.js config with additional rules
- **Imports**: Use `@/` path aliases for clean imports
- **Structured Logging**: Use tslog with `createLogger('context')` - no console.log statements
- **UI Components**: Use HeroUI components with Mountain Peak Enhanced design system

### Structured Logging (CRITICAL)
- **Logger Creation**: `const logger = createLogger('contextName')` in each file
- **Log Levels**: debug (development), info (important events), warn (warnings), error (exceptions)
- **No Console Statements**: All console.log/error replaced with structured logging
- **Context Names**: Use descriptive context names (e.g., 'useTrainingPlans', 'middleware', 'better-auth-client')

### Security (CRITICAL)
- **No credentials in code**: Use environment variables for ALL database connections
- **Environment Variables**: Required variables in .env.local (DATABASE_PASSWORD, DB_USER, etc.)
- **Secure Scripts**: All database scripts use `source load_env.sh` for secure environment loading
- **SQL Injection Protection**: Use parameterized queries and input validation in all database operations
- **Test data only**: Test credentials excluded from git
- **RLS policies**: Database access controlled by user roles
- **API Key Migration**: Upgraded to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Security Incident**: Resolved GitHub security alert for leaked service key (July 15, 2025)

### Database Script Security Guidelines
- **NEVER hardcode database URLs** - Use environment variables only
- **Use load_env.sh**: All scripts must `source "$SCRIPT_DIR/load_env.sh"`
- **Validate inputs**: Check table names match regex `^[a-zA-Z_][a-zA-Z0-9_]*$`
- **Use quoted identifiers**: Wrap table names in quotes for SQL queries
- **Parameterized queries**: Use `psql -c "query" param1 param2` format when possible
- **Prefer Supabase CLI**: Use `supabase db query` over direct `psql` for consistency and authentication

### MCP (Model Context Protocol) Guidelines
- **Context7 MCP**: Use for up-to-date documentation access (`use context7` in prompts)
- **GitHub MCP**: For repository operations and issue management
- **Security**: Only use trusted MCP servers, review configurations
- **Configuration**: Store in project `.mcp.json` for team consistency

## 🚨 Recent Documentation Update
- **Security Hardening**: Removed all hardcoded database connections, implemented secure environment loading
- **Playwright Testing**: Complete cross-browser testing infrastructure with comprehensive test coverage
- **Database Migration**: Completed full schema migration to Better Auth IDs with zero data loss
- **Production Ready**: Resolved all build warnings, optimized middleware performance, comprehensive security review
- **SQL Injection Protection**: Added input validation and parameterized queries to all database scripts
- **Environment Security**: Standardized secure environment variable loading across all scripts
- **Supabase CLI Integration**: Updated all scripts to use modern Supabase CLI commands for consistency
- **MCP Configuration**: Added Model Context Protocol guidelines for enhanced AI-driven development
- **Documentation**: Added comprehensive security guidelines and MCP setup to @PLANNING.md and @CLAUDE.md
- **Cross-file Sync**: @CLAUDE.md @TASKS.md @PLANNING.md synchronized for security, testing, and MCP updates
- **Zero Warnings**: Production build optimized, security vulnerabilities resolved, testing framework ready

---

*This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities.*