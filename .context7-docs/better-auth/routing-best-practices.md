# Better Auth Routing & Middleware Best Practices

> Documentation stored from Context7 MCP on 2025-08-03

## Next.js Integration Patterns

### 1. Route Handler Setup

```typescript
// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth.handler)
```

### 2. Middleware for Route Protection

```typescript
// middleware.ts
import { getSessionCookie } from 'better-auth/cookies'

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)
  const { pathname } = request.nextUrl

  // Redirect authenticated users away from auth pages
  if (sessionCookie && ['/login', '/signup'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect dashboard routes
  if (!sessionCookie && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/login', '/signup'],
}
```

### 3. Role-Based Dashboard Routing

```typescript
// components/DashboardRouter.tsx
const DashboardRouter = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Get current path to avoid unnecessary redirects
    const currentPath = window.location.pathname;
    const userRole = session.user.role;

    // Only redirect if on wrong dashboard for role
    if (userRole === 'coach' && currentPath === '/dashboard/runner') {
      router.push('/dashboard/coach');
    } else if (userRole === 'runner' && currentPath === '/dashboard/coach') {
      router.push('/dashboard/runner');
    }
  }, [session, status, router]);

  // Render logic with fallbacks
  if (status === 'loading') return <LoadingState />;
  if (!session) return <RedirectingState />;

  const userRole = session.user.role;
  if (!userRole || !['coach', 'runner'].includes(userRole)) {
    return <InvalidRoleState />;
  }

  return userRole === 'coach' ? <CoachDashboard /> : <RunnerDashboard />;
};
```

## Anti-Patterns to Avoid

### ❌ Circular Redirects

```typescript
// DON'T DO THIS - causes infinite loops
const RunnerPage = () => {
  if (session.user.role !== 'runner') {
    router.push('/dashboard/coach') // Could redirect back
  }
}

const CoachPage = () => {
  if (session.user.role !== 'coach') {
    router.push('/dashboard/runner') // Could redirect back
  }
}
```

### ❌ Blocking Renders Without Loading States

```typescript
// DON'T DO THIS - causes blank screens
if (!session || session.user.role !== 'coach') {
  return null; // User sees nothing while loading
}
```

### ❌ Missing Error Boundaries

```typescript
// DON'T DO THIS - unhandled errors crash the app
const Dashboard = () => {
  const { data: session } = useSession(); // Could throw
  return <div>{session.user.name}</div>; // Could be undefined
};
```

## Best Practices

### ✅ Unified Dashboard Router

Create a single router component that handles all dashboard routing logic:

```typescript
// One component handles all dashboard routing
const DashboardRouter = () => {
  // All routing logic in one place
  // Proper error handling
  // Loading states
  // Role validation
};

// Individual pages just use the router
const RunnerPage = () => <DashboardRouter />;
const CoachPage = () => <DashboardRouter />;
```

### ✅ Proper Loading States

```typescript
const DashboardRouter = () => {
  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner />
          <span>Loading dashboard...</span>
        </div>
      </Layout>
    );
  }
};
```

### ✅ Graceful Error Handling

```typescript
const DashboardRouter = () => {
  // Handle invalid/missing roles gracefully
  if (!userRole || !['coach', 'runner'].includes(userRole)) {
    return (
      <Layout>
        <ErrorMessage>
          Your account role is not properly configured.
          Contact support if this issue persists.
        </ErrorMessage>
        <FallbackDashboard />
      </Layout>
    );
  }
};
```

### ✅ Error Boundaries

```typescript
const App = () => (
  <ErrorBoundary>
    <DashboardRouter />
  </ErrorBoundary>
);
```

## Configuration Options

### Base Path Configuration

```typescript
export const auth = betterAuth({
  basePath: '/api/auth', // Default path
  baseURL: 'https://example.com', // Production URL
})
```

### Custom Paths

```typescript
export const auth = betterAuth({
  customPaths: {
    '/sign-in': '/login', // Map Better Auth paths to custom URLs
    '/sign-up': '/register',
  },
})
```

### Trusted Origins

```typescript
export const auth = betterAuth({
  trustedOrigins: [
    'https://myapp.com',
    'https://staging.myapp.com',
    'http://localhost:3000', // Development
  ],
})
```

## Session Management

### Getting Session on Server

```typescript
// API routes
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  return Response.json({ user: session.user })
}
```

### Client-Side Session

```typescript
const { data: session, status } = useSession()

// session.user includes custom fields like 'role'
// status is 'loading' | 'authenticated' | 'unauthenticated'
```

## References

- Better Auth Next.js Integration: https://better-auth.com/docs/integrations/next
- Middleware Examples: https://better-auth.com/docs/concepts/hooks#redirect-user-from-hook
- Route Protection: https://better-auth.com/docs/integrations/next#middleware
