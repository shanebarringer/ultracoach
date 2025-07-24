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

### Current Status (Updated: 2025-07-24)
- **Active Milestone**: Atom Optimization & Performance Tuning (Milestone 10) 🔄
- **Completion**: 95% (206/222 tasks) + **PR Feedback Remediation Complete!**
- **Recent Major Achievement**: All critical PR feedback addressed - data refresh patterns, logging consistency, type safety
- **Performance**: Zero warnings, proper atomic state invalidation, structured logging throughout
- **Current Focus**: Suspense modernization, form optimization, performance memoization

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

### ✅ Completed Session: Modern React Patterns & State Optimization (COMPLETE)

**Milestone 9: Modern React Patterns - ✅ COMPLETED:**
- ✅ **React 19 Integration**: Suspense boundaries, useTransition, optimistic updates implemented
- ✅ **useState Elimination**: Converted modal forms and chat components to Jotai atomic state
- ✅ **Error Boundaries**: Production-ready ModernErrorBoundary with retry logic and development debugging
- ✅ **Async Patterns**: Created useAsyncWorkouts and useOptimisticUpdates hooks with React 19 features
- ✅ **Component Modernization**: Built OptimisticWorkoutCard demonstrating concurrent React patterns
- ✅ **State Architecture**: Enhanced form atoms with loading/error states and chat UI state management

**Technical Achievements - ✅ COMPLETED:**
- ✅ **React 19 Patterns**: Full implementation of modern React with Suspense and concurrent features
- ✅ **Atomic State Management**: Complete elimination of useState in favor of Jotai atoms
- ✅ **Error Recovery**: Production-ready error handling with exponential backoff and user-friendly fallbacks
- ✅ **Performance Optimization**: Enhanced rendering performance through proper atomic state subscriptions

**Modern React Status: 100% Complete - React 19 Ready! 🎉**

### 🔄 Active Session: Atom Optimization & Performance Tuning (ACTIVE)

**Milestone 10: Atom Optimization - 🔄 IN PROGRESS:**
- ✅ **useState Elimination**: Convert 8 identified components to Jotai atomic state management
- ✅ **Error Boundary Protection**: Add ModernErrorBoundary to 6 page components for robust error handling
- ✅ **PR Feedback Remediation**: Address all critical code review items with production-ready solutions
- 📋 **Suspense Modernization**: Update 4 components to use Suspense boundaries instead of manual loading
- 📋 **Form Optimization**: Integrate react-hook-form with 5 forms for enhanced validation and performance
- 📋 **Performance Memoization**: Apply React.memo and optimization patterns to 7 components

**✅ PR Feedback Completed:**
- **Data Refresh Pattern**: Eliminated `window.location.reload()` with proper Jotai atom invalidation
- **Logging Consistency**: Replaced all `console.error` with structured `tslog` logging
- **Authorization Headers**: Added future-ready auth header patterns to async atoms
- **Type Safety**: Formalized `OptimisticWorkout`, `OptimisticMessage`, `ExtendedTrainingPlan` interfaces

**Current Focus**: Suspense boundary modernization and form optimization with react-hook-form integration

**Key Benefits Achieved:**
- **React 19 Integration**: Modern concurrent features with Suspense boundaries and optimistic updates
- **Atomic State Management**: Consistent Jotai atoms throughout application for predictable state
- **Error Resilience**: Robust error boundaries with retry logic and graceful degradation
- **Performance**: Optimized re-renders and enhanced user experience with modern React patterns
- **Type Safety**: Full TypeScript coverage with modern component patterns and proper type definitions

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

### Modern React Patterns & State Optimization (✅ COMPLETED)
- **React 19 Integration**: Full implementation of modern React patterns with Suspense boundaries and concurrent features
- **State Management**: Complete elimination of useState in favor of Jotai atomic state management
- **Optimistic Updates**: Real-time UI feedback with useOptimisticUpdates hook and useTransition integration
- **Error Boundaries**: Production-ready error handling with retry logic, exponential backoff, and development debugging
- **Async Data Loading**: Seamless data fetching with async atoms and automatic Suspense integration
- **Type Safety**: Full TypeScript coverage with proper component type definitions and modern patterns

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