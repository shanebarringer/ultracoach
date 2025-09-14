# Jotai Atoms Modularization Migration Guide

## Overview

This guide documents the refactoring of Jotai atoms from a monolithic structure to a modular, domain-driven organization for better maintainability, performance, and type safety.

## Changes Made

### 1. Type Safety Improvements

**Before:**

```typescript
// Using unsafe type assertions
const userId = (user as any).id
```

**After:**

```typescript
// Using proper type guards
function isUserWithId(user: unknown): user is { id: string } {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof (user as { id: unknown }).id === 'string'
  )
}

// Usage
if (isUserWithId(user)) {
  const userId = user.id
}
```

### 2. Atom Organization

Atoms have been moved from a single barrel file to domain-specific modules:

- `auth.ts` - Authentication and session atoms
- `chat.ts` - Messaging and conversation atoms
- `workouts.ts` - Workout management atoms
- `training-plans.ts` - Training plan atoms
- `ui.ts` - UI state management atoms
- `derived/` - Computed/derived atoms
- `performance/` - Performance optimization patterns

### 3. Complex Atoms Migration

Write-only atoms with business logic have been moved to their domain modules:

**Workout Atoms (now in `workouts.ts`):**

- `completeWorkoutAtom` - Mark workout as completed
- `logWorkoutDetailsAtom` - Log workout performance details
- `skipWorkoutAtom` - Mark workout as skipped

**Chat Atoms (now in `chat.ts`):**

- `sendMessageActionAtom` - Send messages with optimistic updates

### 4. Import Path Changes

**No breaking changes for consumers!**

All atoms are still re-exported from `src/lib/atoms/index.ts` for backward compatibility:

```typescript
// Both imports work identically
import { workoutsAtom } from '@/lib/atoms'
import { workoutsAtom } from '@/lib/atoms/workouts'
```

## Migration Steps

### For New Code

1. **Import from specific modules for better tree-shaking:**

   ```typescript
   // Preferred - specific imports
   import { messagesAtom } from '@/lib/atoms/chat'
   import { workoutsAtom } from '@/lib/atoms/workouts'
   ```

2. **Use proper type guards instead of type assertions:**

   ```typescript
   // Create type guards for runtime type checking
   function isValidUser(user: unknown): user is User {
     // Implement validation logic
   }
   ```

3. **Follow domain boundaries:**
   - Keep workout-related atoms in `workouts.ts`
   - Keep chat-related atoms in `chat.ts`
   - Keep UI-only state in `ui.ts`

### For Existing Code

No immediate changes required! The barrel export maintains backward compatibility.

## Best Practices

### 1. Atom Naming Convention

- **Core atoms**: `<domain>Atom` (e.g., `workoutsAtom`)
- **Loading states**: `<domain>LoadingAtom`
- **Error states**: `<domain>ErrorAtom`
- **Selected items**: `selected<Item>Atom`
- **Write-only actions**: `<action><Domain>Atom` (e.g., `completeWorkoutAtom`)

### 2. Performance Patterns

Use the performance modules for optimized patterns:

```typescript
// For dynamic atom creation
// For granular updates
import { splitAtom } from 'jotai/utils'
// For async loading states
import { loadable } from 'jotai/utils'

import { conversationMessagesAtomsFamily } from '@/lib/atoms/performance/atom-family'
```

### 3. Type Safety

- Never use `any` type
- Always define proper TypeScript interfaces
- Use type guards for runtime validation
- Prefer `unknown` over `any` for truly unknown types

### 4. Documentation

All complex atoms now include JSDoc documentation:

```typescript
/**
 * Write-only atom for marking a workout as completed.
 * Optimistically updates the local state and syncs with the backend.
 *
 * @param workoutId - The ID of the workout to complete
 * @param data - Optional additional data
 * @returns The updated workout object
 * @throws Error if the workout completion fails
 */
export const completeWorkoutAtom = atom(...)
```

## Testing

When testing components that use atoms:

1. Use `Provider` from jotai to isolate atom state
2. Mock async atoms with test data
3. Test optimistic updates separately from backend sync

```typescript
import { Provider } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'

const TestWrapper = ({ children, initialValues }) => {
  useHydrateAtoms(initialValues)
  return <Provider>{children}</Provider>
}
```

## Troubleshooting

### Common Issues

1. **TypeScript errors after refactoring**
   - Ensure all necessary types are imported
   - Check that complex atoms import required dependencies

2. **Circular dependency warnings**
   - Import from specific modules, not the barrel file
   - Keep domain boundaries clean

3. **Missing atoms**
   - Check the specific domain module
   - Verify the atom is exported

## Future Improvements

1. **Lazy loading** - Split large atom modules for code splitting
2. **Atom devtools** - Add debugging capabilities
3. **Atom persistence** - Standardize localStorage/sessionStorage patterns
4. **Atom validation** - Add runtime validation for atom values

## Questions?

For questions about this migration, please refer to:

- The PR comments in #43
- The project's CLAUDE.md for AI assistant guidance
- The TypeScript documentation for type guards
