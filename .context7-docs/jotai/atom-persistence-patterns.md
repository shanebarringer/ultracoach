# Jotai Atom Persistence Patterns

## Key Insights for UltraCoach

### 1. Atom State Management in Development
- Jotai atoms persist in memory during development hot reloads
- Use `atomWithRefresh` for manual refresh capability
- Atoms can be reset using `RESET` symbol or by clearing atom state

### 2. Common Persistence Issues
- Atoms don't automatically reset between page refreshes in development
- State can persist even when expected to be cleared
- Need explicit mechanisms to handle session changes

### 3. Solutions for Our Training Plans Issue

#### A. Using atomWithRefresh
```typescript
import { atomWithRefresh } from 'jotai/utils'

const trainingPlansAtom = atomWithRefresh(async () => {
  const response = await fetch('/api/training-plans')
  return response.data.trainingPlans || []
})
```

#### B. Session-Based State Reset
```typescript
const sessionTrackingAtom = atom<string | null>(null)
const trainingPlansAtom = atom<TrainingPlan[]>([])

// In hook, check if session changed and reset if needed
useEffect(() => {
  if (currentSessionId !== lastSessionId) {
    setTrainingPlans([]) // Clear atom
    fetchData() // Refetch
  }
}, [sessionId])
```

#### C. Manual Refresh Pattern
```typescript
const refreshTriggerAtom = atom(0)
const trainingPlansAtom = atom(
  async (get) => {
    get(refreshTriggerAtom) // Dependency for refresh
    const response = await fetch('/api/training-plans')
    return response.data.trainingPlans || []
  }
)

// To refresh: set(refreshTriggerAtom, prev => prev + 1)
```

### 4. Best Practices
- Use `atomWithStorage` for true persistence needs
- Implement manual refresh mechanisms for data fetching atoms
- Track session changes to reset user-specific data
- Use dependency arrays in useEffect to prevent infinite loops
- Consider using `atomWithRefresh` for refreshable data atoms

### 5. Debugging Tips
- Use React DevTools with Jotai extension
- Add `debugLabel` to atoms for easier identification
- Use `useAtomsSnapshot` to see all atom states
- Check for circular dependencies in atom reads