# Next.js Best Practices for UltraCoach

## 🎯 Static vs Dynamic Rendering (CRITICAL)

### Understanding the Problem

**Issue**: Routes like `/chat` are being marked as "static" when they should be dynamic for personalized content.

**Next.js Behavior**: By default, Next.js App Router tries to statically render routes at build time for performance. However, personalized routes (authentication-dependent, user-specific data) MUST be dynamically rendered.

### When Routes Are Static vs Dynamic

#### Static Rendering (Default)

- HTML generated at build time or during revalidation
- Cached and shared across all users
- No access to request-specific data (cookies, headers, user sessions)
- ⚠️ **Problem**: User-specific content shows stale or incorrect data

#### Dynamic Rendering (Required for UltraCoach)

- HTML generated at request time
- Personalized content based on user session
- Access to cookies, headers, and user-specific data
- ✅ **Solution**: Proper authentication and personalized experiences

### How to Force Dynamic Rendering

#### Method 1: Using `headers()` Function (Recommended)

```typescript
// app/chat/page.tsx (Server Component)
import { headers } from 'next/headers'
import ChatPageClient from './ChatPageClient'

// This Server Component forces dynamic rendering
export default async function ChatPage() {
  // Force dynamic rendering by accessing headers
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')

  // You can also check authentication here
  // const session = await getServerSession()

  return (
    <ChatPageClient
      userAgent={userAgent}
      // session={session}
    />
  )
}
```

```typescript
// app/chat/ChatPageClient.tsx (Client Component)
'use client'

import { useSession } from '@/hooks/useBetterSession'

// app/chat/ChatPageClient.tsx (Client Component)

// app/chat/ChatPageClient.tsx (Client Component)

// app/chat/ChatPageClient.tsx (Client Component)

interface Props {
  userAgent?: string | null
}

export default function ChatPageClient({ userAgent }: Props) {
  const { data: session, status } = useSession()

  // Client-side interactivity and state management
  // ...
}
```

#### Method 2: Using `cookies()` Function

```typescript
// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  // Force dynamic rendering by accessing cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  return <DashboardClient sessionCookie={sessionCookie} />
}
```

#### Method 3: Using `fetch()` with `no-store`

```typescript
// app/profile/page.tsx
export default async function ProfilePage() {
  // Force dynamic rendering with uncached fetch
  const userProfile = await fetch('/api/user/profile', {
    cache: 'no-store' // This forces dynamic rendering
  })

  return <ProfileClient data={userProfile} />
}
```

### UltraCoach-Specific Solutions

#### Problem Routes That Need Fixing

1. **`/chat` and `/chat/[userId]`**: Currently marked as static
   - **Issue**: User conversations not loading, personalized content missing
   - **Solution**: Add Server Component wrapper with `headers()` or `cookies()`

2. **`/dashboard/coach` and `/dashboard/runner`**: Role-based routing issues
   - **Issue**: Static rendering can't determine user role at build time
   - **Solution**: Server Component checks user session, passes role to Client Component

3. **`/calendar`, `/workouts`, `/training-plans`**: User-specific data not loading
   - **Issue**: Personalized data requires dynamic rendering
   - **Solution**: Force dynamic rendering at page level

#### Recommended Architecture Pattern

```
app/
├── chat/
│   ├── page.tsx              # Server Component (forces dynamic)
│   ├── ChatPageClient.tsx    # Client Component (interactive)
│   └── [userId]/
│       ├── page.tsx          # Server Component (forces dynamic)
│       └── ChatUserClient.tsx # Client Component (interactive)
└── dashboard/
    ├── coach/
    │   ├── page.tsx          # Server Component (forces dynamic)
    │   └── CoachClient.tsx   # Client Component (interactive)
    └── runner/
        ├── page.tsx          # Server Component (forces dynamic)
        └── RunnerClient.tsx  # Client Component (interactive)
```

### Authentication Integration with Better Auth

```typescript
// utils/auth-server.ts
import { headers } from 'next/headers'

import { auth } from '@/lib/better-auth'

export async function getServerSession() {
  // Force dynamic rendering
  await headers()

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    return session
  } catch (error) {
    return null
  }
}
```

```typescript
// app/protected-route/page.tsx
import { getServerSession } from '@/utils/auth-server'
import { redirect } from 'next/navigation'
import ProtectedClient from './ProtectedClient'

export default async function ProtectedPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <ProtectedClient session={session} />
}
```

### Production vs Development Rendering Issues

#### Common Problems

1. **Environment Variable Loading**: Production may handle environment variables differently
2. **Session Cookie Configuration**: Secure cookies in production vs development
3. **Database Connection Pooling**: Different connection patterns can affect rendering
4. **CDN/Edge Caching**: Production deployments may cache static content aggressively

#### Solutions

1. **Consistent Environment Variables**: Use same `.env` structure for dev and production
2. **Force Dynamic Rendering**: Use the patterns above in ALL user-specific routes
3. **Proper Session Configuration**: Ensure Better Auth works identically in both environments
4. **Cache Headers**: Set proper cache headers for dynamic routes

```typescript
// app/api/user-specific/route.ts
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  })
}
```

### Migration Checklist for UltraCoach

- [ ] Convert `/chat/page.tsx` to Server/Client pattern
- [ ] Convert `/chat/[userId]/page.tsx` to Server/Client pattern
- [ ] Convert dashboard routes to Server/Client pattern
- [ ] Add `headers()` or `cookies()` to all authenticated routes
- [ ] Test production deployment matches local behavior
- [ ] Update authentication flow to work with Server Components
- [ ] Verify all personalized content renders dynamically

### Performance Considerations

**Static Rendering Benefits** (Lost when going dynamic):

- Faster initial page loads
- Better SEO
- CDN caching

**Dynamic Rendering Benefits** (Required for UltraCoach):

- Personalized content
- Real-time data
- Authentication-dependent features
- User-specific state

**Hybrid Approach** (Recommended):

- Keep marketing pages static (`/`, `/about`, `/pricing`)
- Make app pages dynamic (`/chat`, `/dashboard`, `/calendar`)
- Use Suspense boundaries for progressive loading

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
