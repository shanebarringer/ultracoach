# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

**At the start of EVERY new conversation:**

1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check TASKS.md** to see current milestone, pending tasks, and priorities
3. **Review this file** for project-specific guidance and context
4. **Mark completed tasks** in TASKS.md immediately upon completion. After commits, move complete tasks to `COMPLETED_TASKS.md`
5. **Add newly discovered tasks** to TASKS.md when found during development

### MCP Instructions

- When fetching data from Context7 MCP - add to the `.context7-docs` directory (gitignored). Create a new directory for the library if one does not exist. Before fetching from Context7 refer to `.context7-docs` to see if data and/or snippets have already been added

## 🗄️ Database Connection (IMPORTANT)

**Always use the proper database scripts - NEVER try to connect directly as local user!**

### Correct Database Commands:

```bash
# Connect to database
pnpm db:connect

# Run a query
pnpm db:query "SELECT * FROM coach_runners LIMIT 5;"

# Drizzle operations
pnpm db:generate    # Generate migrations
pnpm db:push        # Push schema changes (uses --force)
pnpm db:migrate     # Apply migrations
pnpm db:studio      # Open Drizzle Studio

# Database seeding and setup
pnpm db:seed        # Seed database with test data
pnpm db:fresh       # Reset and seed database
```

### Database Philosophy:

- **Use Drizzle for ALL database operations** (migrations, queries, schema changes)
- Environment variables are properly loaded from `.env.local`
- Scripts handle Supabase connection string correctly
- NEVER use direct psql commands without proper environment loading

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, BetterAuth, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-08-05)

- **Active Milestone**: Production Database Update & Email Configuration 🔄 **IN PROGRESS**
- **Core Development**: 100% (222/222 tasks) ✅ **COMPLETE** - All performance optimizations and React patterns implemented
- **Coach-Runner Relationship System**: ✅ **COMPLETE** - Comprehensive bidirectional relationship system with API layer and UI components
- **Authentication System**: ✅ **RESTORED** - Better Auth login working properly, comprehensive seeding with proper password hashing
- **Chat/Messaging Integration**: ✅ **COMPLETE** - Full migration to Drizzle with relationship-based authorization for secure communication
- **Workout Management Integration**: ✅ **COMPLETE** - All workout APIs migrated to Drizzle with comprehensive relationship verification
- **Dashboard & Relationship Enhancement**: ✅ **COMPLETE** - Dashboard integration and relationship management system fully functional
- **Code Quality & UI Improvements**: ✅ **COMPLETE** - All ESLint warnings fixed (20/20 files), HeroUI toast system implemented, calendar functionality enhanced
- **Latest Achievement**: Complete calendar functionality with loading states, error handling, date format compatibility, and user experience improvements
- **Current Focus**: Production database schema update, email configuration testing, and system deployment preparation
- **Tech Stack**: Next.js 15, Better Auth, Drizzle ORM, HeroUI, Jotai state management with comprehensive relationship-based authorization
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors, professional toast notifications
- **Database**: Comprehensive relationship system with proper constraints, type safety, and bidirectional discovery across all features
- **Next Phase**: Push schema changes to production, configure email system, test password resets, and finalize deployment readiness

## 🏗️ Architecture & Technology

### Core Stack

- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v4 with CSS-first configuration + HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Jotai atomic state management (migrated from React Context)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: Better Auth (migrated from NextAuth.js for improved stability)
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management
- **Code Quality**: Husky v10 pre-commit hooks with TypeScript, ESLint, and Prettier validation
- **Pre-commit Automation**: Automated quality checks prevent failed builds and maintain code standards
- **React Suspense**: Modern async data loading with enhanced error boundaries and loading states
- **Loading Components**: Comprehensive skeleton components for consistent UX across all data loading

## 📝 Recent Project Notes

- **Calendar Functionality Enhancement (2025-08-05)**: ✅ **COMPLETED** - Enhanced calendar with loading states, error handling, date format compatibility, and improved UX
- **Code Quality & Toast System (2025-08-05)**: ✅ **COMPLETED** - All ESLint warnings fixed (20/20 files), comprehensive HeroUI toast notification system implemented
- **Production Database Preparation (2025-08-05)**: 🔄 **IN PROGRESS** - Preparing to push schema changes and reseed production database
- **Dashboard & Relationship Enhancement (2025-08-04)**: ✅ **COMPLETED** - Dashboard integration and relationship management system fully functional
- **Chat/Messaging System Migration (2025-08-04)**: ✅ **COMPLETED** - Complete migration from Supabase to Drizzle with comprehensive relationship-based authorization
- **Workout Management System Migration (2025-08-04)**: ✅ **COMPLETED** - All workout APIs migrated to Drizzle with relationship verification
- **Better Auth Integration (2025-08-04)**: ✅ **COMPLETED** - All messaging and workout APIs now use Better Auth instead of legacy session handling
- **Security Enhancement (2025-08-04)**: ✅ **COMPLETED** - Multi-layer authorization: session → role → active relationship verification across all endpoints
- **Database Architecture**: `coach_runners` table with proper foreign key constraints, unique relationship enforcement, and status management
- **Secure API Layer**: 11 endpoints with relationship-based authorization: messaging, workouts, coach-runner management, training plans
- **Technical Infrastructure**: Complete Drizzle migration system, Better Auth session handling, comprehensive logging, type-safe operations
- **Current Work**: ESLint fixes, navigation audit, core functionality testing, toast notification implementation
- **Next Priorities**: Complete code quality improvements, verify navigation, test core features, prepare for beta user testing

---

## 🚨 TypeScript Code Quality Standards (CRITICAL)

**NEVER use `any` type - this is strictly forbidden**

Instead, always:

1. Define proper types and interfaces for all data structures
2. Use specific union types (e.g., `'runner' | 'coach'`) instead of string
3. Use `unknown` for truly unknown data, then type guard/validate it
4. Create reusable type definitions at the top of test files
5. Prefer type safety over convenience - proper types prevent bugs

Example of CORRECT typing:

```typescript
// ✅ GOOD - Define proper types
type UserRole = 'runner' | 'coach'
type SessionUser = { id: string; email: string; role?: UserRole }
type SessionData = { user?: SessionUser }

// ✅ GOOD - Use proper types
const userRole: UserRole = sessionData?.user?.role || 'runner'
```

Example of INCORRECT typing:

```typescript
// ❌ BAD - Never use any
const sessionData: any = { user: { role: 'coach' } }
const userRole = (sessionData.user as any).role || 'runner'
```

---

_This file is updated at the end of each development session. Always check `PLANNING.md` and `TASKS.md` - make sure to move completed tasks to `COMPLETED_MILESTONES.md` at the start of new conversations for current context and priorities._
