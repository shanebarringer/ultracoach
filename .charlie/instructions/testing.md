# UltraCoach Testing Strategy

## Testing Architecture

### Unit Tests with Vitest

- **Location**: `src/**/*.test.ts` or `tests/unit/**/*.test.ts`
- **Command**: `pnpm test:run` (for CI) or `pnpm test` (watch mode)
- **Focus**: Utility functions, hooks, and component logic
- **Coverage**: Aim for >80% coverage on critical business logic

### E2E Tests with Playwright

- **Location**: `tests/e2e/**/*.spec.ts`
- **Command**: `pnpm test:e2e`
- **Focus**: User workflows, authentication flows, critical user journeys
- **Browsers**: Chromium (primary), Firefox and Safari for cross-browser testing

## Testing Patterns

### Authentication Testing

```typescript
// Use test users created through Better Auth API
const testUsers = {
  coach: { email: 'coach@test.local', password: 'Test123!' },
  runner: { email: 'runner@test.local', password: 'Test123!' },
}

// Sign in through Better Auth endpoints
await page.goto('/auth/signin')
await page.fill('[data-testid="email"]', testUsers.coach.email)
await page.fill('[data-testid="password"]', testUsers.coach.password)
await page.click('[data-testid="signin-button"]')
```

### Database Testing

- Use isolated test database for E2E tests
- Seed with minimal realistic data
- Clean up between test runs
- Use transactions for unit tests when possible

### Component Testing

```typescript
// Test component behavior, not implementation details
test('workout card displays correct information', async () => {
  const workout = { title: 'Morning Run', duration: 60 }
  render(<WorkoutCard workout={workout} />)

  expect(screen.getByText('Morning Run')).toBeInTheDocument()
  expect(screen.getByText('60 min')).toBeInTheDocument()
})
```

## Test Organization

### Critical Test Categories

1. **Authentication**: Sign in/out, role-based access, session handling
2. **Coach-Runner Relationships**: Invitations, connections, permissions
3. **Training Plans**: Creation, assignment, modification
4. **Workouts**: Logging, completion, performance tracking
5. **Real-time Features**: Messaging, notifications, live updates

### Test Data Management

- Use factories or builders for test data creation
- Keep test data minimal but realistic
- Use deterministic data (avoid random values)
- Clean up test data between runs

## CI/CD Testing

### GitHub Actions Integration

- Run unit tests on every PR
- Run E2E tests on main branch and PRs
- Fail build on test failures
- Generate test reports and screenshots on failure

### Test Environment

- PostgreSQL container for database tests
- Environment variables for test configuration
- Better Auth secret for authentication tests
- Isolated test data and user accounts

## Performance Testing Considerations

### Load Testing

- Test critical user flows under load
- Monitor database query performance
- Test real-time features with multiple users
- Validate memory usage and cleanup

### Browser Performance

- Test on various device sizes and types
- Monitor Core Web Vitals
- Test with slow network conditions
- Validate accessibility compliance

## Test Debugging

### Common Issues

- **Race conditions**: Use proper waits instead of arbitrary timeouts
- **Flaky tests**: Ensure deterministic test data and stable selectors
- **Authentication issues**: Verify test user creation and session management
- **Database state**: Ensure proper cleanup between tests

### Debugging Tools

- Playwright test debug mode: `npx playwright test --debug`
- Test screenshots and videos on failure
- Browser console logs and network requests
- Database query logging for slow tests
