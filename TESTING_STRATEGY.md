# Testing Strategy for Jotai Atoms Refactoring

## Overview

This document outlines the comprehensive testing strategy implemented for the major Jotai atoms refactoring (PR #43). The refactoring modularized the monolithic `atoms.ts` file into 11 focused modules, requiring thorough testing to ensure stability.

## Testing Architecture

### 1. Unit Testing (Vitest)

**Location**: `src/lib/atoms/__tests__/`

#### Test Coverage by Module

| Module              | Status      | Coverage | Key Tests                                        |
| ------------------- | ----------- | -------- | ------------------------------------------------ |
| `auth.ts`           | ✅ Complete | 100%     | Session management, role detection, auth state   |
| `chat.ts`           | ✅ Complete | 95%      | Messaging, optimistic updates, typing indicators |
| `workouts.ts`       | 🔄 Partial  | 60%      | CRUD operations, filtering, bulk operations      |
| `training-plans.ts` | 📋 Planned  | -        | Plan management, templates, phase progression    |
| `relationships.ts`  | 📋 Planned  | -        | Coach-runner connections, status management      |
| `strava.ts`         | 📋 Planned  | -        | OAuth state, sync operations, activity matching  |
| `races.ts`          | 📋 Planned  | -        | Race data management, import operations          |
| `notifications.ts`  | 📋 Planned  | -        | Notification state, read/unread tracking         |
| `forms.ts`          | 📋 Planned  | -        | Form state management, validation                |
| `ui.ts`             | 📋 Planned  | -        | Modal states, drawer management, UI preferences  |

#### Test Utilities

**File**: `src/lib/atoms/__tests__/utils/test-helpers.ts`

```typescript
// Key utilities provided:
- createTestStore()           // Isolated Jotai store for testing
- getAtomValue()              // Safe atom value retrieval
- setAtomValue()              // Safe atom value setting
- mockFetch()                 // API mocking
- createMock*()               // Factory functions for test data
- setupCommonMocks()          // Common test environment setup
```

**File**: `src/lib/atoms/__tests__/utils/mock-providers.tsx`

```typescript
// React testing utilities:
;-TestProvider - // Jotai provider wrapper for components
  createWrapper() - // RTL wrapper factory
  renderHookWithProvider() // Hook testing with Jotai context
```

### 2. Integration Testing

**Location**: `src/lib/atoms/__tests__/integration/`

#### Implemented Tests

- **auth-chat.test.ts**: Tests interaction between authentication and messaging
  - Session requirements for sending messages
  - User context in optimistic updates
  - Role-based UI adjustments
  - Session expiry handling

#### Planned Integration Tests

- **workouts-plans.test.ts**: Workout and training plan synchronization
- **relationships-ui.test.ts**: Relationship state impact on UI components
- **strava-workouts.test.ts**: Strava sync with local workout management

### 3. E2E Testing (Playwright)

**Location**: `tests/e2e/`

#### Implemented Tests

- **auth-flows.spec.ts**: Complete authentication flows
  - Sign up with role selection
  - Sign in with role-based redirection
  - Sign out and state cleanup
  - Session persistence
  - Auth error handling
  - Protected route redirection

#### Planned E2E Tests

- **coach-runner-relationships.spec.ts**
- **workout-management.spec.ts**
- **training-plans.spec.ts**
- **messaging.spec.ts**

## Testing Patterns

### 1. Atom Testing Pattern

```typescript
describe('Module Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('should test basic atom operations', () => {
    // Test initial state
    expect(getAtomValue(store, myAtom)).toBe(initialValue)

    // Test updates
    setAtomValue(store, myAtom, newValue)
    expect(getAtomValue(store, myAtom)).toBe(newValue)
  })
})
```

### 2. Derived Atom Testing

```typescript
it('should compute derived values correctly', () => {
  // Set dependencies
  setAtomValue(store, sourceAtom, sourceValue)

  // Verify derivation
  expect(getAtomValue(store, derivedAtom)).toBe(expectedDerived)
})
```

### 3. Async Atom Testing

```typescript
it('should handle async operations', async () => {
  // Mock API
  mockFetch(new Map([['/api/endpoint', { ok: true, json: () => Promise.resolve(data) }]]))

  // Trigger async atom
  const result = await store.set(asyncActionAtom, payload)

  // Verify result and side effects
  expect(result).toEqual(expectedResult)
  expect(getAtomValue(store, stateAtom)).toBe(updatedState)
})
```

### 4. Optimistic Update Testing

```typescript
it('should handle optimistic updates', async () => {
  // Clear initial state
  setAtomValue(store, itemsAtom, [])

  // Trigger action with delayed API
  const promise = store.set(createItemAtom, data)

  // Check optimistic state immediately
  const items = getAtomValue(store, itemsAtom)
  expect(items[0].optimistic).toBe(true)

  // Wait for resolution
  await promise

  // Verify final state
  expect(getAtomValue(store, itemsAtom)[0].optimistic).toBe(false)
})
```

## Running Tests

### Commands

```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test src/lib/atoms/__tests__/auth.test.ts

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E with UI
pnpm test:e2e:ui

# Watch mode for development
pnpm test:ui
```

### CI/CD Configuration

Tests run automatically on:

- Pull requests
- Commits to main branch
- Pre-commit hooks (via Husky)

## Test Data Management

### Test Users

```typescript
// Standard test users for consistency
const TEST_USERS = {
  runner: {
    email: 'runner@example.com',
    password: 'password123',
    role: 'runner',
  },
  coach: {
    email: 'coach@example.com',
    password: 'password123',
    role: 'coach',
  },
}
```

### Mock Data Factories

All mock data creation is centralized in `test-helpers.ts`:

- `createMockSession()`
- `createMockWorkout()`
- `createMockTrainingPlan()`
- `createMockMessage()`
- `createMockConversation()`
- `createMockRelationship()`
- `createMockRace()`

## Best Practices

### 1. Test Isolation

- Each test creates its own store instance
- No shared state between tests
- Clean setup/teardown with `beforeEach`/`afterEach`

### 2. Mocking Strategy

- Mock at the fetch level for unit tests
- Use MSW for integration tests (planned)
- Real backend for E2E tests

### 3. Assertion Strategy

- Test both positive and negative cases
- Verify side effects of actions
- Check error handling paths
- Validate optimistic update rollback

### 4. Performance Considerations

- Use `--run` flag for CI (no watch mode)
- Parallelize test execution where possible
- Keep unit tests fast (<100ms each)
- Reserve heavy tests for E2E suite

## Coverage Goals

### Target Coverage

- **Unit Tests**: 80% coverage for all atom modules
- **Integration Tests**: All critical cross-module interactions
- **E2E Tests**: All user-facing workflows

### Current Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Current stats (as of latest run):
- Statements: 75%
- Branches: 68%
- Functions: 82%
- Lines: 75%
```

## Troubleshooting

### Common Issues

1. **"Atom is undefined or null"**
   - Ensure atom is imported from correct module
   - Check that atom is exported from module

2. **"Cannot read properties of undefined"**
   - Verify mock data structure matches expectations
   - Check atom dependencies are properly initialized

3. **Async test timeouts**
   - Increase timeout for slow operations
   - Ensure promises are properly awaited
   - Check mock delays are reasonable

### Debug Mode

```typescript
// Enable verbose logging in tests
import { createLogger } from '@/lib/logger'

const logger = createLogger('test')

// Use in tests
logger.debug('Atom value:', getAtomValue(store, atom))
```

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**
   - Playwright screenshots for UI components
   - Automated visual diff detection

2. **Performance Testing**
   - Measure atom update performance
   - Track re-render counts
   - Memory leak detection

3. **Mutation Testing**
   - Verify test quality with mutation testing
   - Identify untested edge cases

4. **Contract Testing**
   - API contract validation
   - Type safety verification

## Contributing

When adding new atoms or modifying existing ones:

1. **Write tests first** (TDD approach)
2. **Update test coverage** for affected modules
3. **Run full test suite** before committing
4. **Document complex test scenarios**
5. **Keep tests focused and readable**

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Jotai Testing Guide](https://jotai.org/docs/guides/testing)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)

---

_This testing strategy ensures the Jotai atoms refactoring maintains stability while improving code organization and maintainability._
