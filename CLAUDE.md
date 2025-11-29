# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

### At the start of EVERY new conversation

1. **Read PLANNING.md** to understand project vision, architecture, and technical context
1. **Check Linear workspace** using Linear MCP to see current milestone, pending tasks, and priorities
   - Use `mcp__linear-server__list_issues` with team="Ultracoach" and state filters
   - Read issue details with `mcp__linear-server__get_issue` for context
   - Update issue status with `mcp__linear-server__update_issue` when completing work
1. **Review this file** for project-specific guidance and context
1. **Update task status in Linear** immediately when starting or completing work
   - Move issues to "In Progress" when starting
   - Move to "In Review" when creating PR
   - Move to "Done" when PR is merged
1. **Create new issues in Linear** when discovering additional tasks during development
   - Use `mcp__linear-server__create_issue` with appropriate labels and project
1. **Always use tslog library and utilities for logging (no console.log)**
1. **Follow Next.js 15 Rendering Patterns** - Use Server/Client Component hybrid pattern for all authenticated routes (see `.context7-docs/nextjs/`)

### 📋 Linear Workspace Organization

**Projects**:

**Key Labels**: `testing`, `ci-cd`, `security`, `ui-ux`, `infrastructure`, `integration`, `high-priority`, `blocked`

### MCP Instructions

### GitHub MCP Fallback Commands

When GitHub MCP is not available (authentication errors), use GitHub CLI (`gh`) as fallback:

- `gh pr view` - View current PR
- `gh pr create` - Create new PR
- `gh pr list` - List PRs
- `gh issue view` - View issue details
- `gh issue create` - Create new issue

### Use Playwright MCP to investigate test failures and UI issues

Playwright's MCP tooling is the fastest path to real root causes. Use it to inspect DOM, network, and console output when a test flakes. Prefer concrete data-testids over text selectors. Take screenshots when applicable to diagnose issues.

#### Concrete selector example

```typescript
// Before (flaky: strict mode violation)
await page.getByText('Test Ultra Race').click()

// After (stable: explicit test id)
await page.getByTestId('race-name-0').click()
```

### E2E authentication storageState filenames

- Runner: use `./playwright/.auth/runner.json` (canonical)
- Coach: use `./playwright/.auth/coach.json`

Deprecated

- `./playwright/.auth/user.json` was the legacy runner alias and is now deprecated. CI temporarily accepts it for a short deprecation window to keep older branches green, but all new/updated specs and Playwright projects should reference `runner.json`.

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

### Schema Change Workflow (IMPORTANT)

**Two workflows exist for database changes:**

1. **For Schema Changes (New Tables/Columns)** - Use Drizzle to generate, Supabase to apply:

```bash
# 1. Edit src/lib/schema.ts with your changes

# 2. Generate migration SQL from schema changes
pnpm db:generate

# 3. Review generated SQL in supabase/migrations/

# 4. Apply to local database
pnpm db:migrate:local    # Uses: supabase migration up --local

# 5. Test your changes locally

# 6. Apply to production (after PR merge)
pnpm prod:db:migrate     # Uses: supabase db push --linked
```

1. **For Rapid Prototyping Only** (bypasses migration files):

```bash
# Push schema directly to database (no migration file created)
pnpm db:push             # Uses: drizzle-kit push --force
```

### Migration File Management

- **Drizzle generates migrations** to `supabase/migrations/` folder
- **Supabase CLI applies migrations** for proper tracking and rollback support
- **Journal tracking**: All migrations tracked in `supabase/migrations/meta/_journal.json`
- **Never manually edit** migration SQL files after they've been applied

### Production Database Password

**CRITICAL**: Production database password is stored in `.env.production`:

**When Supabase CLI prompts for password, use the DATABASE_PASSWORD value from .env.production**

#### 🔒 Security-First Approach: Nonce-Based CSP (Current Implementation)

**UltraCoach uses the recommended security-first approach for Next.js 15 applications:**

- ✅ **Unique nonce per request** - Cryptographically secure random nonce generated in middleware
- ✅ **Zero `'unsafe-inline'` for scripts** - No broad inline script permissions (main XSS protection)
- ✅ **`'strict-dynamic'`** - Allows scripts loaded by nonce-approved scripts
- ✅ **Automatic nonce application** - Next.js applies nonce to all framework scripts
- ✅ **Pragmatic style handling** - Uses `'unsafe-inline'` for styles (safe with React's automatic escaping)
- ✅ **Environment-specific policies** - Dev includes `'unsafe-eval'` for HMR

#### Implementation Details

**Location**: `src/middleware.ts` (nonce generation and CSP header setting)

The middleware generates a unique nonce for each request and builds a strict CSP header:

```typescript
// Generate unique nonce (cryptographically secure)
// Using btoa() instead of Buffer for Edge runtime compatibility
const nonce = btoa(crypto.randomUUID())

// Build CSP with nonce-based script approval (environment-specific)
const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  // script-src: Nonce-based protection (primary XSS defense)
  // 'unsafe-inline' fallback for Next.js router navigation (ignored by modern browsers with nonce)
  // Development includes 'unsafe-eval' for HMR (Hot Module Replacement)
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // style-src: Allow inline styles for React inline style attributes
  // 'unsafe-inline' required for React styles (style={{...}})
  // Safe because React automatically escapes all user content
  // Google Fonts: External stylesheet and font files
  `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`,
  "img-src 'self' data: https://api.strava.com https://*.supabase.co blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.strava.com https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
]
```

**Layout Integration**: `src/app/layout.tsx`

The root layout extracts the nonce and passes it to components that need it:

```typescript
const headersList = await headers()
const nonce = headersList.get('x-nonce') ?? undefined

// Pass nonce to PostHog and other script-loading components
<PostHogProvider nonce={nonce}>
```

#### Why Nonce-Based CSP Is Superior

**Security Benefits:**

- 🛡️ **Blocks all unauthorized inline scripts** - Only scripts with matching nonce execute
- 🔐 **Per-request randomization** - Attackers can't guess nonce values
- ✅ **Industry best practice** - Recommended by Next.js, Google, and security experts
- 🚫 **Eliminates XSS attack surface** - No `'unsafe-inline'` weakness

**Official Documentation:**

- [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) - Official implementation guide
- [MDN CSP Nonces](https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy/script-src) - Authoritative CSP reference

#### Trade-offs & Requirements

**Forces Dynamic Rendering:**

- ⚠️ All pages must be dynamically rendered (no static optimization)
- ⚠️ Disables Incremental Static Regeneration (ISR)
- ⚠️ CDN caching requires additional configuration

**For UltraCoach, This Is Ideal:**

- ✅ Most pages already require dynamic rendering (authentication)
- ✅ Server/Client Component pattern aligns perfectly
- ✅ Security > static optimization for coaching platform
- ✅ Middleware already in place for authentication

#### Troubleshooting

**Symptoms of CSP Issues:**

- White screen on landing page
- Console errors: "Refused to execute inline script"
- SHA-256 hash violations for scripts
- Pages render but don't hydrate

**Solutions:**

1. Verify middleware is generating nonce
1. Check layout extracts nonce from `x-nonce` header
1. Ensure Script components use `nonce` prop
1. Confirm CSP header is set in response

#### Legacy: unsafe-inline Approach (Not Recommended)

**Historical Note**: Previous implementations used `'unsafe-inline'` as a compatibility measure. This approach:

- ⚠️ **Weakens CSP protection** - Allows ALL inline scripts
- 🔴 **Security trade-off** - Increases XSS attack surface
- ⚠️ **Not recommended** - Use only if nonce-based CSP is not feasible

If you need to temporarily use `'unsafe-inline'` for debugging, add to middleware CSP:

```typescript
// TEMPORARY ONLY - Remove in production
script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'
```

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
- **PRE-PUSH HOOK REQUIREMENTS**: Dev server must be running on port 3001 for E2E tests
  - Start dev server: `pnpm dev` (in separate terminal)
  - Verify server is ready: `curl http://localhost:3001`
  - Pre-push hook will check for running server and fail early with helpful message if not detected
  - Critical E2E tests (auth, race-import) require live server for authentication flows

### Database Philosophy:

- **Drizzle for schema definitions and migration generation** (`src/lib/schema.ts`)
- **Supabase CLI for applying migrations** (proper tracking and rollback support)
- **Drizzle for queries** via `db.query.*` and `db.select().*` patterns
- Environment variables are properly loaded from `.env.local` for local dev
  - env vars for production can be found in vercel and `.env.production`
- Scripts handle Supabase connection string correctly
- NEVER use direct psql commands without proper environment loading
- See "Schema Change Workflow" section above for detailed migration process

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
1. **For production**: Always use Better Auth's sign-up API or web interface
1. **For migrations**: If users exist with wrong hash format, delete and recreate through Better Auth

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

**Always** use proper JSON formatting when testing APIs:

```bash
# ✅ CORRECT - Use JSON file to avoid escaping issues
curl http://localhost:3001/api/auth/sign-up/email -d @signup.json -H "Content-Type: application/json"

# ❌ WRONG - Escaped quotes cause JSON parsing errors
curl http://localhost:3001/api/auth/sign-up/email -d '{"email":"test@example.com"}'
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
- **Auth**: Better Auth
- **Package Manager**: pnpm
- **HTTP Client**: Axios for better request handling and error management
- **Code Quality**: Husky v10 pre-commit hooks with TypeScript, ESLint, and Prettier validation
- **Pre-commit Automation**: Automated quality checks prevent failed builds and maintain code standards
- **React Suspense**: Modern async data loading with enhanced error boundaries and loading states
- **Loading Components**: Comprehensive skeleton components for consistent UX across all data loading

### ⚠️ Minor Areas for Future Enhancement

1. **Rate Limiting Enhancement**

   ```typescript
   // Consider adding exponential backoff for Strava API calls
   // Current: Fixed retry logic
   // Suggestion: Implement exponential backoff with jitter
   ```

1. **Caching Strategy**

   ```typescript
   // Consider implementing Redis caching for frequently accessed Strava data
   // Current: In-memory caching via Jotai atoms
   // Future: Persistent caching for better UX
   ```

1. **Monitoring Enhancement**
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

### 🚨 Session Persistence Race Condition (RESOLVED 2025-10-07)

**LESSON LEARNED (PR #136, ULT-54)**: When E2E tests for session persistence fail intermittently (50-80% pass rate):

1. **Identify the race condition** - Components rendering before async effects complete
2. **Use synchronous hydration** - Jotai's `useHydrateAtoms` sets state before first render
3. **Server-side session fetching** - Pass `initialSession` from server to eliminate client-side loading
4. **Eliminate flicker** - User menus and auth-dependent UI appear immediately on first render

**Symptoms:**

- Test expectations like `await expect(page.getByTestId('user-menu')).toBeVisible()` fail intermittently
- Components that depend on session state don't render consistently
- Auth-based navigation behaves differently between test runs

**Root Cause:**
`useEffect` runs **after** first render, creating a race condition where components like `Header` read `sessionAtom` before it's populated. Sometimes the timing works (lucky), sometimes it doesn't (flaky test).

**Solution:**
Replace async `useEffect` pattern with Jotai's `useHydrateAtoms` for synchronous state initialization before first render.

```typescript
// ❌ BEFORE: Async useEffect (50-80% pass rate)
useEffect(() => {
  if (initialSession) setSession(initialSession)
}, [initialSession])

// ✅ AFTER: Synchronous hydration (100% pass rate)
useHydrateAtoms([
  [sessionAtom, initialSession || null],
  [userAtom, initialSession?.user || null],
  [authLoadingAtom, false],
])
```

**See**: `.context7-docs/jotai/session-persistence-patterns.md` for complete implementation details

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

## 🎭 Playwright Authentication Best Practices (UPDATED 2025-10-12)

### storageState Pattern (RECOMMENDED)

**The Official Playwright Way - Adopted in ULT-54:**

- ✅ Use `page.evaluate(() => fetch())` for API authentication (sets cookies in browser context)
- ✅ Playwright automatically captures cookies via `context.storageState({ path })`
- ✅ Tests configured with `storageState` path load saved state automatically
- ❌ Never manually extract/inject cookies - Playwright handles everything

### What We Learned

**Before (Manual Cookie Management):**

- 40+ second timeouts, 50-80% pass rate
- Complex cookie extraction/injection code
- Race conditions and timing issues

**After (storageState Pattern):**

- 8.6 second setup time, 100% pass rate
- Simple, clean code (20 lines vs 60+)
- First-attempt success, no retries needed

**Result**: 10x faster, 100% reliable, significantly simpler code

### Implementation Pattern

```typescript
// ✅ CORRECT - auth.setup.ts
setup('authenticate', async ({ page, context }) => {
  await page.goto(`${baseUrl}/auth/signin`)

  // Authenticate via API - cookies set automatically
  await page.evaluate(
    async ({ apiUrl, email, password }) => {
      await fetch(apiUrl, {
        method: 'POST',
        credentials: 'same-origin', // CRITICAL for cookie handling
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    },
    { apiUrl, email, password }
  )

  await page.waitForTimeout(1000) // Let cookies propagate
  await page.goto(`${baseUrl}/dashboard`) // Verify auth

  // Save state - Playwright captures everything automatically
  await context.storageState({ path: authFile })
})
```

### Anti-Patterns

```typescript
// ❌ WRONG - Don't manually extract/inject cookies
const cookies = await context.cookies()
const sessionCookie = cookies.find(c => c.name === 'session_token')
await context.addCookies([sessionCookie]) // Unnecessary!

// ❌ WRONG - Don't use page.request.post()
await page.request.post('/api/auth', { data: creds })
// Sets cookies in isolated context, won't work!
```

### Configuration

```typescript
// playwright.config.ts
projects: [
  {
    name: 'setup',
    testMatch: /auth\.setup\.ts/,
  },
  {
    name: 'chromium-authenticated',
    use: {
      storageState: './playwright/.auth/runner.json', // Auto-loads
    },
    dependencies: ['setup'], // Runs setup first
  },
]
```

### Key Files

- `tests/auth.setup.ts` - Runner authentication setup
- `tests/auth-coach.setup.ts` - Coach authentication setup
- `playwright/.auth/runner.json` - Saved runner state
- `playwright/.auth/coach.json` - Saved coach state

**Reference**: See `.context7-docs/playwright/storagestate-authentication.md` for complete guide

---

_This file is updated at the end of each development session. Always check `PLANNING.md` and `TASKS.md` - make sure to move completed tasks to `COMPLETED_MILESTONES.md` at the start of new conversations for current context and priorities._

- @CLAUDE.md @TASKS.md @PLANNING.md @COMPLETED_MILESTONES.md
