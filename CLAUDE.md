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
# Local database operations
pnpm db:connect
pnpm db:query "SELECT * FROM coach_runners LIMIT 5;"
pnpm db:generate    # Generate migrations
pnpm db:push        # Push schema changes (uses --force)
pnpm db:migrate     # Apply migrations
pnpm db:studio      # Open Drizzle Studio
pnpm db:seed        # Seed database with test data
pnpm db:fresh       # Reset and seed database

# Production database operations
pnpm prod:db:query "SELECT COUNT(*) FROM better_auth_users;"
pnpm prod:db:seed   # Seed production database

# Supabase CLI operations (requires password from .env.production)
supabase db reset --linked     # Reset production database
supabase db push --linked      # Push migrations to production
supabase db dump --linked      # Dump production data
```

### Production Database Password

**CRITICAL**: Production database password is stored in `.env.production`:
```bash
DATABASE_PASSWORD=kgy7YEH5etg7abw!ztr
```

**When Supabase CLI prompts for password, use the DATABASE_PASSWORD value from .env.production**

### ⚠️ CRITICAL: Supabase Database Auto-Pause Issue

**ISSUE**: Supabase pauses databases after 7 days of inactivity, causing "Tenant or user not found" errors.

**SOLUTION**: 
1. **Unpause database** via Supabase Dashboard: https://supabase.com/dashboard/project/ccnbzjpccmlribljugve/settings/database
2. **Keep database active** with regular activity until beta users are onboarded
3. **Monitor database status** regularly to prevent future pauses

**PRODUCTION READINESS REQUIREMENT**: Database must remain active for beta user onboarding

## Git Commit Strategy:

- Commit early and commit often
- **ALWAYS** Run `pnpm lint` before adding and committing
- **ALWAYS** Run `pnpm format` before adding and committing
- **PRE-COMMIT HOOK COMMANDS**: The Husky pre-commit hook runs different commands than manual ones:
  - Manual: `pnpm lint` (ESLint check)
  - Pre-commit: `pnpm lint` (same)
  - Manual: `pnpm format` (writes formatting changes)
  - Pre-commit: `pnpm format:check` (only checks, fails if unformatted)
  - Manual: `pnpm typecheck` (TypeScript validation)
  - Pre-commit: `pnpm typecheck` (same)
- **DEBUGGING TIP**: If pre-commit fails but manual commands pass, run `pnpm format:check` to verify formatting

### Database Philosophy:

- **Use Drizzle for ALL database operations** (migrations, queries, schema changes)
- Environment variables are properly loaded from `.env.local` for local dev
- Scripts handle Supabase connection string correctly
- NEVER use direct psql commands without proper environment loading

## 🔐 Better Auth Configuration (CRITICAL)

### Database Schema Fields (EXTREMELY IMPORTANT)

**CRITICAL**: Better Auth uses specific field naming that MUST be followed exactly:

- **Better Auth Role**: `role` field should be `'user'` (Better Auth standard)
- **Application Role**: Use `user_type` field for coach/runner differentiation
- **Database Queries**: ALL API queries must filter by `user.userType` (maps to `user_type` column)
- **Session Data**: Better Auth will use `role: 'user'` for all users, customSession transforms this

### Schema Configuration:

```typescript
// In schema.ts - BOTH fields required for Better Auth compatibility
export const user = pgTable('better_auth_users', {
  // ... other fields
  role: text('role').default('user').notNull(), // Better Auth standard role
  userType: text('user_type').default('runner').notNull(), // Our coach/runner differentiation
})
```

### API Query Pattern (REQUIRED):

```typescript
// ✅ CORRECT - Use userType field for database queries
.where(eq(user.userType, 'runner'))
.where(eq(user.userType, 'coach'))

// ❌ WRONG - Don't use role field for queries
.where(eq(user.role, 'runner'))
```

### Data Consistency Fix:

```sql
-- Fix any inconsistent role values to Better Auth standard
UPDATE better_auth_users SET role = 'user' WHERE role != 'user';
```

### Password Hashing (CRITICAL)

**IMPORTANT**: Better Auth uses its own password hashing format that is incompatible with bcrypt!

- **NEVER** use bcrypt to hash passwords for Better Auth users
- **NEVER** manually create account records with bcrypt-generated password hashes
- **⚠️ SECURITY ISSUE**: Custom password hashing in `scripts/lib/database-operations.ts:96-100` causes authentication failures
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
- API returning empty results when filtering by wrong field
- **500 errors with "Bad escaped character in JSON"** - caused by improper JSON escaping in API calls

### Critical Fix (2025-08-17):

**✅ RESOLVED**: Better Auth API works perfectly when using proper JSON formatting. The authentication system is fully functional.

**Issue**: 500 errors were caused by improper JSON escaping in curl commands during testing, NOT actual Better Auth problems.

**Solution**: Always use proper JSON formatting when testing APIs:

```bash
# ✅ CORRECT - Use JSON file to avoid escaping issues
curl http://localhost:3001/api/auth/sign-up/email -d @signup.json -H "Content-Type: application/json"

# ❌ WRONG - Escaped quotes cause JSON parsing errors
curl http://localhost:3001/api/auth/sign-up/email -d '{"email":"test@example.com"}'
```

### Additional Fixes (2025-08-17):

**✅ TRAINING PLAN TEMPLATES**: Created missing `/api/training-plans/templates` endpoint

- **Issue**: CreateTrainingPlanModal was calling non-existent API endpoint
- **Solution**: Created proper API endpoint with authentication and database integration
- **Result**: 19 public templates now load correctly in training plan creation modal

**✅ TYPESCRIPT IMPROVEMENTS**: Proper type extensions for Better Auth custom fields

- **Issue**: Better Auth additionalFields not included in TypeScript signatures
- **Solution**: Extended interfaces instead of using `any` types
- **Implementation**: Created `SignUpEmailBody` interface for type safety

```typescript
// ✅ CORRECT - Extend types properly
interface SignUpEmailBody {
  email: string
  password: string
  name: string
  userType?: string
  callbackURL?: string
}

// Use with proper casting
const result = await auth.api.signUpEmail({
  body: userData as SignUpEmailBody,
})
```

**✅ UI CONSISTENCY**: Fixed header navigation button inconsistency

- **Issue**: Sign In was a plain link while Sign Up was a proper Button component
- **Solution**: Converted both desktop and mobile Sign In to use Button component with `variant="light"`

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, BetterAuth, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-08-21)

- **Current Focus**: Production Deployment Readiness - Database foundation, core functionality completion, and testing infrastructure
- **Tech Stack**: Next.js 15, Better Auth, Drizzle ORM, HeroUI, Advanced Jotai state management with performance optimizations
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors, zero ESLint warnings, professional toast notifications
- **Database**: Comprehensive relationship system with proper constraints, type safety, requires production reset and re-migration
- **State Management**: Advanced Jotai patterns implemented - atomFamily, loadable, unwrap, splitAtom for granular performance
- **User Experience**: Complete coach-runner feature parity with advanced analytics, progress tracking, and seamless messaging integration
- **Authentication**: Better Auth configuration optimized for production deployment with proper URL resolution and error handling
- **Recent Completion**: Full Strava integration with OAuth, activity browsing, intelligent workout matching, and comprehensive sync operations
- **Active Phase**: Phase 1 - Database foundation with production reset, workout completion functionality, and E2E test fixes

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

- **Production Authentication Fixes (2025-08-12)**: ✅ **COMPLETED** - Critical production stability improvements
  - **Better Auth URL Resolution**: Fixed VERCEL_URL prioritization for production deployments
  - **Configuration Optimization**: Enhanced URL parsing logic that skips localhost in production environment
  - **Error Handling**: Improved Better Auth initialization with comprehensive error logging and diagnostics
  - **Production Testing**: Created diagnostic scripts for validating production authentication endpoints
  - **Root Cause**: Resolved 500 errors caused by localhost BETTER_AUTH_URL conflicts in production environment
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
- **Current Priorities**: Beta readiness completed, comprehensive UI audit, Server/Client component architecture standardization

### 🎉 Recent Achievements (2025-08-17)

**Beta Readiness Completed:**

- ✅ Authentication flow: Fixed and tested with Better Auth compatibility
- ✅ Training plan templates: API endpoint created and working
- ✅ Races infinite loop: Fixed with memoized logger pattern
- ✅ Messages API 403 errors: Resolved with coach-runner relationships
- ✅ Navbar flashing: Fixed with loading state checks
- ✅ Playwright tests: All 22/22 tests passing
- ✅ Type safety improvements: All ESLint warnings resolved
- ✅ Script consolidation: Deprecated scripts removed, secure versions enhanced

### 🎉 Major Achievement: Comprehensive Strava Integration (2025-08-21)

**✅ COMPLETED - Full Production-Ready Strava Integration:**

1. **OAuth Flow** - Seamless Strava account connection with proper redirects and session management
2. **Activity Browsing** - Advanced modal with filtering, search, pagination, and Mountain Peak styling
3. **Intelligent Workout Matching** - Confidence-based matching with discrepancy analysis and recommendations
4. **Comprehensive Sync Operations** - Multiple sync strategies (bulk, enhanced, selective) with transaction safety
5. **Dashboard Integration** - Strava widget on runner dashboard with real-time connection status
6. **API Infrastructure** - 4 comprehensive endpoints for matching, syncing, merging, and enhanced operations
7. **Mountain Peak Styling** - All components follow alpine design system with gradient backgrounds and professional UX
8. **Advanced State Management** - Jotai patterns with loadable, refreshable, and action atoms for optimal performance

**Next Phase Ready for:**

- Testing infrastructure development
- Advanced features (Garmin integration)
- Performance monitoring and analytics

### ⚠️ Minor Areas for Future Enhancement

1. **Rate Limiting Enhancement**
   ```typescript
   // Consider adding exponential backoff for Strava API calls
   // Current: Fixed retry logic
   // Suggestion: Implement exponential backoff with jitter
   ```

2. **Caching Strategy**
   ```typescript
   // Consider implementing Redis caching for frequently accessed Strava data
   // Current: In-memory caching via Jotai atoms
   // Future: Persistent caching for better UX
   ```

3. **Monitoring Enhancement**
   ```typescript
   // Consider adding metrics collection for sync operations
   // Current: Excellent logging
   // Future: Performance metrics and success rate tracking
   ```

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
