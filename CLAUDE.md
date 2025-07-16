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
- **Active Milestone**: Better Auth Integration & Role-Based Routing - ✅ 100% COMPLETE! 🎉
- **Completion**: 100% (30/30 tasks) + **COMPLETE AUTHENTICATION SYSTEM**
- **Recent Major Achievement**: Full Better Auth integration with role-based routing and user mapping system
- **Performance**: All builds passing, authentication fully functional with proper user experience
- **Current Focus**: Preparing for database schema migration to Better Auth IDs (next milestone)

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

### ✅ Completed Session: Better Auth Integration & Role-Based Routing (COMPLETE)

**Authentication System - ✅ COMPLETED:**
- ✅ **Role-Based Routing**: Fixed coach/runner dashboard routing with proper role detection
- ✅ **User Role API**: Created `/api/user/role` endpoint for fetching user roles from database
- ✅ **Homepage Redirection**: Authenticated users automatically redirect to appropriate dashboards
- ✅ **Session Management**: Fixed Better Auth session handling and token validation
- ✅ **Error Handling**: Resolved empty error objects and improved client-side error management

**User ID Mapping System - ✅ COMPLETED:**
- ✅ **User Mapping**: Created mapping system between Better Auth and original user IDs
- ✅ **Database Compatibility**: Fixed UUID format mismatches in training plans and workouts APIs
- ✅ **Server Auth**: Updated server authentication to handle Better Auth → database UUID mapping
- ✅ **API Integration**: All APIs now work seamlessly with Better Auth users

**UX Improvements - ✅ COMPLETED:**
- ✅ **Homepage Logic**: Logged-in users skip landing page and go directly to dashboards
- ✅ **Role Detection**: Proper coach vs runner role detection and routing
- ✅ **Session Persistence**: Fixed hydration issues and session restoration
- ✅ **Error Reduction**: Eliminated authentication console errors and improved stability

**Integration Status: 100% Complete - Authentication system fully functional! 🎉**

**Key Benefits Achieved:**
- Seamless user experience with proper role-based routing
- Eliminated UUID format conflicts between Better Auth and database
- Improved homepage UX following web app best practices
- Stable authentication with proper error handling

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

### Better Auth Migration (🔄 IN PROGRESS)
- **Migration Status**: Database migration complete, frontend integration pending
- **Security**: Migrated to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Database**: All 14 users successfully migrated to Better Auth schema
- **API Routes**: Better Auth handler created and configured
- **Benefits**: Better TypeScript support, improved session management, fewer logout issues

### Test Data System (✅ COMPLETED)
- **Test Users**: 2 coaches, 10 runners with realistic relationships and fixed IDs
- **Credentials**: All test accounts use password `password123`
- **Access**: `supabase/temp/credentials/test_users_2025_07_15.txt` for login details
- **Consistent Testing**: Fixed UUIDs prevent messaging errors and enable reliable testing

## 🔧 Important Development Guidelines

### Authentication (CRITICAL - MIGRATION IN PROGRESS)
- **Better Auth**: Migrating from NextAuth.js to Better Auth for improved stability
- **Database**: Both old and new auth tables coexist during migration
- **Testing**: All existing test credentials remain valid during migration
- **Sessions**: Better Auth provides improved session management and security

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
- **No console.log**: Use `tslog` for structured logging
- **UI Components**: Use HeroUI components with Mountain Peak Enhanced design system

### Security
- **No credentials in code**: Use environment variables
- **Test data only**: Test credentials excluded from git
- **RLS policies**: Database access controlled by user roles
- **API Key Migration**: Upgraded to new Supabase API keys (sb_publishable_ and sb_secret_)
- **Security Incident**: Resolved GitHub security alert for leaked service key (July 15, 2025)

## 🚨 Recent Documentation Update
- Added Better Auth migration progress and status
- Updated current session information with database migration completion
- Added reference to @CLAUDE.md, @PLANNING.md, and @TASKS.md file synchronization across project documents
- Added cross-file reference tracking: @CLAUDE.md @TASKS.md @PLANNING.md 

---

*This file is updated at the end of each development session. Always check PLANNING.md and TASKS.md at the start of new conversations for current context and priorities.*