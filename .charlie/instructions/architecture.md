# UltraCoach Architecture Patterns

## Next.js 15 Server/Client Component Pattern

**CRITICAL**: All authenticated routes MUST use the hybrid Server/Client pattern to ensure dynamic rendering.

### Required Server Component Pattern

```typescript
// page.tsx (Server Component) - Forces dynamic rendering
import { headers } from 'next/headers'
import { getServerSession } from '@/utils/auth-server'
import { redirect } from 'next/navigation'
import PageClient from './PageClient'

export default async function AuthenticatedPage() {
  await headers() // 🔑 CRITICAL: Forces dynamic rendering

  const session = await getServerSession()
  if (!session) redirect('/auth/signin')

  return <PageClient user={session.user} />
}
```

### Required Client Component Pattern

```typescript
// PageClient.tsx (Client Component) - Handles interactivity
'use client'

export default function PageClient({ user }) {
  // Client-side state management and interactivity
  // Use Jotai atoms for state management
  // Handle user interactions and real-time updates
}
```

## Routes That MUST Be Dynamic

- `/chat` and `/chat/[userId]` - User conversations
- `/dashboard/coach` and `/dashboard/runner` - Role-based dashboards
- `/calendar` - User workout calendar
- `/workouts` - Personal workouts
- `/training-plans` - User training plans
- `/profile` - User profile

## State Management with Jotai

### Atom Patterns

- Use atomic state management for granular updates
- Prefer derived atoms over duplicated state
- Use `atomFamily` for dynamic collections
- Use `splitAtom` for list optimization

### Performance Patterns

- Use `React.memo` for expensive components
- Implement proper loading states with Suspense
- Use skeleton components instead of basic spinners

## Authentication Architecture

### Better Auth Integration

- Use `customSession` plugin for proper session data transformation
- Store role as `'user'` (Better Auth standard)
- Use `userType` field for coach/runner differentiation
- Always filter API queries by `user.userType`

### Session Management

```typescript
// Server-side session access
const session = await getServerSession()

// Client-side session access (Better Auth pattern)
import { useBetterSession } from '@/hooks/useBetterSession'

const { session, user, loading } = useBetterSession()

// Handle loading and unauthenticated states
if (loading) return <LoadingSkeleton />
if (!session) return <SignInPrompt />

// Alternative: Use compatibility hook for NextAuth-style API
import { useSession } from '@/hooks/useBetterSession'

const { data: session, status } = useSession()
if (status === 'loading') return <LoadingSkeleton />
if (status === 'unauthenticated') return <SignInPrompt />
```

## API Patterns & Data Fetching

### CRITICAL: Data Fetching Strategy

**Server Components (Anti-Pattern Alert)**

- **NEVER** fetch your own API routes from Server Components
- This creates unnecessary HTTP overhead and complexity
- Server Components should call database/services directly
- Use Server Components only for authentication and initial data

**Client Components (Correct Pattern)**

```typescript
// ✅ CORRECT - Client Component fetching from API
'use client'
const response = await fetch('/api/workouts', {
  credentials: 'same-origin', // For internal APIs
})
```

**Server Components (Correct Pattern)**

```typescript
// ✅ CORRECT - Server Component calling service directly
import { db } from '@/lib/database'
import { getServerSession } from '@/utils/auth-server'

export default async function Page() {
  const session = await getServerSession()
  const workouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, session.user.id)
  })
  return <PageClient initialData={workouts} />
}
```

### URL Strategy

**Client-Side Code**

- Use relative URLs (`/api/...`) for internal APIs
- Always include `credentials: 'same-origin'`
- Jotai atoms handle browser detection automatically

**Server-Side Code**

- Don't fetch from API routes - call services directly
- If absolute URLs are needed (e.g., for external services), use environment variables
- Better Auth handles base URLs intelligently with VERCEL_URL

### Fetch Configuration

- Always use `credentials: 'same-origin'` for internal APIs
- Use relative URLs in Client Components
- Implement consistent error handling
- Use axios interceptors for authentication (future migration)

### Route Structure

```
/api/
├── auth/           # Better Auth routes
├── workouts/       # Workout CRUD operations
├── training-plans/ # Training plan management
├── messages/       # Real-time messaging
└── strava/         # Strava integration
```

## Component Architecture

### File Organization

```
src/
├── app/                    # Next.js app router pages
│   └── dashboard/
│       ├── page.tsx        # Server component
│       └── DashboardClient.tsx # Client component
├── components/             # Reusable components
│   ├── ui/                # Base UI components
│   └── features/          # Feature-specific components
└── lib/
    ├── atoms.ts           # Jotai state atoms
    ├── better-auth.ts     # Auth configuration
    └── supabase.ts        # Database client
```

## Design System

### HeroUI Integration

- Use HeroUI components as base building blocks
- Apply Mountain Peak theme for alpine aesthetics
- Implement consistent spacing and typography
- Use custom color palette for branding

### Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Touch-optimized interactions for mobile
- Proper accessibility with WCAG compliance
