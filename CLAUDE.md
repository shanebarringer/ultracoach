# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

### At the start of EVERY new conversation

1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check Linear workspace** at https://linear.app/ultracoach to see current milestone, pending tasks, and priorities
3. **Review this file** for project-specific guidance and context
4. **Update task status in Linear** immediately when starting or completing work
5. **Create new issues in Linear** when discovering additional tasks during development
6. **Always use tslog library and utilities for logging (no console.log)**
7. **Follow Next.js 15 Rendering Patterns** - Use Server/Client Component hybrid pattern for all authenticated routes (see `.context7-docs/nextjs/`)

### 📋 Linear Workspace Organization

**Projects**:

- **Testing & Quality Assurance** - Current focus (Milestone 9)
- **Production Hardening & Security** - Next phase (Milestone 10)
- **Advanced Features & Integrations** - Future roadmap (Milestone 11)

**Key Labels**: `testing`, `ci-cd`, `security`, `ui-ux`, `infrastructure`, `integration`, `high-priority`, `blocked`

### MCP Instructions

### Use Playwright MCP to investigate test failures and UI issues

Playwright's MCP tooling is the fastest path to real root causes. Use it to inspect DOM, network, and console output when a test flakes. Prefer concrete data-testids over text selectors.

#### Concrete selector example

```typescript
// Before (flaky: strict mode violation)
await page.getByText('Test Ultra Race').click()

// After (stable: explicit test id)
await page.getByTestId('race-name-0').click()
```

- When fetching data from Context7 MCP - add to the `.context7-docs` directory (gitignored). Create a new directory for the library if one does not exist. Before fetching from Context7 refer to `.context7-docs` to see if data and/or snippets have already been added

- When fetching data from Context7 MCP - add to the `.context7-docs` directory (gitignored). Create a new directory for the library if one does not exist. Before fetching from Context7 refer to `.context7-docs` to see if data and/or snippets have already been added

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

### Reference Documentation

See `.context7-docs/nextjs/` for comprehensive guides:

- `static-vs-dynamic-rendering.md` - Core concepts and solutions
- `authentication-route-patterns.md` - Authentication implementation patterns
- `production-deployment-checklist.md` - Production verification checklist
- `fetch-credentials-best-practices.md` - Fetch credentials and API client patterns

## 🌐 API Client Best Practices (IMPORTANT)

### 🚫 CRITICAL: Server Component Anti-Pattern

**NEVER fetch your own API routes from Server Components - this is a major anti-pattern:**

```typescript
// ❌ WRONG - Don't do this in Server Components
export default async function Page() {
  const response = await fetch('/api/workouts') // Anti-pattern!
  return <div>{response.data}</div>
}

// ✅ CORRECT - Call database/services directly
export default async function Page() {
  await headers() // Force dynamic rendering
  const session = await getServerSession()
  const workouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, session.user.id)
  })
  return <PageClient initialData={workouts} />
}
```

**Why this matters:**

- Fetching your own API routes creates unnecessary HTTP overhead
- Server Components can access database/services directly
- Cleaner separation of concerns: Server = auth + direct data, Client = API calls + state

### ✅ Client Component Patterns

**Always use `credentials: 'same-origin'` for internal API calls:**

```typescript
// ✅ CORRECT - For all /api/... endpoints in Client Components
const response = await fetch('/api/workouts', {
  credentials: 'same-origin', // Default and recommended for same-domain
  headers: {
    'Content-Type': 'application/json',
  },
})

// ❌ WRONG - Never use 'include' for internal APIs
const response = await fetch('/api/workouts', {
  credentials: 'include', // Overkill and unnecessary for same-domain
})
```

### Key Principles:

- **Server Components**: Call database/services directly, handle auth and redirects
- **Client Components**: Use fetch with relative URLs for API calls
- **same-origin**: Use for all UltraCoach internal APIs (`/api/...`)
- **include**: Only for cross-origin requests (external APIs like Strava)
- **omit**: For public APIs that don't require authentication
- **Relative URLs**: Always prefer `/api/...` over absolute URLs for internal calls
- **Jotai Atoms**: Handle browser detection automatically with `if (typeof window === 'undefined') return []`

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

# Supabase CLI operations (requires password from .env.production)
supabase db reset --linked     # Reset production database
supabase db push --linked      # Push migrations to production
supabase db dump --linked      # Dump production data
```

### Production Database Password

**CRITICAL**: Production database password is stored in `.env.production`:

**When Supabase CLI prompts for password, use the DATABASE_PASSWORD value from .env.production**

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
  - env vars for production can be found in vercel and `.env.production`
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

### Client-Side Navigation Best Practices (CRITICAL - Added 2025-09-04):

**NEVER use `window.location.href` for navigation in Next.js client components!**

- **✅ CORRECT**: Use `router.push()` from `useRouter` hook
- **❌ WRONG**: `window.location.href = '/dashboard'` (causes full page reload)
- **✅ CORRECT**: Remove HTML form attributes when using client-side submission
- **❌ WRONG**: Mix `onSubmit` handler with `method="post" action="/api/..."`

### Environment Variables in Client Components:

- **✅ CORRECT**: Use `NEXT_PUBLIC_` prefix for client-accessible env vars
- **❌ WRONG**: Try to access `process.env.NODE_ENV` in client components
- Add to `.env.local`: `NEXT_PUBLIC_APP_ENV=development`
- Add to Vercel: `NEXT_PUBLIC_APP_ENV=production`

### Error Symptoms:

- "User not found" during sign-in with correct credentials
- "hex string expected, got undefined" in Better Auth verification
- Authentication timeouts in Playwright tests
- API returning empty results when filtering by wrong field
- **500 errors with "Bad escaped character in JSON"** - caused by improper JSON escaping in API calls

### Critical Fix (2025-08-17):

**✅ RESOLVED**: Better Auth API works perfectly when using proper JSON formatting. The authentication system is fully functional.

**Always** use proper JSON formatting when testing APIs:

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

## 📊 Project Overview

UltraCoach is a professional ultramarathon coaching platform built with Next.js 15, Supabase, BetterAuth, and Jotai state management. The platform supports race-centric training plans, proper periodization, coach-runner relationships, and real-time communication.

### Current Status (Updated: 2025-09-01)

- **Tech Stack**: Next.js 15, Better Auth, Drizzle ORM, HeroUI, Advanced Jotai state management with performance optimizations
- **Developer Experience**: Pre-commit hooks prevent failed builds, automated TypeScript/ESLint validation, zero compilation errors, zero ESLint warnings, professional toast notifications
- **Database**: ✅ **ACTIVE** - Comprehensive relationship system with proper constraints, type safety, production database operational
- **State Management**: Advanced Jotai patterns implemented - atomFamily, loadable, unwrap, splitAtom for granular performance
- **User Experience**: Complete coach-runner feature parity with advanced analytics, progress tracking, and seamless messaging integration
- **Authentication**: ✅ **STABLE** - Better Auth configuration optimized for production deployment with proper URL resolution and error handling
- **CI/CD**: ✅ **STABILIZED** - Core Playwright tests passing reliably after major simplification (20 stable tests from 56 original)
- **Recent Achievement**: Fixed critical CI pipeline issues - removed problematic network waits, simplified test suite, established stable baseline
- **Active Phase**: Phase 9 - Testing Infrastructure & Quality Assurance with focus on test coverage restoration

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

- **CodeRabbit AI Improvements (2025-09-15)**: ✅ **COMPLETED** - Addressed 15 nitpick comments for enhanced code robustness
  - **Issue**: CodeRabbit AI identified edge cases, type safety gaps, and potential bugs in date utilities and workout atoms
  - **Critical Fixes Applied**:
    - **Edge-time drift prevention**: Added `startOfDay()` normalization to `toLocalYMD()` to prevent timezone conversion issues
    - **Hydration bug fix**: Fixed empty array hydration bug that caused stale UI when backend returns empty results
    - **Response shape type safety**: Created `unwrapWorkout()` helper to handle inconsistent API response shapes (`{ workout }` vs bare object)
    - **Test stabilization**: Added `vi.setSystemTime()` to prevent flaky time-dependent tests
    - **Function naming clarity**: Renamed `getCurrentWeekRange()` to `getRollingWeekRange()` with accurate documentation
  - **Enhanced Test Coverage**: Added ISO string test for `normalizeToEndOfDay` and boundary test for `isWorkoutWithinDays`
  - **Code Quality**: Removed unused `workoutsLoadingAtom` and `workoutsErrorAtom` (replaced by Suspense pattern)
  - **Documentation**: Updated `.context7-docs/date-fns/best-practices.md` with CodeRabbit AI learnings and patterns
  - **Result**: Eliminated edge cases, enhanced type safety, and improved test reliability across date utility system

- **CodeRabbit AI Improvements Phase 2 (2025-09-15)**: ✅ **COMPLETED** - Advanced date parsing and hydration architecture fixes
  - **Issue**: Additional CodeRabbit AI review identified UTC vs Local timezone drift and forced Suspense issues
  - **Critical Fixes Applied**:
    - **Smart Date Parsing**: Created `parseInput()` helper that detects date format and uses appropriate parser
    - **UTC Drift Prevention**: Date-only strings ("2024-03-15") now parse in local timezone instead of UTC
    - **Hydration Architecture**: Moved `useHydrateWorkouts()` from generic hook to top-level entry points
    - **Component Architecture**: Prevents unexpected Suspense boundaries in workout-consuming components
    - **Testing Enhancement**: Added 7 new test cases for mixed date format scenarios (38/38 tests passing)
    - **Format Detection**: ISO strings with time use `parseISO()`, date-only strings use `parse()` with format
  - **Entry Points Updated**: DashboardRouter, WorkoutsPageClient, CalendarPageClient now handle hydration
  - **Result**: Bulletproof timezone handling and cleaner component architecture with backward compatibility

- **Messaging System Refactor (2025-09-14)**: ✅ **COMPLETED** - Fixed critical messaging display issue
  - **Issue**: Messages were sending successfully but not displaying in UI due to atom family disconnect
  - **Root Cause**: Duplicate state management - messages stored in global `messagesAtom` but read from conversation-specific atom families
  - **Solution**: Applied Jotai best practice "derive state, don't duplicate it"
  - **Changes Made**:
    - Refactored `PerformantMessageList` to use derived atom pattern with `splitAtom` for granular updates
    - Simplified `useMessages` hook to filter from global `messagesAtom` instead of using atom families
    - Removed unused `conversationMessagesAtomsFamily` and `fetchConversationMessagesFamily`
    - Fixed TypeScript errors with proper `PrimitiveAtom` type assertions
  - **Best Practices Applied**: See `.context7-docs/jotai/best-practices.md` for complete Jotai patterns
  - **Result**: Messaging now works correctly with simpler, more maintainable code following Jotai best practices

- **CI/CD Pipeline Stabilization (2025-09-01)**: ✅ **COMPLETED** - Critical testing infrastructure improvements
  - **Major Fix**: Resolved persistent CI failures by simplifying test suite from 56 to 20 stable core tests
  - **Key Issues Fixed**:
    - Removed invalid `--list-projects` command that caused immediate CI failures
    - Eliminated problematic `waitForLoadState('networkidle')` calls that hung with real-time features
    - Fixed duplicate app startup issues in CI environment
    - Temporarily disabled sharded tests that were failing on test user creation
  - **Lessons Learned**:
    - Context7 docs correctly warn against `networkidle` with real-time apps
    - Start with minimal stable test suite then gradually expand
    - Complex test setups often fail in CI - simplicity wins
  - **Next Steps**: Gradually re-enable temporarily disabled tests one by one

- **Production Platform Achievement (2025-08-21)**: ✅ **COMPLETED** - Feature-complete platform with comprehensive integrations
  - **Comprehensive Strava Integration**: OAuth flow, bi-directional sync, performance metrics import, real-time updates
  - **13+ Major Milestones**: 222+ core tasks completed across authentication, state management, UI/UX, and integrations
  - **Advanced State Management**: Complete Jotai atomic patterns with performance optimization and error resilience
  - **Mountain Peak Design System**: Professional alpine-themed UI with HeroUI integration and responsive design
- **Technical Excellence Achieved (2025-08-19)**: ✅ **COMPLETED** - Production-ready codebase standards
  - **Zero TypeScript Errors**: Full type safety with strict mode enforcement across entire codebase
  - **Zero ESLint Warnings**: Clean, maintainable code following modern React patterns
  - **Advanced Architecture**: Server/Client Component hybrid pattern for optimal rendering performance
  - **Real-time Communication**: Coach-runner chat with typing indicators, message synchronization, and optimized loading states
- **Current Status**: Platform transitioned from active feature development to production hardening and testing infrastructure

**Next Phase Focus:**

- CI/CD pipeline stabilization and comprehensive testing coverage
- Production monitoring, error tracking, and security hardening
- Advanced features roadmap (Garmin integration, AI training recommendations)

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

## 🎯 Jotai Atom Usage Patterns (IMPORTANT)

**Proper usage of Jotai hooks for optimal performance and type safety:**

### Reading Atoms

```typescript
// ✅ GOOD - Use useAtomValue when ONLY reading (no writing needed)
const races = useAtomValue(racesAtom) // Just the value, no setter

// ❌ BAD - Don't use useAtom if you only need the value
const [races] = useAtom(racesAtom) // Creates unnecessary setter
```

### Writing to Atoms

```typescript
// ✅ GOOD - Use useSetAtom when ONLY writing (no reading needed)
const setRaces = useSetAtom(racesAtom) // Just the setter, no subscription

// ❌ BAD - Don't use useAtom if you only need the setter
const [, setRaces] = useAtom(racesAtom) // Creates unnecessary subscription
```

### Reading and Writing (Same Atom)

```typescript
// ✅ GOOD - Use useAtom when you need BOTH read and write
const [races, setRaces] = useAtom(racesAtom) // Same atom, both operations

// ❌ BAD - Don't split unnecessarily in the same component
const races = useAtomValue(racesAtom)     // These are the SAME atom
const setRaces = useSetAtom(racesAtom)    // being accessed twice
```

**Key Point**: `racesAtom` is ONE atom. The different hooks (`useAtom`, `useAtomValue`, `useSetAtom`) are just different ways to access it based on your needs.

### Common Patterns

1. **Simple atoms vs Refreshable atoms**

   ```typescript
   // Simple atom - setter expects a value
   const racesAtom = atom<Race[]>([])
   const setRaces = useSetAtom(racesAtom)
   setRaces(newRaces) // Pass the new value directly

   // Refreshable atom (write-only) - for async operations
   const refreshRacesAtom = atom(null, async (get, set) => {
     const races = await fetchRaces()
     set(racesAtom, races)
   })
   const refresh = useSetAtom(refreshRacesAtom)
   refresh() // Call with no arguments
   ```

2. **atomFamily for dynamic atoms**

   ```typescript
   // Creates atoms on demand based on parameters
   const messagesByConversationFamily = atomFamily((conversationId: string) => atom<Message[]>([]))
   ```

3. **splitAtom for list optimization**
   ```typescript
   // Split array atom into individual atoms for each item
   const messagesAtom = atom<Message[]>([])
   const messageAtomsAtom = splitAtom(messagesAtom)
   const [messageAtoms] = useAtom(messageAtomsAtom)
   // Each messageAtom can be updated independently
   ```

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

## 🎭 Playwright MCP Investigation Process (CRITICAL)

**Use Playwright MCP to investigate test failures and UI issues - it reveals real problems vs perceived issues**

### 🔍 Investigation Process (REQUIRED)

**When tests fail or UI issues are reported, follow this process:**

1. **Start Playwright MCP Investigation**
   ```bash
   # Use Playwright MCP tools to navigate and test the UI directly
   # This reveals actual behavior vs test assumptions
   ```

2. **Key Discoveries from Our GPX Upload Investigation**
   - **Perceived Issue**: "UI hanging on GPX upload"
   - **Real Issue**: Test selector conflict (`getByText()` finding multiple elements)
   - **Solution**: Use specific `data-testid` selectors instead of ambiguous text selectors

### ✅ Success Pattern: GPX Upload Debug (2025-09-20)

**Problem**: Test failure with GPX upload appearing to "hang"
**Investigation**: Used Playwright MCP to test upload functionality directly
**Finding**: NO hang - upload processed immediately with proper error handling
**Root Cause**: Test selector `getByText('Test Ultra Race')` resolved to 2 elements (strict mode violation)
**Fix**: Changed to specific `getByTestId('race-name-0')` selector

### 🎯 Best Practices

1. **Don't Assume Performance Issues** - Test failures often indicate selector or timing problems, not actual performance issues
2. **Use Playwright MCP First** - Before debugging code, use MCP to verify actual UI behavior
3. **Fix Root Causes** - Address test infrastructure issues (selectors, timing) rather than patching symptoms
4. **Specific Selectors** - Always prefer `data-testid` over text-based selectors for stability

### 📋 Investigation Checklist

- [ ] Use Playwright MCP to reproduce the "issue" manually
- [ ] Compare expected vs actual behavior in browser
- [ ] Check for selector conflicts (strict mode violations)
- [ ] Verify timing issues vs actual functionality problems
- [ ] Update test selectors to be more specific and reliable

**Key Learning**: Playwright MCP investigation is essential for distinguishing between real bugs and test infrastructure problems.

---

_This file is updated at the end of each development session. Always check `PLANNING.md` and `TASKS.md` - make sure to move completed tasks to `COMPLETED_MILESTONES.md` at the start of new conversations for current context and priorities._

- @CLAUDE.md @TASKS.md @PLANNING.md @COMPLETED_MILESTONES.md