# UltraCoach Coding Standards

This document establishes coding conventions and best practices for the UltraCoach project.

## Table of Contents

- [Jotai Atom Debug Labels](#jotai-atom-debug-labels)
- [TypeScript Standards](#typescript-standards)
- [React Patterns](#react-patterns)
- [State Management](#state-management)
- [API Design](#api-design)
- [Testing](#testing)

---

## Jotai Atom Debug Labels

**Status**: ✅ Enforced via ESLint (`ultracoach/require-atom-debug-label`)

All Jotai atoms MUST have debug labels for improved developer experience in Jotai DevTools.

### Convention

Use the `withDebugLabel()` utility function with `category/name` format:

```typescript
import { atom } from 'jotai'
import { withDebugLabel } from './utils'

// Create atoms
export const workoutsAtom = atom<Workout[]>([])
export const selectedWorkoutAtom = atom<Workout | null>(null)

// Apply debug labels at the bottom of the file
withDebugLabel(workoutsAtom, 'workouts/list')
withDebugLabel(selectedWorkoutAtom, 'workouts/selected')
```

### Requirements

1. **Use `withDebugLabel()` utility** - NEVER use direct `.debugLabel =` assignment
2. **Category naming** - Match the atom file organization (e.g., `auth/*`, `workouts/*`, `chat/*`)
3. **Name format** - Descriptive and consistent:
   - State atoms: Use nouns (`list`, `selected`, `loading`, `error`)
   - Action atoms: Use verbs (`refreshAction`, `completeAction`, `sendAction`)
   - Derived atoms: Descriptive transformations (`upcoming`, `filtered`, `sorted`)
4. **Location** - Apply debug labels at the bottom of atom files

### Why?

- ✅ **Production optimization** - Labels are automatically stripped in production builds
- ✅ **DevTools support** - Atoms are easily identifiable during debugging
- ✅ **Bundle size** - Zero runtime overhead in production
- ✅ **Developer experience** - Clear state management transparency

### ESLint Enforcement

The `ultracoach/require-atom-debug-label` rule automatically catches:
- Missing debug labels on exported atoms
- Direct `.debugLabel` assignments (anti-pattern)
- Incorrect usage of the `withDebugLabel()` utility

**Severity**: Error in atom files, Warning elsewhere

### Verification

Test debug label behavior:

```bash
# Development mode (labels present)
pnpm verify:debug-labels

# Production mode (labels stripped)
NODE_ENV=production pnpm verify:debug-labels

# Verify production build
pnpm build && pnpm verify:build
```

### Complete Reference

See [docs/ATOM_DEBUG_LABELS.md](./ATOM_DEBUG_LABELS.md) for comprehensive documentation.

---

## TypeScript Standards

### Strict Mode

TypeScript strict mode is ENABLED. All code must pass strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Type Safety Rules

1. **Never use `any` type** - Use `unknown` instead and type guard it
2. **Prefer explicit types** over type inference for public APIs
3. **Use union types** instead of loose string types
4. **Define interfaces** for all data structures

**Examples:**

```typescript
// ✅ GOOD - Explicit union types
type UserRole = 'runner' | 'coach'
type Status = 'pending' | 'active' | 'inactive'

// ❌ BAD - Loose string types
type UserRole = string

// ✅ GOOD - Proper type guards
function isWorkout(data: unknown): data is Workout {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as { id: unknown }).id === 'string'
  )
}

// ❌ BAD - Using any
function processData(data: any) {
  return data.id // No type safety
}
```

### ESLint TypeScript Rules

```javascript
{
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
}
```

---

## React Patterns

### Server/Client Component Hybrid

All authenticated routes MUST use the Server/Client Component hybrid pattern:

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

### Component Organization

```
components/
├── ui/              # Reusable UI components (HeroUI wrappers)
├── features/        # Feature-specific components
├── layout/          # Layout components (Header, Footer, etc.)
└── providers/       # Context providers (minimal with Jotai)
```

### Hooks Convention

Custom hooks MUST start with `use` prefix:

```typescript
// ✅ GOOD
function useWorkouts() {
  return useAtomValue(workoutsAtom)
}

// ❌ BAD
function getWorkouts() {
  return useAtomValue(workoutsAtom)
}
```

---

## State Management

### Jotai Patterns

1. **Use proper Jotai hooks** based on read/write needs:

```typescript
// ✅ GOOD - Use useAtomValue when ONLY reading
const workouts = useAtomValue(workoutsAtom)

// ✅ GOOD - Use useSetAtom when ONLY writing
const setWorkouts = useSetAtom(workoutsAtom)

// ✅ GOOD - Use useAtom when you need BOTH read and write
const [workouts, setWorkouts] = useAtom(workoutsAtom)

// ❌ BAD - Don't use useAtom if you only need the value
const [workouts] = useAtom(workoutsAtom) // Creates unnecessary setter
```

2. **Derive state, don't duplicate it** (Jotai best practice):

```typescript
// ✅ GOOD - Derive from existing state
const upcomingWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  return workouts.filter(w => new Date(w.date) > new Date())
})

// ❌ BAD - Duplicate state in separate atom
const upcomingWorkoutsAtom = atom<Workout[]>([]) // Will get out of sync
```

3. **Use atom families for dynamic collections**:

```typescript
const workoutAtomFamily = atomFamily((workoutId: string) =>
  atom(get => {
    const workouts = get(workoutsAtom)
    return workouts.find(w => w.id === workoutId)
  })
)
```

---

## API Design

### API Client Patterns

**CRITICAL**: Server Components should NEVER fetch from their own API routes:

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
    where: eq(workouts.userId, session.user.id),
  })
  return <PageClient initialData={workouts} />
}
```

### Fetch Credentials

Always use `credentials: 'same-origin'` for internal API calls:

```typescript
// ✅ CORRECT - For internal /api/... endpoints
const response = await fetch('/api/workouts', {
  credentials: 'same-origin', // Default and recommended
  headers: { 'Content-Type': 'application/json' },
})

// ❌ WRONG - Unnecessary for same-domain requests
const response = await fetch('/api/workouts', {
  credentials: 'include', // Overkill for internal APIs
})
```

### API Response Format

Standard response format for all API routes:

```typescript
// Success response
return NextResponse.json({
  success: true,
  data: results,
  message: 'Operation completed successfully',
})

// Error response
return NextResponse.json(
  {
    success: false,
    error: 'Error message',
    details: errorDetails, // Optional
  },
  { status: 400 }
)
```

---

## Testing

### E2E Testing with Playwright

1. **Use Playwright MCP** to investigate test failures first
2. **Prefer `data-testid`** over text selectors for stability:

```typescript
// ✅ GOOD - Specific and stable
await page.getByTestId('race-name-0').click()

// ❌ BAD - Flaky with strict mode violations
await page.getByText('Test Ultra Race').click()
```

3. **Use Playwright storageState pattern** for authentication (see `.context7-docs/playwright/`)

### Unit Testing

- Use Vitest for unit tests
- Test files should be colocated with source files (`*.test.ts`)
- Test atoms independently from components

---

## Code Quality Commands

```bash
# Linting
pnpm lint              # Run ESLint
pnpm lint:fix          # Auto-fix ESLint issues

# Formatting
pnpm format            # Format with Prettier
pnpm format:check      # Check formatting

# Type checking
pnpm typecheck         # Run TypeScript compiler

# Testing
pnpm test              # Run Vitest unit tests
pnpm test:e2e          # Run Playwright E2E tests

# Verification
pnpm verify:build            # Verify production build
pnpm verify:debug-labels     # Test debug label stripping
```

---

## Pre-commit Hooks

Husky pre-commit hooks automatically run:

1. `pnpm lint` - ESLint validation
2. `pnpm format:check` - Formatting validation
3. `pnpm typecheck` - TypeScript validation

**All checks must pass before committing.**

---

## Resources

- [ATOM_DEBUG_LABELS.md](./ATOM_DEBUG_LABELS.md) - Complete Jotai debug label guide
- [PLANNING.md](../PLANNING.md) - Project architecture and planning
- [CLAUDE.md](../CLAUDE.md) - Development session guide
- `.context7-docs/` - Framework-specific documentation and best practices

---

_This document is maintained by the development team. Last updated: 2025-01-15_
