# Better Auth Custom Fields & Session Management

> Documentation stored from Context7 MCP on 2025-08-03

## Key Patterns for UltraCoach

### 1. Adding Custom Fields to User Schema

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'runner',
        input: true, // Allow setting during sign-up
        output: true, // Include in responses
      },
      fullName: {
        type: 'string',
        required: false,
        input: true,
        output: true,
      },
    },
  },
})
```

### 2. Custom Session Plugin for Proper Type Inference

```typescript
import { customSession } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    customSession(async ({ user, session }) => {
      return {
        user: {
          ...user,
          role: (user.role as 'runner' | 'coach') || 'runner',
        },
        session,
      }
    }),
  ],
})
```

### 3. Client-Side Custom Session Inference

```typescript
import { customSessionClient } from 'better-auth/client/plugins'

import type { auth } from '@/lib/auth'

const authClient = createAuthClient({
  plugins: [
    customSessionClient<typeof auth>(), // Enable type inference
  ],
})
```

### 4. Best Practices for User Creation

**❌ Don't manually insert users:**

```typescript
// DON'T DO THIS - bypasses Better Auth validation
await db.insert(schema.user).values({
  email: 'user@example.com',
  password: hashedPassword, // Manual hashing
  role: 'coach',
})
```

**✅ Use Better Auth sign-up API:**

```typescript
// DO THIS - uses Better Auth's proper flow
const response = await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'User Name',
    role: 'coach', // Custom field
    fullName: 'Full User Name', // Another custom field
  }),
})
```

### 5. Role-Based Routing Pattern

```typescript
// ❌ Circular redirects (causes infinite loops)
if (userRole !== 'runner') {
  router.push('/dashboard/coach'); // Could redirect back
}

// ✅ Unified router with proper logic
const DashboardRouter = () => {
  const { data: session, status } = useSession();

  // Handle loading states
  if (status === 'loading') return <LoadingSpinner />;

  // Handle auth states
  if (!session) {
    router.push('/auth/signin');
    return;
  }

  // Handle invalid roles gracefully
  const userRole = session.user.role;
  if (!userRole || !['coach', 'runner'].includes(userRole)) {
    return <FallbackDashboard />;
  }

  // Render appropriate dashboard
  return userRole === 'coach' ? <CoachDashboard /> : <RunnerDashboard />;
};
```

## Database Schema Considerations

### Table Naming Conventions

Better Auth expects specific table names:

- `user` (not `better_auth_users`)
- `account`
- `session`
- `verification`

### Field Naming

- Use camelCase in TypeScript schemas
- Use snake_case in actual database
- Drizzle handles the mapping automatically

```typescript
// Drizzle schema (camelCase)
export const user = pgTable('user', {
  fullName: text('full_name'), // Maps to snake_case
  role: text('role').default('runner'),
})
```

## Common Issues & Solutions

### Issue: "User not found" errors

**Solution**: Use Better Auth sign-up API instead of manual insertion

### Issue: Circular routing redirects

**Solution**: Implement unified dashboard router with proper state handling

### Issue: Custom fields not typed on client

**Solution**: Use `customSessionClient<typeof auth>()` plugin

### Issue: Role field shows as 'user' instead of 'coach'/'runner'

**Solution**: Update existing data and ensure sign-up process sets correct roles

## References

- Better Auth Custom Fields: https://better-auth.com/docs/concepts/database#extend-core-schema-with-additional-fields
- Custom Session Plugin: https://better-auth.com/docs/concepts/session-management#custom-session-plugin
- TypeScript Integration: https://better-auth.com/docs/concepts/typescript#infer-additional-fields
