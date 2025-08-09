# Authentication Route Patterns for Next.js 15 App Router

## 🔐 Overview

This document provides comprehensive patterns for implementing authenticated routes in Next.js 15 App Router with Better Auth, ensuring proper Server/Client Component architecture and dynamic rendering.

## 🏗️ Architecture Patterns

### 1. Server/Client Component Hybrid Pattern (Recommended)

**Structure:**

- **Server Component** (`page.tsx`): Handles authentication, forces dynamic rendering
- **Client Component** (`*Client.tsx`): Handles interactivity and client-side state

```typescript
// app/authenticated-route/page.tsx (Server Component)
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AuthenticatedClient from './AuthenticatedClient'
import { getServerSession } from '@/utils/auth-server'

export default async function AuthenticatedRoute() {
  // Force dynamic rendering
  await headers()

  // Server-side authentication check
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Pass authenticated data to Client Component
  return (
    <AuthenticatedClient
      user={session.user}
      initialData={session}
    />
  )
}
```

```typescript
// app/authenticated-route/AuthenticatedClient.tsx (Client Component)
'use client'

import { useSession } from '@/hooks/useBetterSession'
import { useEffect } from 'react'

interface Props {
  user: User
  initialData: Session
}

export default function AuthenticatedClient({ user, initialData }: Props) {
  // Client-side session management
  const { data: clientSession } = useSession()

  // Client-side interactivity
  // State management with Jotai
  // Event handlers
  // Real-time updates

  return (
    <div>
      {/* Interactive UI components */}
    </div>
  )
}
```

### 2. Server-Side Session Utility

```typescript
// utils/auth-server.ts
import { headers } from 'next/headers'

import { auth } from '@/lib/better-auth'

export async function getServerSession() {
  // Force dynamic rendering
  const headersList = await headers()

  try {
    // Better Auth server-side session retrieval
    const session = await auth.api.getSession({
      headers: headersList,
    })

    return session?.data || null
  } catch (error) {
    console.error('Server session error:', error)
    return null
  }
}

export async function requireAuth() {
  const session = await getServerSession()

  if (!session) {
    throw new Error('Authentication required')
  }

  return session
}
```

### 3. Role-Based Route Protection

```typescript
// utils/auth-guards.ts
import { redirect } from 'next/navigation'

import { getServerSession } from './auth-server'

export async function requireRole(role: 'coach' | 'runner') {
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role !== role) {
    redirect('/dashboard') // Redirect to default dashboard
  }

  return session
}

export async function requireCoach() {
  return requireRole('coach')
}

export async function requireRunner() {
  return requireRole('runner')
}
```

### 4. UltraCoach-Specific Route Patterns

#### Chat Routes

```typescript
// app/chat/page.tsx
import { headers } from 'next/headers'
import { getServerSession } from '@/utils/auth-server'
import { redirect } from 'next/navigation'
import ChatPageClient from './ChatPageClient'

export default async function ChatPage() {
  await headers() // Force dynamic rendering

  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <ChatPageClient user={session.user} />
}
```

```typescript
// app/chat/[userId]/page.tsx
import { headers } from 'next/headers'
import { getServerSession } from '@/utils/auth-server'
import { redirect, notFound } from 'next/navigation'
import ChatUserClient from './ChatUserClient'

interface Props {
  params: { userId: string }
}

export default async function ChatUserPage({ params }: Props) {
  await headers() // Force dynamic rendering

  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Server-side recipient validation
  const recipient = await getRecipientById(params.userId)

  if (!recipient) {
    notFound()
  }

  // Verify user has permission to chat with this recipient
  const canChat = await verifyConversationPermission(session.user.id, params.userId)

  if (!canChat) {
    redirect('/chat')
  }

  return (
    <ChatUserClient
      currentUser={session.user}
      recipient={recipient}
      conversationId={params.userId}
    />
  )
}
```

#### Dashboard Routes

```typescript
// app/dashboard/coach/page.tsx
import { requireCoach } from '@/utils/auth-guards'
import CoachDashboardClient from './CoachDashboardClient'

export default async function CoachDashboardPage() {
  const session = await requireCoach()

  // Fetch coach-specific data server-side
  const runners = await getConnectedRunners(session.user.id)
  const recentActivity = await getRecentActivity(session.user.id)

  return (
    <CoachDashboardClient
      coach={session.user}
      initialRunners={runners}
      initialActivity={recentActivity}
    />
  )
}
```

```typescript
// app/dashboard/runner/page.tsx
import { requireRunner } from '@/utils/auth-guards'
import RunnerDashboardClient from './RunnerDashboardClient'

export default async function RunnerDashboardPage() {
  const session = await requireRunner()

  // Fetch runner-specific data server-side
  const workouts = await getRunnerWorkouts(session.user.id)
  const trainingPlan = await getCurrentTrainingPlan(session.user.id)
  const coach = await getRunnerCoach(session.user.id)

  return (
    <RunnerDashboardClient
      runner={session.user}
      initialWorkouts={workouts}
      trainingPlan={trainingPlan}
      coach={coach}
    />
  )
}
```

## 🔄 Migration Strategy from Pure Client Components

### Step 1: Identify Routes That Need Dynamic Rendering

Routes that require dynamic rendering:

- `/chat` and `/chat/[userId]` - User-specific conversations
- `/dashboard/*` - Role-based personalized dashboards
- `/calendar` - User's workout calendar
- `/workouts` - Personal workout lists
- `/training-plans` - User's training plans
- `/profile` - User profile management

### Step 2: Convert Each Route

**Before (Pure Client Component):**

```typescript
// app/chat/page.tsx
'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Component logic...
}
```

**After (Server/Client Hybrid):**

```typescript
// app/chat/page.tsx (Server Component)
import { headers } from 'next/headers'
import { getServerSession } from '@/utils/auth-server'
import { redirect } from 'next/navigation'
import ChatPageClient from './ChatPageClient'

export default async function ChatPage() {
  await headers()
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <ChatPageClient user={session.user} />
}

// app/chat/ChatPageClient.tsx (Client Component)
'use client'

interface Props {
  user: User
}

export default function ChatPageClient({ user }: Props) {
  // Client-side logic only
  // No need for authentication checks
  // Direct access to user data
}
```

### Step 3: Update Better Auth Integration

```typescript
// lib/better-auth-server.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { headers } from 'next/headers'

export async function getAuthSession() {
  await headers() // Force dynamic rendering

  const authInstance = betterAuth({
    // Better Auth configuration
    adapter: drizzleAdapter(db, {
      provider: 'pg',
    }),
  })

  return authInstance.api.getSession()
}
```

## 🚀 Performance Optimizations

### 1. Selective Dynamic Rendering

```typescript
// Keep static parts static, make only user parts dynamic
export default async function HybridPage() {
  await headers() // Force dynamic for user content

  const session = await getServerSession()

  return (
    <div>
      {/* Static content - rendered at build time */}
      <StaticHeader />
      <StaticNavigation />

      {/* Dynamic content - rendered at request time */}
      {session ? (
        <UserDashboard user={session.user} />
      ) : (
        <GuestContent />
      )}

      {/* Static content */}
      <StaticFooter />
    </div>
  )
}
```

### 2. Parallel Data Fetching

```typescript
// Fetch multiple data sources in parallel on server
export default async function DashboardPage() {
  await headers()
  const session = await requireAuth()

  // Parallel server-side data fetching
  const [workouts, messages, notifications] = await Promise.all([
    getWorkouts(session.user.id),
    getRecentMessages(session.user.id),
    getNotifications(session.user.id)
  ])

  return (
    <DashboardClient
      user={session.user}
      initialWorkouts={workouts}
      initialMessages={messages}
      initialNotifications={notifications}
    />
  )
}
```

### 3. Streaming with Suspense

```typescript
export default async function StreamingPage() {
  await headers()
  const session = await requireAuth()

  return (
    <div>
      <UserHeader user={session.user} />

      <Suspense fallback={<WorkoutsLoading />}>
        <WorkoutsList userId={session.user.id} />
      </Suspense>

      <Suspense fallback={<MessagesLoading />}>
        <MessagesList userId={session.user.id} />
      </Suspense>
    </div>
  )
}
```

## ✅ Testing Authentication Routes

### 1. Server Component Tests

```typescript
// tests/auth-routes.test.ts
import { render } from '@testing-library/react'

import ChatPage from '../app/chat/page'

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Map()),
}))

test('redirects unauthenticated users', async () => {
  // Mock no session
  jest.mock('@/utils/auth-server', () => ({
    getServerSession: jest.fn().mockResolvedValue(null),
  }))

  // Test redirect behavior
})
```

### 2. Integration Tests

```typescript
// tests/e2e/auth-flow.test.ts
import { expect, test } from '@playwright/test'

test('authenticated chat flow', async ({ page }) => {
  // Sign in
  await page.goto('/auth/signin')
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="signin"]')

  // Navigate to chat
  await page.goto('/chat')

  // Should not redirect - should show chat interface
  await expect(page.locator('[data-testid="chat-window"]')).toBeVisible()
})
```

## 🔧 Common Issues and Solutions

### Issue 1: "headers() can only be called in Server Components"

**Problem**: Trying to use `headers()` in Client Components

**Solution**: Move `headers()` call to Server Component

```typescript
// ❌ Wrong - Client Component
'use client'
import { headers } from 'next/headers'

// ✅ Correct - Server Component
import { headers } from 'next/headers'
export default async function ServerPage() {
  await headers()
  // ...
}
```

### Issue 2: Session not available server-side

**Problem**: Better Auth session not accessible in Server Components

**Solution**: Use proper server-side session retrieval

```typescript
// ❌ Wrong
const { data: session } = useSession() // Client-only hook

// ✅ Correct
const session = await getServerSession() // Server-side function
```

### Issue 3: Infinite redirects

**Problem**: Server and client authentication checks conflicting

**Solution**: Handle authentication only server-side for initial render

```typescript
// Server Component handles auth
export default async function Page() {
  const session = await getServerSession()
  if (!session) redirect('/signin')

  return <PageClient user={session.user} />
}

// Client Component trusts server auth
export default function PageClient({ user }) {
  // No auth checks needed - user is guaranteed to exist
  return <div>Welcome {user.name}</div>
}
```

This document provides the foundation for implementing secure, performant authentication patterns in the UltraCoach application using Next.js 15 App Router best practices.
