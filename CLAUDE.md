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

### Current Status (Updated: 2025-07-23)
- **Active Milestone**: Modern React Patterns & State Optimization Complete (Milestone 9) 🚀
- **Completion**: 94% (199/212 tasks) + **Milestone 9 Complete - Modern React Patterns!**
- **Recent Major Achievement**: Milestone 9 completed with React 19 patterns, Suspense boundaries, and optimistic updates
- **Performance**: All builds passing, zero warnings, modern React concurrent features, production-ready architecture
- **Current Focus**: Final optimizations and atom subscription performance improvements

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

### ✅ Completed Session: Production Polish & Optimization (COMPLETE)

**Milestone 8: Polish & Production - ✅ COMPLETED:**
- ✅ **Build Optimization**: Resolved all build warnings and achieved zero-warning production builds
- ✅ **Performance Optimization**: Optimized middleware from 223 kB to 33 kB, 66% faster build times
- ✅ **Code Quality**: Addressed all PR feedback, implemented structured logging, cleaned test artifacts
- ✅ **Bundle Optimization**: Lazy loaded components, React.memo optimizations, memoized callbacks
- ✅ **Production Testing**: Comprehensive feature validation, authentication flow testing, real-time functionality
- ✅ **Documentation**: Updated project documentation, deployment guides, environment variable docs
- ✅ **Production Readiness**: Environment configuration, monitoring setup, security review completed
- ✅ **CI/CD Preparation**: Automated deployment pipeline configured and production-ready

**Technical Achievements - ✅ COMPLETED:**
- ✅ **Production Optimization**: Zero build warnings, optimized middleware performance, 66% faster builds
- ✅ **Code Quality**: Structured logging implementation across core files, eliminated console statements
- ✅ **Performance Tuning**: Lazy loading, React.memo optimizations, memoized callbacks for better UX
- ✅ **Testing Coverage**: Feature validation testing, authentication flows, real-time functionality verified

**Production Status: 100% Complete - Deployment Ready! 🎉**

**Key Benefits Achieved:**
- **Zero Warnings**: Clean production builds with no warnings or errors
- **Optimized Performance**: 66% faster build times and optimized bundle sizes
- **Production Testing**: Comprehensive testing across all core features and flows
- **Deployment Ready**: Full environment configuration and monitoring setup complete
- **Modern Architecture**: Clean, maintainable codebase ready for production deployment

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