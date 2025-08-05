# Better Auth - Password Hashing and User Creation

## Admin API User Creation

Better Auth provides an Admin API that properly handles password hashing internally:

```typescript
// Admin API: Create User (POST /admin/create-user)
await authClient.admin.createUser({
  email: 'new.user@example.com',
  password: 'securePassword123',
  name: 'Alice Wonderland',
  role: ['user', 'editor'],
  data: { customField: 'customValue' }, // Additional fields
})
```

## Password Hashing Configuration

Better Auth has built-in password hashing utilities:

```typescript
// Context password utilities
ctx.context.password.hash(password: string): Promise<string>
  - Description: Hashes a given plain-text password using a secure algorithm.
  - Returns: A Promise that resolves to the hashed password string.

ctx.context.password.verify(password: string, hash: string): Promise<boolean>
  - Description: Verifies a plain-text password against a stored hashed password.
  - Returns: A Promise that resolves to `true` if the password matches the hash, `false` otherwise.
```

## Custom Password Hashing (If Needed)

```typescript
import { betterAuth } from "better-auth"
import { scrypt } from "scrypt"

export const auth = betterAuth({
    emailAndPassword: {
        password: {
            hash: // your custom password hashing function
            verify: // your custom password verification function
        }
    }
})
```

## Database Schema

Better Auth requires these core tables:

### User Table

- `id`: string (Primary Key) - Unique identifier
- `name`: string - User's display name
- `email`: string - User's email address
- `emailVerified`: boolean - Whether email is verified
- `image`: string (Optional) - User's image URL
- `createdAt`: Date - Account creation timestamp
- `updatedAt`: Date - Last update timestamp

### Account Table (for credentials)

- `id`: string (Primary Key)
- `userId`: string (Foreign Key to user.id)
- `accountId`: string - Provider-specific ID
- `providerId`: string - Authentication provider ('credential' for email/password)
- `password`: string (Optional) - Hashed password for credential accounts
- `accessToken`, `refreshToken`, etc. - OAuth tokens
- `createdAt`, `updatedAt`: Date timestamps

## Migration Commands

```bash
# Run Better Auth migrations
npx @better-auth/cli migrate

# Generate schema files
npx @better-auth/cli generate
```

## Server-Side Password Operations

```typescript
// Set password for users (server-side only)
await auth.api.setPassword({
    headers: /* headers containing the user's session token */,
    password: /* new password */
});

// Change password
await authClient.changePassword({
    newPassword: "newpassword1234",
    currentPassword: "oldpassword1234",
    revokeOtherSessions: true
});
```

## Key Insights for Seeding

1. **Use Admin API**: Instead of manual database insertion, use `auth.api.admin.createUser()` for proper password hashing
2. **Better Auth Context**: Access the auth context with `await auth.$context` for internal operations
3. **Proper Cleanup**: Clear users through Better Auth APIs rather than direct database deletion when possible
4. **Role Assignment**: Better Auth supports custom user fields like 'role' through additionalFields configuration
