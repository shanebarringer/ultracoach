# Advanced Jotai Patterns for UltraCoach

## Key Patterns from Context7 Research

### 1. atomFamily for Dynamic Atoms

Create atoms dynamically based on parameters with automatic caching:

```typescript
import { atomFamily } from 'jotai/utils'

// Messages per conversation
const messagesByConversationFamily = atomFamily((conversationId: string) =>
  atomWithRefresh(async () => {
    const response = await fetch(`/api/messages?recipientId=${conversationId}`)
    return response.json()
  })
)

// Usage
const conversationAtom = messagesByConversationFamily('user-123')
```

### 2. loadable() for Better Loading States

Convert async atoms to handle loading/error states without Suspense:

```typescript
import { loadable } from 'jotai/utils'

const loadableWorkoutsAtom = loadable(workoutsAtom)

// In component:
const [workoutsLoadable] = useAtom(loadableWorkoutsAtom)
if (workoutsLoadable.state === 'loading') return <Loading />
if (workoutsLoadable.state === 'hasError') return <Error />
// workoutsLoadable.data is available
```

### 3. unwrap() for Async to Sync Conversion

```typescript
import { unwrap } from 'jotai/utils'

const unwrappedWorkoutsAtom = unwrap(asyncWorkoutsAtom, []) // fallback to []
// Now synchronous, no Suspense needed
```

### 4. Write-Only Action Atoms

Separate concerns with action-only atoms:

```typescript
const refreshWorkoutsAtom = atom(null, async (get, set) => {
  const workouts = await fetchWorkouts()
  set(workoutsAtom, workouts)
})

// Usage
const [, refreshWorkouts] = useAtom(refreshWorkoutsAtom)
```

### 5. splitAtom for Large Lists

Convert array atoms to individual item atoms:

```typescript
import { splitAtom } from 'jotai/utils'

const workoutsAtomsAtom = splitAtom(workoutsAtom)

// Each workout gets its own atom, preventing unnecessary re-renders
```

### 6. Signal-based Cancellation

Add AbortSignal support to prevent race conditions:

```typescript
const userAtom = atom(async (get, { signal }) => {
  const response = await fetch('/api/user', { signal })
  return response.json()
})
```

### 7. Performance: Component Granularity

Break down large components:

```typescript
// Instead of one component subscribing to multiple atoms
const Profile = () => {
  const [name] = useAtom(nameAtom)
  const [age] = useAtom(ageAtom) // Both re-render when either changes
}

// Split into focused components
const NameComponent = () => {
  const [name] = useAtom(nameAtom) // Only re-renders when name changes
}
const AgeComponent = () => {
  const [age] = useAtom(ageAtom) // Only re-renders when age changes
}
```

### 8. Heavy Computation Optimization

Move expensive operations out of render:

```typescript
const expensiveComputationAtom = atom(null, async (get, set) => {
  const data = get(rawDataAtom)
  const computed = heavyComputation(data) // Run once, not on every render
  set(computedDataAtom, computed)
})
```

## UltraCoach Implementation Strategy

### Phase 1: Core Data Atoms

1. Convert useWorkouts to refreshable async atom
2. Implement message atomFamily
3. Add loadable wrappers for better UX

### Phase 2: Performance

1. Split large lists with splitAtom
2. Break down components for granular subscriptions
3. Add lazy initialization for expensive atoms

### Phase 3: Advanced Features

1. Action atoms for cleaner API
2. Serialization for state backup/restore
3. Enhanced debugging with debugLabels
