# Weekly Planner - Next Steps for Claude Code Web

## Branch: `fix/workout-persistence-hydration`

## ✅ What's Been Completed

### 1. Removed Noisy Logger (Commit: 34565e5)

- Removed `logger.debug` call from `useHydrateWorkouts()` render path
- Cleaner console output, comprehensive logging still exists at API layer

### 2. Fixed Hydration Pattern (Commit: f916bac)

- **Problem**: `useHydrateWorkouts()` was called in parent components OUTSIDE Suspense boundaries
- **Solution**: Created `WorkoutsHydrator` component called INSIDE Suspense boundaries
- **Pattern**: Same as `DashboardRouter` - prevents parent re-renders when Suspense resolves
- **Files Modified**:
  - `src/app/weekly-planner/page.tsx`
  - `src/app/weekly-planner/[runnerId]/page.tsx`

### 3. Fixed Infinite Refresh Loop (Commit: b2a3dd8)

- **Problem**: WeeklyPlannerCalendar had infinite useEffect loop causing continuous workout refreshes
- **Root Cause**: Two problematic dependency arrays:
  1. Line 323-329: Included `refreshWorkouts` (Jotai setters are stable, should not be in deps)
  2. Line 343-419: Included `weekWorkouts.length` (effect updates `weekWorkouts` - circular dependency)
- **Solution**: Removed problematic dependencies and added ESLint disable comments
- **Files Modified**:
  - `src/components/workouts/WeeklyPlannerCalendar.tsx`
- **Result**: ONE workout refresh on mount instead of infinite loop

## ✅ All Issues Resolved!

The weekly planner workout persistence issue has been completely fixed!

## Testing the Fix

Once fixed, test by:

1. Sign in as Alex: alex.rivera@ultracoach.dev / RunnerPass2025!
2. Navigate to `/weekly-planner`
3. Check browser console - should see only ONE "Fetching workouts" message
4. Verify weekly planner loads and displays correctly
5. Add a workout, refresh the page, verify it persists

## Key Insights from Debugging

1. **Hydration Pattern**: Always call `useHydrateWorkouts()` INSIDE Suspense boundaries using a helper component
2. **DashboardRouter Pattern**: Use the `WorkoutsHydrator` pattern from `src/components/dashboard/DashboardRouter.tsx`
3. **Suspense Best Practice**: Don't call hydration hooks in parent components that render Suspense boundaries
4. **Jotai Setters**: Jotai `useSetAtom` returns stable functions - don't include them in useEffect dependencies
5. **Circular Dependencies**: If a useEffect updates state it reads, don't include that state in dependencies

## Related Files

- `src/hooks/useWorkouts.ts` - Hydration hook ✅
- `src/app/weekly-planner/page.tsx` - Coach weekly planner selection ✅
- `src/app/weekly-planner/[runnerId]/page.tsx` - Specific runner weekly view ✅
- `src/components/workouts/WeeklyPlannerCalendar.tsx` - Component with refresh loop ✅

---

_Created: 2025-11-12 22:18 PST_
_Completed: 2025-11-12 22:24 PST_
_Final Commit: b2a3dd8 - fix(weekly-planner): resolve infinite refresh loop in WeeklyPlannerCalendar_
