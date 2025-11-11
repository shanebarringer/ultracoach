# Jotai Atom Debug Labels - Coding Standard

## Purpose

Debug labels make Jotai atoms identifiable in the Jotai DevTools, improving developer experience during debugging and development. This document establishes the standard convention for debug labels in the UltraCoach project.

## Convention

### Naming Format

Use the `category/name` format without prefix characters:

```typescript
// ✅ CORRECT
withDebugLabel(sessionAtom, 'auth/session')
withDebugLabel(workoutsAtom, 'workouts/list')
withDebugLabel(messagesAtom, 'chat/messages')

// ❌ INCORRECT - No underscore prefix
withDebugLabel(sessionAtom, '_auth/session')
withDebugLabel(sessionAtom, '_sessionAtom')
```

### Category Guidelines

Categories should match the atom file organization:
- `auth/*` - Authentication atoms (from `atoms/auth.ts`)
- `workouts/*` - Workout management atoms (from `atoms/workouts.ts`)
- `chat/*` - Messaging atoms (from `atoms/chat.ts`)
- `notifications/*` - Notification atoms (from `atoms/notifications.ts`)
- `ui/*` - UI state atoms (from `atoms/ui.ts`)
- etc.

### Name Guidelines

The name should describe what the atom contains or does:
- **State atoms**: Use descriptive nouns (`list`, `selected`, `loading`, `error`)
- **Action atoms**: Use verbs (`refreshAction`, `completeAction`, `sendAction`)
- **Derived atoms**: Use descriptive names that indicate transformation (`upcoming`, `filtered`, `sorted`)

## Implementation

### Required: Use `withDebugLabel()` Utility

**ALWAYS** use the `withDebugLabel()` utility function to ensure debug labels are stripped in production builds:

```typescript
import { withDebugLabel } from './utils'

// Create your atoms
export const workoutsAtom = atom<Workout[]>([])
export const selectedWorkoutAtom = atom<Workout | null>(null)

// Apply debug labels at the bottom of the file
withDebugLabel(workoutsAtom, 'workouts/list')
withDebugLabel(selectedWorkoutAtom, 'workouts/selected')
```

### Anti-Pattern: Direct Assignment

**NEVER** use direct `.debugLabel` assignment as it will be included in production bundles:

```typescript
// ❌ WRONG - Will bloat production bundle
export const workoutsAtom = atom<Workout[]>([])
workoutsAtom.debugLabel = 'workouts/list'
```

## Production Optimization

The `withDebugLabel()` utility automatically strips debug labels in production:

```typescript
// src/lib/atoms/utils.ts
export function withDebugLabel<T>(a: Atom<T>, label: string): Atom<T> {
  if (process.env.NODE_ENV !== 'production') {
    ;(a as unknown as { debugLabel?: string }).debugLabel = label
  }
  return a
}
```

This ensures:
- ✅ Zero runtime overhead in production
- ✅ No unnecessary string literals in production bundles
- ✅ Improved bundle size optimization
- ✅ Full debugging capabilities in development

## ESLint Enforcement

An ESLint rule enforces this convention (see `.eslint-local/rules/require-atom-debug-label.js`):

```javascript
// Enforces that all atom exports have corresponding withDebugLabel calls
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require debug labels for all exported Jotai atoms',
      category: 'Best Practices',
    },
    messages: {
      missingDebugLabel: 'Atom "{{ atomName }}" must have a debug label using withDebugLabel()',
    },
  },
  // ... rule implementation
}
```

## Examples

### Basic Atoms

```typescript
import { atom } from 'jotai'
import { withDebugLabel } from './utils'

// State atoms
export const workoutsAtom = atom<Workout[]>([])
export const workoutsLoadingAtom = atom(false)
export const workoutsErrorAtom = atom<string | null>(null)

// Debug labels
withDebugLabel(workoutsAtom, 'workouts/list')
withDebugLabel(workoutsLoadingAtom, 'workouts/loading')
withDebugLabel(workoutsErrorAtom, 'workouts/error')
```

### Async Atoms

```typescript
// Async atom with suspense
export const asyncWorkoutsAtom = atom(async () => {
  const response = await fetch('/api/workouts')
  return response.json()
})

withDebugLabel(asyncWorkoutsAtom, 'workouts/async')
```

### Write-Only Action Atoms

```typescript
// Action atom
export const completeWorkoutAtom = atom(
  null,
  async (get, set, { workoutId }: { workoutId: string }) => {
    // ... implementation
  }
)

withDebugLabel(completeWorkoutAtom, 'workouts/completeAction')
```

### Derived Atoms

```typescript
// Derived computation
export const upcomingWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  return workouts.filter(w => new Date(w.date) > new Date())
})

withDebugLabel(upcomingWorkoutsAtom, 'workouts/upcoming')
```

## Migration Checklist

When adding debug labels to existing atoms:

- [ ] Import `withDebugLabel` from `'./utils'`
- [ ] Add debug labels at the bottom of the file (after all atom definitions)
- [ ] Follow the `category/name` naming convention
- [ ] Use descriptive names that match the atom's purpose
- [ ] Verify the ESLint rule passes
- [ ] Test in Jotai DevTools to ensure labels appear correctly

## Benefits

1. **Better Debugging**: Atoms are easily identifiable in Jotai DevTools
2. **Production Performance**: Zero runtime overhead in production builds
3. **Code Quality**: ESLint enforcement ensures consistency across the codebase
4. **Developer Experience**: Clear naming makes state management more transparent
5. **Bundle Size**: Reduced production bundle size by stripping debug metadata

## References

- [Jotai DevTools Documentation](https://jotai.org/docs/tools/devtools)
- [Jotai Debug Labels](https://jotai.org/docs/guides/debugging#debug-labels)
- `src/lib/atoms/utils.ts` - The `withDebugLabel()` utility implementation
