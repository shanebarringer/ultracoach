# Jotai Async Patterns from Context7

## Advanced Async Atom Patterns

### 1. Async Atom with Signal Support

```typescript
const fetchUserAtom = atom(async (get, { signal }) => {
  const userId = get(userIdAtom)
  const response = await fetch(`/api/users/${userId}`, { signal })
  return response.json()
})
```

### 2. Chaining Async Atoms

```typescript
const userAtom = atom(async get => {
  const userId = get(userIdAtom)
  return fetchUser(userId)
})

const userPostsAtom = atom(async get => {
  const user = await get(userAtom)
  return fetchUserPosts(user.id)
})
```

### 3. Dynamic Async Switching

```typescript
const baseAtom = atom<number | Promise<number>>(0)

// Can dynamically switch between sync and async
const handleClick = () => {
  setValue(request()) // Will suspend until Promise resolves
}
```

### 4. Async Write Operations

```typescript
const asyncUpdateAtom = atom(null, async (get, set, payload) => {
  const currentData = get(dataAtom)
  const updated = await apiUpdate(currentData, payload)
  set(dataAtom, updated)
})
```

### 5. Loadable Pattern for Error Handling

```typescript
import { loadable } from 'jotai/utils'

const dataLoadableAtom = loadable(asyncDataAtom)

// In component:
const [data] = useAtom(dataLoadableAtom)
switch (data.state) {
  case 'loading': return <Spinner />
  case 'hasError': return <Error error={data.error} />
  case 'hasData': return <Data data={data.data} />
}
```

### 6. Unwrap for Sync Fallbacks

```typescript
import { unwrap } from 'jotai/utils'

// Provides fallback while async resolves
const unwrappedAtom = unwrap(asyncAtom, 'Loading...')
```

### 7. Preventing Race Conditions

```typescript
let requestId = 0

const safeAsyncAtom = atom(async (get, { signal }) => {
  const currentId = ++requestId
  const response = await fetch('/api/data', { signal })

  // Check if this is still the latest request
  if (currentId !== requestId) {
    throw new Error('Request superseded')
  }

  return response.json()
})
```

## UltraCoach Applications

### Messages System

```typescript
const messagesByConversationAtom = atomFamily((conversationId: string) =>
  atom(async (get, { signal }) => {
    const response = await fetch(`/api/messages?recipientId=${conversationId}`, { signal })
    if (!response.ok) throw new Error('Failed to fetch messages')
    return response.json()
  })
)
```

### Workouts System

```typescript
const refreshableWorkoutsAtom = atomWithRefresh(async (get, { signal }) => {
  const session = get(sessionAtom)
  if (!session?.user?.id) return []

  const response = await fetch('/api/workouts', {
    credentials: 'include',
    signal,
  })

  if (!response.ok) throw new Error('Failed to fetch workouts')
  const data = await response.json()
  return data.workouts || []
})
```

### Training Plans System

```typescript
const trainingPlanLoadableAtom = loadable(refreshableTrainingPlansAtom)

// Better UX without Suspense boundaries
const TrainingPlansComponent = () => {
  const [plansState] = useAtom(trainingPlanLoadableAtom)

  if (plansState.state === 'loading') {
    return <Skeleton />
  }

  if (plansState.state === 'hasError') {
    return <ErrorState error={plansState.error} />
  }

  return <TrainingPlansList plans={plansState.data} />
}
```
