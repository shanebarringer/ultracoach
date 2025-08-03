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

### Current Status (Updated: 2025-08-03)

- **Active Milestone**: Coach-Runner Relationship System 🔄 **IN PROGRESS**
- **Core Development**: All foundation work complete including authentication, routing fixes, and relationship seeding
- **Latest Achievement**: Email password reset with Resend integration, 5 runners created per coach with proper Better Auth credentials
- **Authentication System**: ✅ Fully stable with Better Auth, customSession plugin, and proper role management
- **Database Relationships**: ✅ Basic coach-runner relationships established through conversations table
- **Current Focus**: Implementing comprehensive coach-runner relationship system with Drizzle migrations and bidirectional discovery
- **Tech Stack Status**: Better Auth integration complete, Drizzle ORM with PostgreSQL, HeroUI components, React Suspense patterns
- **Next Priorities**: Drizzle migration for `coach_runners` table, API endpoints for relationship management, UI components for coach/runner discovery

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

- **Coach-Runner Relationship System (2025-08-03)**: Implementing comprehensive bidirectional relationship system with proper Drizzle migrations and user discovery workflows
- **Authentication & Routing Fixes (2025-08-03)**: Complete resolution of infinite routing loops, Better Auth customSession integration, and proper role-based access control
- **Email Password Reset (2025-08-03)**: Fully implemented with Resend integration, beautiful HTML email templates, and development/production environment support
- **Database Seeding Enhancement (2025-08-03)**: Created 5 runners per coach with proper Better Auth credentials and established relationships through conversations table
- **Migration Strategy Update**: Moving from manual Supabase queries to Drizzle ORM for better type safety and consistency across API routes
- **User Journey Planning**: Designed bidirectional discovery system where both coaches and runners can browse and connect, plus invitation system for email-based onboarding
- **Previous Achievements**: React Suspense integration, TypeScript test fixes, Husky v10 modernization, and comprehensive error boundary implementation all completed successfully

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
