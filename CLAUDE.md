# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

**At the start of EVERY new conversation:**

1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check TASKS.md** to see current milestone, pending tasks, and priorities
3. **Review this file** for project-specific guidance and context
4. **Mark completed tasks** in TASKS.md immediately upon completion. After commits, move complete tasks to `COMPLETED_TASKS.md`
5. **Add newly discovered tasks** to TASKS.md when found during development
6. Always use tslog library and utilities for logging (no console.log)
7. **Follow Next.js 15 Rendering Patterns** - Use Server/Client Component hybrid pattern for all authenticated routes (see `.context7-docs/nextjs/`)

### MCP Instructions

- When fetching data from Context7 MCP - add to the `.context7-docs` directory (gitignored). Create a new directory for the library if one does not exist. Before fetching from Context7 refer to `.context7-docs` to see if data and/or snippets have already been added

## 🎯 Next.js 15 App Router Patterns (CRITICAL)

### Static vs Dynamic Rendering Rules

**CRITICAL ISSUE**: Routes like `/chat` are being marked as "static" when they should be dynamic for personalized content, causing:

- Signup hanging on "Loading your onboarding..."
- User-specific content not loading correctly
- Production vs local environment inconsistencies

### Required Architecture Pattern

**ALL authenticated routes MUST use Server/Client Component hybrid pattern:**

```typescript
// page.tsx (Server Component) - Forces dynamic rendering
import { headers } from 'next/headers'
import { getServerSession } from '@/utils/auth-server'
import { redirect } from 'next/navigation'
import PageClient from './PageClient'

export default async function AuthenticatedPage() {
  await headers() // 🔑 CRITICAL: Forces dynamic rendering

  const session = await getServerSession()
  if (!session) redirect('/auth/signin')

  return <PageClient user={session.user} />
}

// PageClient.tsx (Client Component) - Handles interactivity
'use client'

export default function PageClient({ user }) {
  // Client-side state management and interactivity
}
```

### Routes That MUST Be Dynamic

- `/chat` and `/chat/[userId]` - User conversations
- `/dashboard/coach` and `/dashboard/runner` - Role-based dashboards
- `/calendar` - User workout calendar
- `/workouts` - Personal workouts
- `/training-plans` - User training plans
- `/profile` - User profile

### Implementation Checklist

- [ ] Add `await headers()` to ALL authenticated page components
- [ ] Convert pure Client Components to Server/Client hybrid pattern
- [ ] Use `getServerSession()` for server-side authentication
- [ ] Pass user data as props to Client Components
- [ ] Test that build output shows "λ (Server)" not "○ (Static)"

### Reference Documentation

See `.context7-docs/nextjs/` for comprehensive guides:

- `static-vs-dynamic-rendering.md` - Core concepts and solutions
- `authentication-route-patterns.md` - Authentication implementation patterns
- `production-deployment-checklist.md` - Production verification checklist

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

## Git Commit Strategy:

- Commit early and commit often
- **ALWAYS** Run `pnpm lint` before adding and committing
- **ALWAYS** Run `pnpm format` before adding and committing

### Database Philosophy:

- **Use Drizzle for ALL database operations** (migrations, queries, schema changes)
- Environment variables are properly loaded from `.env.local` for local dev
- Scripts handle Supabase connection string correctly
- NEVER use direct psql commands without proper environment loading

## 🔐 Better Auth Password Hashing (CRITICAL)

**IMPORTANT**: Better Auth uses its own password hashing format that is incompatible with bcrypt!

### Key Issues to Avoid:

- **NEVER** use bcrypt to hash passwords for Better Auth users
- **NEVER** manually create account records with bcrypt-generated password hashes
- Better Auth expects hex-formatted password hashes from its internal hashing system
- Using bcrypt hashes will cause "User not found" errors during authentication

### Correct Approaches:

1. **For test users**: Use the automated creation script: `pnpm tsx scripts/create-test-users-automated.ts`
2. **For production**: Always use Better Auth's sign-up API or web interface
3. **For migrations**: If users exist with wrong hash format, delete and recreate through Better Auth

### Scripts Available:

- `scripts/fresh-test-user-setup.ts` - Cleans existing test users
- `scripts/create-test-users-automated.ts` - Creates test users via browser automation
- `scripts/test-better-auth-signin.ts` - Tests sign-in functionality

### Error Symptoms:

- "User not found" during sign-in with correct credentials
- "hex string expected, got undefined" in Better Auth verification
- Authentication timeouts in Playwright tests

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, BetterAuth, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-08-07)

- **Current Focus**: System Polish & Production Readiness - testing infrastructure and user experience enhancement
- **Tech Stack**: Next.js 15, Better Auth, Drizzle ORM, HeroUI, Advanced Jotai state management with performance optimizations
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors, zero ESLint warnings, professional toast notifications
- **Database**: Comprehensive relationship system with proper constraints, type safety, production-ready with comprehensive test data (18 users, 3 relationships, 15 workouts)
- **State Management**: Advanced Jotai patterns implemented - atomFamily, loadable, unwrap, splitAtom for granular performance
- **User Experience**: Complete coach-runner feature parity with advanced analytics, progress tracking, and seamless messaging integration
- **Authentication**: Better Auth with critical password hash compatibility requirement (see Auth section below)
- **Next Phase**: Playwright test fixes, workout completion functionality, and comprehensive quality assurance

## 🏗️ Architecture & Technology

### Core Stack

- **Frontend**: Next.js 15.3.5 with App Router, React 19, TypeScript
- **UI Library**: HeroUI (React components with Tailwind CSS integration)
- **Design System**: Mountain Peak Enhanced - Alpine aesthetic with professional UX
- **Styling**: Tailwind CSS v4 with CSS-first configuration + HeroUI theme system + Custom Mountain Peak colors
- **Icons**: Lucide React icons for enhanced visual design
- **State**: Advanced Jotai atomic state management with performance optimizations (atomFamily, loadable, unwrap, splitAtom patterns)
- **Database**: Supabase PostgreSQL with enhanced training schema
- **Auth**: Better Auth (migrated from NextAuth.js for improved stability)
- **Package Manager**: pnpm (better performance than npm)
- **HTTP Client**: Axios for better request handling and error management
- **Code Quality**: Husky v10 pre-commit hooks with TypeScript, ESLint, and Prettier validation
- **Pre-commit Automation**: Automated quality checks prevent failed builds and maintain code standards
- **React Suspense**: Modern async data loading with enhanced error boundaries and loading states
- **Loading Components**: Comprehensive skeleton components for consistent UX across all data loading

## 📝 Recent Project Notes

- **Runner Experience Enhancement (2025-08-07)**: ✅ **COMPLETED** - Complete feature parity achieved
  - **Advanced Dashboard**: MetricCard components with trend indicators and professional analytics
  - **Progress Tracking**: Completion rates, weekly distance, recent activity metrics with visual indicators
  - **Workout Management**: Status-based completion tracking with interactive "Mark Complete" and "Log Details" buttons
  - **Coach Integration**: Seamless messaging integration with direct Message buttons and relationship displays
- **Advanced Jotai State Management (2025-08-05)**: ✅ **COMPLETED** - Phase 1 & 2 complete
  - **Phase 1**: atomFamily, loadable, unwrap patterns for async data handling
  - **Phase 2**: splitAtom performance optimizations with granular component re-rendering
- **Technical Infrastructure**: Complete Drizzle migration system, Better Auth session handling, comprehensive logging, type-safe operations
- **Code Quality**: Zero TypeScript errors, zero ESLint warnings, production-ready codebase
- **Current Priorities**: Playwright test suite repair, workout completion functionality implementation, comprehensive quality assurance

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

- @CLAUDE.md @TASKS.md @PLANNING.md

- @CLAUDE.md
