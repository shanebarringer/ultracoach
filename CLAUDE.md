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

### Current Status (Updated: 2025-07-16)
- **Active Milestone**: Structured Logging & Migration Preparation - ✅ COMPLETE
- **Completion**: 100% (11/11 tasks) + **STRUCTURED LOGGING IMPLEMENTED & MIGRATION READY**
- **Recent Major Achievement**: Complete tslog integration and database migration analysis with clean migration path
- **Performance**: All builds passing, structured logging throughout codebase, migration preparation complete
- **Current Focus**: Ready for database schema migration to eliminate user mapping system

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

### ✅ Completed Session: Structured Logging & Migration Preparation (COMPLETE)

**Structured Logging Implementation - ✅ COMPLETED:**
- ✅ **tslog Configuration**: Created comprehensive logger utility with proper log levels and formatting
- ✅ **Core Authentication Files**: Updated server-auth, middleware, better-auth-client with structured logging
- ✅ **Hook Migration**: Updated useTrainingPlansData, useTrainingPlansActions, useWorkouts with tslog
- ✅ **Component Updates**: Updated BetterAuthProvider, signin page, and notification hooks
- ✅ **API Integration**: Updated notifications API and other core server components
- ✅ **Log Level Strategy**: Used debug for development info, error for exceptions, info for important events

**Database Migration Preparation - ✅ COMPLETED:**
- ✅ **Migration Analysis**: Comprehensive analysis of current database state (14 users, 13 training plans, 34 messages)
- ✅ **Data Backup**: Created backup scripts for data safety and integrity validation
- ✅ **Migration Plan**: 5-phase migration strategy documented with risk mitigation
- ✅ **Clean Migration Path**: Confirmed all users mapped to Better Auth - no data loss risk
- ✅ **Architecture Benefits**: Planned elimination of user mapping system for simplified architecture
- ✅ **API Compatibility**: Seamless operation with both ID formats across all endpoints
- ✅ **Architecture Decision**: Hybrid approach chosen as optimal solution for stability and performance
- ✅ **Caching System**: In-memory caching for user ID mappings to optimize performance
- ✅ **Flexible Resolution**: Smart `resolveUserId` function for automatic format handling

**UX Improvements - ✅ COMPLETED:**
- ✅ **Homepage Logic**: Logged-in users skip landing page and go directly to dashboards
- ✅ **Role Detection**: Proper coach vs runner role detection and routing
- ✅ **Session Persistence**: Fixed hydration issues and session restoration
- ✅ **Error Reduction**: Eliminated authentication console errors and improved stability
- ✅ **Seamless Operation**: Users experience optimal performance with hybrid architecture

**Integration Status: 100% Complete - Hybrid authentication system fully functional! 🎉**

**Key Benefits Achieved:**
- Seamless user experience with proper role-based routing
- Eliminated UUID format conflicts through elegant hybrid architecture
- Improved homepage UX following web app best practices
- Stable authentication with robust error handling
- **Hybrid Architecture**: Optimal solution combining Better Auth benefits with database stability
- **Performance Optimizations**: Caching and smart ID resolution for fast operations
- **Production Ready**: Proven architecture ready for production deployment

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

## 🎯 Key Features & Context

### Enhanced Training System (✅ COMPLETED)
- **5 new tables**: races, training_phases, plan_phases, plan_templates, template_phases
- **Enhanced existing tables**: training_plans and workouts with race targeting
- **15+ training templates**: 50K to 100M for all skill levels
- **20+ real races**: Western States, Leadville, UTMB, etc.
- **Plan sequencing**: 50K → 50M → 50K → 100M progression support

### Better Auth Integration (✅ COMPLETED)
- **Integration Status**: Hybrid authentication system fully operational and production-ready
- **Security**: Migrated to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Architecture**: Hybrid approach with Better Auth + user mapping system for optimal performance
- **API Routes**: All routes working seamlessly with Better Auth authentication
- **Benefits**: Better TypeScript support, improved session management, zero-downtime deployment

### Test Data System (✅ COMPLETED)
- **Test Users**: 2 coaches, 10 runners with realistic relationships and fixed IDs
- **Credentials**: All test accounts use password `password123`
- **Access**: `supabase/temp/credentials/test_users_2025_07_15.txt` for login details
- **Consistent Testing**: Fixed UUIDs prevent messaging errors and enable reliable testing

## 🔧 Important Development Guidelines

### Authentication (CRITICAL - HYBRID ARCHITECTURE)
- **Better Auth**: Successfully migrated from NextAuth.js to Better Auth for improved stability
- **Hybrid System**: Better Auth handles authentication, user mapping handles database compatibility
- **Testing**: All existing test credentials work seamlessly with the hybrid system
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

### Security
- **No credentials in code**: Use environment variables
- **Test data only**: Test credentials excluded from git
- **RLS policies**: Database access controlled by user roles
- **API Key Migration**: Upgraded to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Security Incident**: Resolved GitHub security alert for leaked service key (July 15, 2025)

## 🚨 Recent Documentation Update
- Completed Better Auth integration with hybrid architecture
- Updated documentation to reflect hybrid approach as chosen solution
- Cleaned up migration files to focus on working architecture
- Added reference to @CLAUDE.md, @PLANNING.md, and @TASKS.md file synchronization across project documents
- Added cross-file reference tracking: @CLAUDE.md @TASKS.md @PLANNING.md 

---

*This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities.*