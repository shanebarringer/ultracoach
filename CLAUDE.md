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

### Current Status (Updated: 2025-08-04)

- **Active Milestone**: Dashboard & Relationship Enhancement System 🔄 **IN PROGRESS**
- **Core Development**: 100% (222/222 tasks) ✅ **COMPLETE** - All performance optimizations and React patterns implemented
- **Coach-Runner Relationship System**: ✅ **COMPLETE** - Comprehensive bidirectional relationship system with API layer and UI components
- **Authentication System**: ✅ **RESTORED** - Better Auth login working properly, comprehensive seeding with proper password hashing
- **Chat/Messaging Integration**: ✅ **COMPLETE** - Full migration to Drizzle with relationship-based authorization for secure communication
- **Workout Management Integration**: ✅ **COMPLETE** - All workout APIs migrated to Drizzle with comprehensive relationship verification
- **Latest Achievement**: Complete chat/messaging and workout management systems now enforce coach-runner relationships with Better Auth integration
- **Current Focus**: Navigation context implementation, toast notification system, and invitation workflows
- **Tech Stack**: Next.js 15, Better Auth, Drizzle ORM, HeroUI, Jotai state management with comprehensive relationship-based authorization
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors
- **Database**: Comprehensive relationship system with proper constraints, type safety, and bidirectional discovery across all features
- **Next Phase**: App-wide relationship indicators, invitation system implementation, and UI/UX enhancements

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

- **Chat/Messaging System Migration (2025-08-04)**: ✅ **COMPLETED** - Complete migration from Supabase to Drizzle with comprehensive relationship-based authorization for secure communication
- **Workout Management System Migration (2025-08-04)**: ✅ **COMPLETED** - All workout APIs (create, read, update, bulk) migrated to Drizzle with relationship verification
- **Better Auth Integration (2025-08-04)**: ✅ **COMPLETED** - All messaging and workout APIs now use Better Auth instead of legacy session handling
- **Security Enhancement (2025-08-04)**: ✅ **COMPLETED** - Multi-layer authorization: session → role → active relationship verification across all endpoints
- **React Best Practices Implementation (2025-08-04)**: ✅ **COMPLETED** - Systematic fix of infinite re-render loops using official React useEffect patterns
- **Database Architecture**: `coach_runners` table with proper foreign key constraints, unique relationship enforcement, and status management (pending, active, inactive)
- **Secure API Layer**: 11 endpoints with relationship-based authorization: messaging, workouts, coach-runner management, training plans
- **Technical Infrastructure**: Complete Drizzle migration system, Better Auth session handling, comprehensive logging, type-safe operations
- **Current Work**: Navigation context implementation, toast notification system, and app-wide relationship indicators
- **Next Priorities**: Invitation system, UI/UX enhancements, notification system fixes, and Playwright CI test resolution

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
