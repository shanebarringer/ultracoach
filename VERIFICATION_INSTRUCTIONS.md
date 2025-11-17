# Workout Persistence Verification Instructions

## Context

We've implemented comprehensive fixes for **ULT-82** - a critical production issue where workouts were not loading in preview/production deployments despite working locally. The root causes were:

1. **Hydration Race Condition**: Components rendering before async atoms completed data fetching
2. **API Client Inconsistency**: Raw `fetch()` not reliably including credentials in production scenarios
3. **Missing Suspense Boundaries**: Weekly planner lacked proper loading states preventing proper data hydration

## Changes Implemented

### Phase 1 - Core Hydration Architecture

**File**: `src/lib/atoms/workouts.ts` (lines 47-77)

- **Change**: Replaced raw `fetch()` with axios `api.get()` for production reliability
- **Benefit**: Ensures automatic credential injection via interceptors configured in `@/lib/api-client`
- **Implementation**: Dynamic import of `api` client with structured error handling and axios-specific error parsing

**File**: `src/app/workouts/WorkoutsPageClient.tsx` (lines 46-58)

- **Change**: Moved `useHydrateWorkouts()` call inside component (not separate null-returning component)
- **Benefit**: Ensures Suspense properly waits for data before rendering component tree
- **Critical Fix**: Eliminates race condition where workouts appeared on initial load but disappeared after refresh

**File**: `src/hooks/useWorkouts.ts` (lines 25-38)

- **Change**: Implemented `useHydrateWorkouts()` using Jotai's `useHydrateAtoms` for synchronous hydration
- **Benefit**: Same pattern as BetterAuthProvider - data is guaranteed to be present before first render
- **Key**: Uses `useAtomValue(asyncWorkoutsAtom)` which triggers Suspense, then synchronously hydrates with `useHydrateAtoms`

### Phase 2 - Weekly Planner Hydration

**File**: `src/components/workouts/WeeklyPlannerCalendar.tsx` (line 277)

- **Change**: Added `useHydrateWorkouts()` call at component start before reading `workoutsAtom`
- **Benefit**: Fixes race condition where weekly planner showed empty state on refresh

**File**: `src/app/weekly-planner/[runnerId]/page.tsx` (lines 300-315)

- **Change**: Wrapped `WeeklyPlannerCalendar` in Suspense boundary with loading spinner
- **Benefit**: Provides proper loading UI while workout data is being fetched and hydrated

### Phase 3 - Critical Training Plan Selection Fix (2025-11-17)

**File**: `src/components/workouts/WeeklyPlannerCalendar.tsx` (lines 565-574)

- **Critical Bug**: Workouts being created for wrong runner when coach has multiple athletes
- **Root Cause**: `/api/training-plans` returns ALL plans for ALL connected runners, but code was taking `trainingPlans[0]` blindly
- **Evidence**: 3 workouts created for taylor.smith (plan ID: ce7d3544-acb0-46bb-938e-8d310744e5d7) when viewing alex.rivera's planner (should use plan ID: 50d19251-1fa1-4f86-a9fe-715a92a3d545)
- **Fix**: Added `.find(plan => plan.runner_id === runner.id)` to filter by current runner before using plan
- **Impact**: Prevents cross-user workout contamination and fixes "workouts disappear after refresh" symptom

**Testing**: When coach creates workouts for alex.rivera in weekly planner, verify workouts are actually created for alex.rivera (not other connected runners like taylor.smith)

### Supporting Infrastructure

**File**: `src/middleware.ts` (new cookie validation logic)

- **Change**: Added cookie pre-check optimization for session validation
- **Benefit**: Faster authentication checks with better error handling

**File**: `src/utils/auth-server.ts` (enhanced session validation)

- **Change**: Added retry logic and improved logging for server-side session validation
- **Benefit**: More resilient authentication in production environments

## Verification Steps

### Prerequisites

1. Wait for Vercel preview deployment to complete
2. Get the preview deployment URL from GitHub PR or Vercel dashboard
3. Open preview URL in browser with Chrome DevTools open (F12)

### Test 1: Workouts Page - Initial Load

**Goal**: Verify workouts load on first page visit

1. Navigate to `[preview-url]/auth/signin`
2. Sign in with test runner credentials:
   - Email: `alex.rivera@ultracoach.dev`
   - Password: `SecurePass123!`
3. Navigate to `[preview-url]/workouts`
4. **Expected Result**:
   - Loading skeleton appears briefly
   - Workouts list renders (may be empty if no workouts exist)
   - No console errors in DevTools
5. **Check DevTools Console**:
   - Should see: `[AsyncWorkoutsAtom] Fetching workouts...`
   - Should see: `[AsyncWorkoutsAtom] Workouts fetched successfully`
   - Should NOT see: `Failed to parse URL` error

### Test 2: Add Workouts

**Goal**: Create test data for persistence testing

1. Click "New Workout" button
2. Fill in workout details:
   - Title: "Test Workout 1"
   - Type: "Long Run"
   - Date: Today's date
   - Distance: 10 miles
3. Save workout
4. Repeat to create "Test Workout 2" and "Test Workout 3"
5. **Expected Result**:
   - All workouts appear in the list
   - No errors in console

### Test 3: Workouts Page - Refresh Persistence (⚠️ CRITICAL)

**Goal**: Verify workouts persist after page refresh - **THIS WAS THE MAIN BUG**

1. With workouts visible, press `Cmd+R` (Mac) or `Ctrl+R` (Windows) to hard refresh
2. **Expected Result**:
   - Loading skeleton appears briefly
   - All three test workouts remain visible after refresh
   - Workouts load in same order/state as before refresh
   - **NO EMPTY STATE** - this was the bug symptom
3. **Check DevTools Network Tab**:
   - Should see successful `GET /api/workouts` request with 200 status
   - Response should contain all workouts in JSON format
4. **Check DevTools Console**:
   - Should see: `[useWorkouts] Hydrating workouts atom from async data { count: 3 }`
   - Should see: `[AsyncWorkoutsAtom] Fetching workouts...`
   - Should see: `[AsyncWorkoutsAtom] Workouts fetched successfully { count: 3 }`

### Test 4: Weekly Planner - Initial Load

**Goal**: Verify weekly planner hydration works

1. Navigate to `[preview-url]/weekly-planner/[your-runner-id]`
   - You can get runner ID from the URL after selecting a runner in dashboard
   - Or use the runner ID from test credentials (visible in network requests)
2. **Expected Result**:
   - Loading spinner appears with text "Loading weekly workouts..."
   - Calendar renders with 7-day cards
   - If workouts exist for this week, they appear in appropriate day cards

### Test 5: Weekly Planner - Refresh Persistence (⚠️ CRITICAL)

**Goal**: Verify weekly planner workouts persist after refresh

1. Create a workout scheduled for today or this week (if none exists)
2. Navigate to weekly planner and verify the workout appears in the correct day card
3. Press `Cmd+R` or `Ctrl+R` to hard refresh
4. **Expected Result**:
   - Loading spinner appears briefly
   - Calendar re-renders with all workouts in correct day cards
   - No loss of workout data
   - **NO EMPTY CALENDAR** - this was the bug symptom
5. **Check DevTools Console**:
   - Should see: `[useWorkouts] Hydrating workouts atom from async data { count: X }`
   - Should NOT see empty count: `{ count: 0 }` if workouts exist

### Test 6: Coach Account Verification (Optional)

**Goal**: Verify fixes work for coach role

1. Sign out and sign in with coach credentials:
   - Email: `emma@ultracoach.dev`
   - Password: `SecurePass123!`
2. Navigate to `/workouts`
3. Select a runner from dropdown (if any connected)
4. Verify workouts load and persist through refresh

## Success Criteria

✅ **All tests must pass**:

- Initial load shows loading skeleton → data appears
- Page refresh maintains data (no empty state after refresh)
- No `Failed to parse URL` errors in console
- Network requests show 200 status with valid JSON responses
- Console logs show successful workout fetch with correct counts
- Weekly planner shows workouts in correct day cards
- Weekly planner workouts persist through page refresh

## Failure Scenarios & Troubleshooting

### Scenario 1: Workouts Load Initially But Disappear After Refresh

**Symptoms**:

- Initial load works fine
- After refresh: Empty state or "No workouts found"
- Console shows: `{ count: 0 }` despite workouts existing in database

**Root Cause**: Hydration timing issue still present or axios client not configured correctly

**Debug Steps**:

1. During refresh, inspect the Network tab - is `/api/workouts` being called?
2. Verify the response contains data or empty array `{ workouts: [] }`
3. Look for errors in console: `Failed to parse URL from /api/workouts`
4. If error present, axios may need baseURL configuration
5. Check if cookies are being sent with request (see request headers)

**Report Back**:

```
ISSUE: Workouts disappear after refresh
Network request status: [Success/Fail] [Status Code]
Response body: [Empty array / Contains data]
Console errors: [List any errors]
Cookie header present: [Yes/No]
```

### Scenario 2: "Failed to parse URL" Error

**Symptoms**:

- Console error: `TypeError: Failed to parse URL from /api/workouts`
- Empty workout list even though data exists

**Root Cause**: Axios can't handle relative URLs in server-side context

**Solution Needed**: Add baseURL configuration to axios for SSR context

**Report Back**:

```
ISSUE: Failed to parse URL error
Context: [Client-side / Server-side rendering]
Full error stack: [Copy from console]
Browser: [Chrome / Firefox / Safari]
```

### Scenario 3: 401 Unauthorized Errors

**Symptoms**:

- Network tab shows `/api/workouts` with 401 status
- Console: "Unauthorized - user session expired or invalid"

**Root Cause**: Cookie not being sent with request

**Debug Steps**:

1. In the Network tab, review Request Headers
2. Look for `Cookie:` header - is it present?
3. Navigate to the Application tab and verify cookies are present
4. Confirm the cookie domain matches (localhost or your deployment domain)
5. Verify the `SameSite` attribute is set to Lax or Strict

**Report Back**:

```
ISSUE: 401 Unauthorized
Cookies present in Application tab: [Yes/No]
Cookie header in request: [Yes/No]
Session cookie name: [Copy from Application tab]
Cookie domain: [Copy from Application tab]
Deployment URL: [Preview URL]
```

### Scenario 4: Infinite Loading State

**Symptoms**:

- Loading skeleton never resolves
- Data never appears
- No errors in console

**Root Cause**: Suspense boundary never resolves - promise may be rejecting silently

**Debug Steps**:

1. Check console for any async errors
2. Check Network tab - are requests completing?
3. Look for promise rejections in console
4. Check if `asyncWorkoutsAtom` is throwing an error that's being swallowed

**Report Back**:

```
ISSUE: Infinite loading
Network requests: [Complete/Pending/Failed]
Request status: [200/401/500/etc]
Console warnings: [List any]
Time waited: [Seconds]
Response data: [Empty/Has data]
```

### Scenario 5: Workouts Load But Wrong User's Data

**Symptoms**:

- Workouts appear but belong to different user
- Data changes when switching accounts
- Cache not clearing between users

**Root Cause**: User-specific cache not invalidating correctly

**Debug Steps**:

1. Sign in as User A, create workout
2. Sign out, sign in as User B
3. Check if User A's workout appears for User B
4. Check console logs for cache operations

**Report Back**:

```
ISSUE: Wrong user's data displayed
User A email: [Email]
User B email: [Email]
Workouts shown for User B: [Describe]
Console logs: [Copy cache-related logs]
```

## Deployment Information

**Branch**: `fix/workout-persistence-suspense`
**Latest Commit**: `bfa1112` (fix(workouts): comprehensive hydration and API client fixes)
**PR URL**: Will be available at https://github.com/shanebarringer/ultracoach/pull/169
**Preview URL**: Check GitHub PR or Vercel dashboard after deployment completes

## Files Changed

1. `src/lib/atoms/workouts.ts` - Axios integration and error handling
2. `src/app/workouts/WorkoutsPageClient.tsx` - Hydration timing fix
3. `src/hooks/useWorkouts.ts` - useHydrateWorkouts implementation
4. `src/components/workouts/WeeklyPlannerCalendar.tsx` - Added hydration call
5. `src/app/weekly-planner/[runnerId]/page.tsx` - Added Suspense boundary
6. `src/middleware.ts` - Cookie validation optimization
7. `src/utils/auth-server.ts` - Enhanced session validation
8. `src/app/calendar/CalendarPageClient.tsx` - Calendar hydration improvements
9. `src/providers/BetterAuthProvider.tsx` - Provider optimization
10. `tests/e2e/workout-management.spec.ts` - Updated tests

## Technical Details

### How Hydration Works Now

**Before (Broken)**:

```typescript
// Separate null-returning component
function WorkoutsHydrator() {
  useHydrateWorkouts()
  return null // Returns immediately! ❌
}

// Component renders before hydration completes
function WorkoutsPageClientInner() {
  const workouts = useAtomValue(workoutsAtom) // May be empty! ❌
}
```

**After (Fixed)**:

```typescript
function WorkoutsPageClientInner() {
  // Call BEFORE reading atom - triggers Suspense ✅
  useHydrateWorkouts()

  // Now safe - hydration guaranteed to complete first ✅
  const workouts = useAtomValue(workoutsAtom)
}
```

### Why Axios Instead of Fetch

**Problem with raw fetch()**:

- In some production scenarios, cookies may not be included automatically
- Requires manual `credentials: 'same-origin'` configuration on every call
- No built-in retry logic for transient failures
- Inconsistent error handling

**Benefits of axios**:

- Automatic credential injection via interceptors configured globally
- Consistent header management across all requests
- Production-tested with preview deployments
- Better error handling with structured error responses
- Request/response interceptors for logging and debugging

### useHydrateAtoms Pattern

```typescript
export function useHydrateWorkouts() {
  // This will trigger Suspense if data not loaded
  const asyncWorkouts = useAtomValue(asyncWorkoutsAtom)

  // Synchronously hydrate BEFORE first render
  // Same pattern as BetterAuthProvider - prevents race condition
  useHydrateAtoms([[workoutsAtom, asyncWorkouts ?? []]])

  return asyncWorkouts
}
```

**Key Points**:

1. `useAtomValue(asyncWorkoutsAtom)` triggers Suspense if promise not resolved
2. `useHydrateAtoms` runs synchronously before component renders
3. This guarantees `workoutsAtom` is populated before any child component reads it
4. Eliminates race condition where component rendered before data arrived

## What to Report Back

After completing all tests, provide:

1. **Overall Status**: ✅ All tests passed / ❌ Issues found
2. **Test Results**: For each test (1-6), mark ✅ Pass or ❌ Fail
3. **Console Logs**: Copy relevant logs showing fetch operations
4. **Network Evidence**: Screenshots of successful `/api/workouts` requests showing:
   - Request headers (especially Cookie header)
   - Response body with workout data
   - Status code (should be 200)
5. **Issues Encountered**: Use failure scenario templates above if any tests fail

## Example Successful Test Report

```
VERIFICATION COMPLETE ✅

Test 1: Workouts Page - Initial Load ✅ PASS
- Loading skeleton appeared
- 3 workouts displayed
- Console: "Workouts fetched successfully { count: 3 }"

Test 2: Add Workouts ✅ PASS
- Created 3 test workouts successfully
- All appeared in list immediately

Test 3: Workouts Page - Refresh Persistence ✅ PASS
- Hard refresh completed
- All 3 workouts remained visible
- Console: "Hydrating workouts atom from async data { count: 3 }"
- Network: GET /api/workouts returned 200 with data

Test 4: Weekly Planner - Initial Load ✅ PASS
- Loading spinner appeared
- Calendar rendered with today's workout in correct day

Test 5: Weekly Planner - Refresh Persistence ✅ PASS
- Hard refresh completed
- Workout remained in correct day card
- No empty calendar state

Test 6: Coach Account Verification ✅ PASS
- Coach login successful
- Runner selection worked
- Workouts persisted through refresh

Network Evidence:
- Request: GET https://preview-url/api/workouts
- Status: 200 OK
- Cookie header: present
- Response: { workouts: [{...}, {...}, {...}] }

Console Logs:
[useWorkouts] Hydrating workouts atom from async data { count: 3 }
[AsyncWorkoutsAtom] Fetching workouts...
[AsyncWorkoutsAtom] Workouts fetched successfully { count: 3 }

OVERALL: All tests passed ✅
No issues encountered
Production deployment recommended
```

## Next Steps After Verification

### If All Tests Pass ✅

1. Update this PR with verification results
2. Update Linear issue ULT-82 with "Fixed - Verified in Preview"
3. Request code review from team
4. Merge to main after approval
5. Deploy to production
6. Monitor production logs for any issues

### If Tests Fail ❌

1. Document exact failure using templates above
2. Provide console logs and network screenshots
3. Note which specific test failed and how
4. Add comment to PR with findings
5. Development team will investigate and implement additional fixes
6. Re-run verification after fixes deployed

---

**Last Updated**: 2025-11-16
**Issue**: ULT-82
**Branch**: `fix/workout-persistence-suspense`
**Status**: Ready for Preview Verification
