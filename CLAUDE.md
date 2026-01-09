# CLAUDE.md - UltraCoach Project Guide

This file provides guidance to Claude Code when working with the UltraCoach project. It ensures consistency, context, and proper workflow across all development sessions.

## 🔄 Session Workflow (IMPORTANT)

### At the start of EVERY new conversation

1. **Read PLANNING.md** to understand project vision, architecture, and technical context
2. **Check Linear workspace** using Linear MCP to see current milestone, pending tasks, and priorities
   - Use `mcp__linear-server__list_issues` with team="Ultracoach" and state filters
   - Read issue details with `mcp__linear-server__get_issue` for context
   - Update issue status with `mcp__linear-server__update_issue` when completing work
3. **Review this file** for project-specific guidance and context
4. **Update task status in Linear** immediately when starting or completing work
   - Move issues to "In Progress" when starting
   - Move to "In Review" when creating PR
   - Move to "Done" when PR is merged
5. **Create new issues in Linear** when discovering additional tasks during development
   - Use `mcp__linear-server__create_issue` with appropriate labels and project
6. **Always use tslog library and utilities for logging (no console.log)**
7. **Follow Next.js 15 Rendering Patterns** - Use Server/Client Component hybrid pattern for all authenticated routes (see `.context7-docs/nextjs/`)

### 📋 Linear Workspace Organization

**Projects**:

- **Testing & Quality Assurance** - Current focus (Milestone 9)
- **Production Hardening & Security** - Next phase (Milestone 10)
- **Advanced Features & Integrations** - Future roadmap (Milestone 11)

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

Playwright's MCP tooling is the fastest path to real root causes. Use it to inspect DOM, network, and console output when a test flakes. Prefer concrete data-testids over text selectors.

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

## 🚀 Claude Code Quick Reference

> **Full documentation**: See `.claude/docs/WORKFLOWS.md` for detailed hook/agent/MCP documentation.

### Slash Commands

| Command                         | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `/husky`                        | Run CI checks with auto-fix until passing       |
| `/nextjs-component-generator`   | Generate Next.js components with best practices |
| `/supabase-migration-assistant` | Create/manage database migrations               |
| `/supabase-schema-sync`         | Sync schema between environments                |
| `/supabase-data-explorer`       | Query and explore database                      |
| `/vercel-deploy-optimize`       | Deploy to Vercel with optimization              |
| `/vercel-env-sync`              | Sync environment variables                      |

### Quality Gates (Automated)

**Pre-commit** (blocks commit): typecheck → lint → format:check

**Pre-push**: build only (~10 seconds). E2E tests run in CI.

**Full local checks**: Use `/husky` command for thorough testing before pushing.

### Available Agents (All Opus 4.5)

| Agent                 | Use For                                     |
| --------------------- | ------------------------------------------- |
| `fullstack-developer` | End-to-end features (API + DB + UI)         |
| `frontend-developer`  | React components, UI, accessibility         |
| `typescript-pro`      | Complex types, migrations, type safety      |
| `mcp-expert`          | MCP server configuration                    |
| `context-manager`     | Multi-agent workflows, context preservation |
| `dependency-manager`  | Vulnerability scanning, dependency updates  |

### MCP Servers

| Server     | Purpose                               |
| ---------- | ------------------------------------- |
| Supabase   | Read-only database queries and schema |
| PostgreSQL | Local database operations             |
| Context7   | Library documentation fetching        |
| GitHub     | Repository management                 |
| Linear     | Issue tracking                        |
| Memory     | Persistent session context            |

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

### ✅ Client Component Patterns - Use api-client (REQUIRED)

**ALL internal API calls MUST use the axios api-client:**

```typescript
import { api } from '@/lib/api-client'

// GET request
const response = await api.get<ResponseType>('/api/workouts')
const data = response.data

// POST request
const response = await api.post<ResponseType>('/api/workouts', payload)

// PUT/PATCH/DELETE
const response = await api.put('/api/workouts/123', payload)
const response = await api.patch('/api/workouts/123', payload)
const response = await api.delete('/api/workouts/123')

// For hooks/atoms - suppress global error toasts
const response = await api.get('/api/workouts', {
  suppressGlobalToast: true,
})
```

**Why api-client is required:**

- Automatically handles `credentials: 'same-origin'` via interceptor
- Structured error logging with tslog
- Global error toasts (suppressible per-request)
- Request timeouts (30s dev, 10s prod)
- Consistent error handling patterns

```typescript
// ❌ WRONG - Never use raw fetch for internal APIs
const response = await fetch('/api/workouts', {
  credentials: 'same-origin',
})

// ✅ CORRECT - Always use api-client
const response = await api.get('/api/workouts')
```

### Key Principles:

- **Server Components**: Call database/services directly, handle auth and redirects
- **Client Components**: Use `api` client from `@/lib/api-client` for all `/api/...` calls
- **Hooks/Atoms**: Add `suppressGlobalToast: true` when custom error handling exists
- **Components**: Let global error toasts work (don't suppress)
- **Jotai Atoms**: Handle browser detection with `if (typeof window === 'undefined') return []`

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

### Content Security Policy (CSP) Configuration

**IMPLEMENTED**: UltraCoach uses **nonce-based CSP** for optimal security.

- **Location**: `src/middleware.ts` (nonce generation) + `src/app/layout.tsx` (nonce extraction)
- **Key features**: Unique nonce per request, `'strict-dynamic'`, no `'unsafe-inline'` for scripts
- **Troubleshooting**: White screen = check middleware nonce generation and layout extraction

**Full implementation details**: See `.context7-docs/security/csp-implementation.md`

## Git Commit Strategy:

- Commit early and commit often
- **ALWAYS** Run `pnpm lint` before adding and committing
- **ALWAYS** Run `pnpm format` before adding and committing

### Conventional Commits (ENFORCED)

Commit messages are validated by a pre-tool hook. Use this format:

```
<type>[optional scope]: <description>
```

**Allowed types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

**Examples:**

```bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix: resolve race condition in workout sync"
git commit -m "docs: update API documentation"
```

### Pre-commit Hook

The Husky pre-commit hook runs these checks (blocks commit on failure):

- `pnpm typecheck` - TypeScript validation
- `pnpm lint` - ESLint checks
- `pnpm format:check` - Prettier validation (check only, doesn't write)

**DEBUGGING TIP**: If pre-commit fails but manual commands pass, run `pnpm format:check` to verify formatting.

### Pre-push Hook (Simplified)

Pre-push runs `pnpm build` only (~10 seconds). E2E tests run in CI.

**For full local checks**, use the `/husky` command which runs typecheck, lint, format, tests, and build.

**For detailed hook documentation, see `.claude/docs/WORKFLOWS.md`**

### Database Philosophy:

- **Use Drizzle for ALL database operations** (migrations, queries, schema changes)
- Environment variables are properly loaded from `.env.local` for local dev
  - env vars for production can be found in vercel and `.env.production`
- Scripts handle Supabase connection string correctly
- NEVER use direct psql commands without proper environment loading

## 🔐 Better Auth Configuration (CRITICAL)

### Key Rules

1. **Field naming**: Use `role: 'user'` (Better Auth standard), `userType: 'coach'|'runner'` (our differentiation)
2. **API queries**: Filter by `user.userType`, NEVER `user.role`
3. **Password hashing**: NEVER use bcrypt - Better Auth has its own format. Use sign-up API or browser automation.
4. **Navigation**: Use `router.push()`, NEVER `window.location.href`
5. **Client env vars**: Must have `NEXT_PUBLIC_` prefix

### Test User Scripts

```bash
pnpm tsx scripts/create-test-users-automated.ts  # Create test users via browser
pnpm tsx scripts/fresh-test-user-setup.ts        # Clean existing test users
pnpm tsx scripts/test-better-auth-signin.ts      # Test sign-in functionality
```

### Error Symptoms → Causes

- "User not found" → bcrypt hash instead of Better Auth hash
- "hex string expected" → Schema mismatch in session table
- Empty API results → Filtering by `role` instead of `userType`

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

## 🎯 Jotai Atom Usage Patterns (IMPORTANT)

**Quick rules:**

- **Read only**: `useAtomValue(atom)` - no setter created
- **Write only**: `useSetAtom(atom)` - no subscription created
- **Both**: `useAtom(atom)` - when you need read AND write

**Key principle**: Derive state, don't duplicate it. Use `splitAtom` for list performance.

**Full patterns and examples**: See `.context7-docs/jotai/best-practices.md`

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

## 🎭 Playwright Testing (CRITICAL)

### Key Rules

1. **Prefer `data-testid`** over text selectors - prevents strict mode violations
2. **Use storageState pattern** for auth - don't manually inject cookies
3. **Use Playwright MCP** to investigate failures - reveals real issues vs assumptions
4. **Flaky tests = race conditions** - use `useHydrateAtoms` for synchronous state init

### Auth Files

- Runner: `./playwright/.auth/runner.json`
- Coach: `./playwright/.auth/coach.json`

### Common Issues → Solutions

| Symptom               | Cause                                   | Fix                                                                  |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| 50-80% pass rate      | Race condition in session state         | Use `useHydrateAtoms` instead of `useEffect`                         |
| Strict mode violation | Text selector matches multiple elements | Use `getByTestId()`                                                  |
| Auth timeout          | Manual cookie management                | Use `page.evaluate(() => fetch())` with `credentials: 'same-origin'` |

**Full implementation details**: See `.context7-docs/playwright/` for storageState patterns and authentication setup

---

_This file is updated at the end of each development session. Always check `PLANNING.md` and `TASKS.md` - make sure to move completed tasks to `COMPLETED_MILESTONES.md` at the start of new conversations for current context and priorities._

- @CLAUDE.md @TASKS.md @PLANNING.md @COMPLETED_MILESTONES.md
