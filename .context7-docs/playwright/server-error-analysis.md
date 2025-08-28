# Server Error Analysis - Playwright Investigation

## Client-Side Errors Detected

Based on the user's observation of "12 errors on the client", this indicates significant client-side JavaScript errors that are contributing to the dashboard rendering issues.

## Server Log Error Patterns (From Investigation)

### 1. Authentication Errors
```
2025-08-28 19:29:36.678 [ERROR] [UltraCoach:better-auth] 
2025-08-28 19:29:36.681 [ERROR] [UltraCoach:BetterAuth]
```
**Impact**: Authentication system encountering errors during session management

### 2. Strava Integration Errors  
```
2025-08-28 19:32:10.494 [ERROR] [UltraCoach:StravaActivities]
2025-08-28 19:32:10.494 [ERROR] [UltraCoach:StravaActivities]
Failed to load resource: the server responded with a status of 404 (Not Found)
```
**Impact**: Strava API endpoints failing to load, likely affecting dashboard widgets

### 3. React Component Lifecycle Errors
```
TypeError: Cannot read properties of null (reading 'removeChild')
at commitDeletionEffectsOnFiber...
```
**Impact**: React DOM manipulation failures, causing component rendering issues

### 4. Hydration Mismatch Errors
```
Error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties
```
**Impact**: Server/client rendering inconsistencies causing React to fail

## Root Cause Analysis

### Primary Issues Contributing to 12 Client Errors:

1. **Hydration Mismatches** (Multiple instances)
   - `data-insp-path` attribute differences
   - Affects every component with code inspection
   - Causes cascading React errors

2. **Missing API Endpoints** (404 Errors)
   - Strava integration endpoints not found
   - Dashboard widgets failing to load data
   - Causes React components to error during data fetching

3. **React Component Lifecycle Failures**
   - Components unable to properly mount/unmount
   - DOM manipulation errors during navigation
   - Causes dashboard to render blank or partially

4. **Better Auth Session Issues**
   - Authentication errors during session validation
   - May cause protected routes to fail loading
   - Results in redirect loops or blank pages

## Impact on Playwright Tests

### Why Tests Are Failing:
1. **Client Errors Prevent Stable State**: 12 JavaScript errors mean the page never reaches a stable state
2. **Component Mount Failures**: Dashboard components failing to render means test selectors won't exist
3. **Async Error Cascades**: One error triggers multiple subsequent errors
4. **React Error Boundaries**: May be catching errors and showing fallback content instead of expected UI

## Recommended Debugging Steps

### Immediate Actions:
1. **Open Browser DevTools** while running `pnpm dev` and navigate to `/dashboard/runner`
2. **Check Console Tab** for the specific 12 errors mentioned
3. **Check Network Tab** for failed API requests (404s, 500s)
4. **Check React DevTools** for component mounting issues

### Server-Side Error Logging:
```bash
# Filter server logs for errors
tail -f .next/trace | grep -i error

# Check for specific error types
grep -r "ERROR" .next/server/trace/
```

### Client-Side Error Capture:
```javascript
// Add to test setup to capture all client errors
window.addEventListener('error', (e) => {
  console.log('Client Error:', e.error, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.log('Unhandled Promise Rejection:', e.reason);
});
```

## Recommended Fixes (Updated)

### Priority 1: Fix Client-Side Errors
1. **Disable Code Inspector in Test**:
   ```javascript
   // next.config.js
   const nextConfig = {
     compiler: {
       removeConsole: process.env.NODE_ENV === 'test',
     },
     experimental: {
       instrumentationHook: process.env.NODE_ENV !== 'test'
     }
   }
   ```

2. **Fix Missing API Endpoints**:
   ```bash
   # Check which Strava endpoints are missing
   grep -r "api/strava" src/
   ls -la src/app/api/strava/
   ```

3. **Add Error Boundaries**:
   ```typescript
   // components/DashboardErrorBoundary.tsx
   class DashboardErrorBoundary extends React.Component {
     state = { hasError: false, errorCount: 0 }
     
     static getDerivedStateFromError(error) {
       return { hasError: true, errorCount: this.state.errorCount + 1 }
     }
     
     render() {
       if (this.state.hasError) {
         return (
           <div data-testid="dashboard-error">
             Dashboard Error (Count: {this.state.errorCount})
             <button onClick={() => this.setState({ hasError: false })}>
               Retry
             </button>
           </div>
         )
       }
       return this.props.children
     }
   }
   ```

### Priority 2: Enhanced Playwright Error Detection
```typescript
// tests/dashboard.spec.ts
test('dashboard loads without client errors', async ({ page }) => {
  const clientErrors = [];
  
  // Capture all client-side errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      clientErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    clientErrors.push(error.message);
  });
  
  await page.goto('/dashboard/runner');
  
  // Wait for page to stabilize
  await page.waitForTimeout(5000);
  
  // Assert no client errors occurred
  if (clientErrors.length > 0) {
    console.log('Client Errors Found:', clientErrors);
    throw new Error(`Found ${clientErrors.length} client errors: ${clientErrors.join(', ')}`);
  }
  
  // Verify dashboard content loaded
  await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
});
```

## Expected Resolution

Fixing the client-side errors should:
1. **Reduce error count** from 12 to 0
2. **Enable stable dashboard rendering** 
3. **Allow Playwright tests to find expected elements**
4. **Reduce test execution time** by eliminating error handling delays
5. **Provide consistent test results** instead of flaky behavior

## Next Investigation Step

The user's suggestion to examine the 12 client-side errors is crucial. Those specific errors will provide the exact root causes and guide the precise fixes needed to resolve the Playwright test issues.