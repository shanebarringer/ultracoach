# Next.js Best Practices for UltraCoach

## App Router State Management Best Practices

### 1. useEffect Dependencies and Infinite Loops

**Problem**: Maximum update depth exceeded errors occur when useEffect dependencies change on every render.

**Best Practices**:

- Always include all dependencies in useEffect dependency arrays
- Use useCallback for event handlers to prevent recreation on every render
- Avoid objects/arrays as dependencies unless wrapped in useMemo/useCallback
- Use primitive values or stable references as dependencies

```typescript
// ❌ BAD - Object recreated on every render
useEffect(() => {
  fetchData({ userId: user.id })
}, [{ userId: user.id }]) // New object every render

// ✅ GOOD - Primitive dependency
useEffect(() => {
  fetchData({ userId: user.id })
}, [user.id]) // Stable primitive value

// ✅ GOOD - Memoized object
const fetchParams = useMemo(() => ({ userId: user.id }), [user.id])
useEffect(() => {
  fetchData(fetchParams)
}, [fetchParams])
```

### 2. Client Component Data Fetching Patterns

**Best Practice**: Use proper client-side data fetching with loading states:

```typescript
'use client'

import { useState, useEffect } from 'react'

function DataComponent() {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isCancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch('/api/data')
        const result = await response.json()

        if (!isCancelled) {
          setData(result)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isCancelled = true // Cleanup to prevent state updates on unmounted component
    }
  }, [])

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>
  if (!data) return <p>No data</p>

  return <div>{/* Render data */}</div>
}
```

### 3. Proper State Management with External Libraries (Jotai)

**Best Practice**: Avoid mixing useState with external state management in components that cause re-render loops:

```typescript
// ❌ BAD - Mixing useState with atom updates
const Component = () => {
  const [localState, setLocalState] = useState()
  const [atomValue, setAtomValue] = useAtom(someAtom)

  useEffect(() => {
    // This can cause infinite loops if not careful
    setLocalState(atomValue)
    setAtomValue(someComputation(localState))
  }, [atomValue, localState]) // Dangerous circular dependency
}

// ✅ GOOD - Use atoms for shared state, useState for local UI state only
const Component = () => {
  const [atomValue, setAtomValue] = useAtom(someAtom)
  const [localUIState, setLocalUIState] = useState() // Only for component-local UI state

  useEffect(() => {
    // Only update atom based on external changes
    setAtomValue(someComputation())
  }, []) // Empty dependency or specific external trigger
}
```

### 4. Dynamic Route State Persistence

**Problem**: State resets on navigation or refresh in dynamic routes.

**Best Practice**: Use proper URL parameter handling with useParams:

```typescript
'use client'

import { useEffect } from 'react'

import { useParams, useRouter } from 'next/navigation'

export default function DynamicPage() {
  const params = useParams()
  const router = useRouter()
  const runnerId = params.runnerId as string

  useEffect(() => {
    // Use the URL parameter to set initial state
    if (runnerId) {
      // Initialize state based on URL parameter
      initializeForRunner(runnerId)
    }
  }, [runnerId])

  // Component will maintain state properly with URL-driven initialization
}
```

### 5. Data Revalidation and Cache Management

**Best Practice**: Use Next.js revalidation patterns properly:

```typescript
// Server Actions for data mutations
async function updateData() {
  'use server'

  // Update data
  await updateDatabase()

  // Revalidate specific paths
  revalidatePath('/data')
  revalidatePath('/dashboard')
}

// Client-side refresh patterns
const handleRefresh = useCallback(async () => {
  try {
    await fetchLatestData()
    // Update state through proper channels (atoms, context, etc.)
  } catch (error) {
    // Handle error
  }
}, [fetchLatestData])
```

### 6. Error Boundaries and Loading States

**Best Practice**: Implement proper error boundaries and loading states:

```typescript
// Use React Suspense with error boundaries
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner />}>
    <DataComponent />
  </Suspense>
</ErrorBoundary>

// Or manual loading states with proper cleanup
function ComponentWithLoading() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        await loadData()
      } catch (err) {
        if (mounted) setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])
}
```

## Key Issues in UltraCoach Codebase

### 1. useEffect Infinite Loops

- Components calling setState inside useEffect with changing dependencies
- Atom updates triggering component re-renders that cause more atom updates

### 2. Dynamic Route State Loss

- Weekly planner losing selected runner on refresh
- URL parameters not properly driving component state

### 3. Data Not Persisting on Refresh

- Workouts not showing on calendar after refresh
- Training plans not loading properly on page reload

### 4. Mixed State Management

- Components using both useState and Jotai atoms simultaneously
- State synchronization issues between local component state and global atoms

## Solutions Applied to UltraCoach

1. **Replace useState with Jotai atoms** for shared state
2. **Use URL parameters to drive state initialization**
3. **Implement proper useEffect cleanup and dependency management**
4. **Separate local UI state from shared application state**
5. **Add proper loading states and error boundaries**
6. **Use Next.js revalidation patterns for data freshness**
