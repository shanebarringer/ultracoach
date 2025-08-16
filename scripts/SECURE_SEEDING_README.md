# Secure Database Seeding Guide

This document explains the secure seeding approach for UltraCoach that resolves authentication compatibility issues with Better Auth.

## ⚠️ Critical Security Issue Fixed

**Problem**: The original seeding scripts used custom password hashing that was incompatible with Better Auth, causing authentication failures.

**Root Cause**: Custom `scrypt` password hashing in `scripts/lib/database-operations.ts` bypassed Better Auth's security model.

**Impact**: Users created with deprecated seeding could not authenticate, causing Playwright tests to fail and production authentication issues.

## ✅ Secure Solutions

### New Secure Scripts

| Script                      | Purpose                   | Command                        |
| --------------------------- | ------------------------- | ------------------------------ |
| `seed-local-secure.ts`      | Local development seeding | `pnpm run db:seed:secure`      |
| `seed-production-secure.ts` | Production seeding        | `pnpm run prod:db:seed:secure` |

### Key Security Improvements

1. **Better Auth API Usage**: Uses `/api/auth/sign-up/email` endpoint for proper password hashing
2. **Compatible Password Format**: Passwords are hashed using Better Auth's internal system
3. **Proper Role Mapping**: Correctly sets `role: 'user'` and `userType: 'coach'/'runner'`
4. **Authentication Verification**: Each user creation is verified to work with Better Auth
5. **Comprehensive Logging**: Structured logging with `tslog` for debugging and monitoring

### Migration from Deprecated Scripts

#### Local Development

```bash
# OLD (deprecated - causes auth failures)
pnpm run db:seed

# NEW (secure - Better Auth compatible)
pnpm run db:seed:secure
```

#### Production

```bash
# OLD (deprecated - causes auth failures)
pnpm run prod:db:seed

# NEW (secure - Better Auth compatible)
pnpm run prod:db:seed:secure
```

## 🔧 Technical Details

### Password Hashing Comparison

**Deprecated Approach** (causes auth failures):

```typescript
// Custom scrypt hashing - INCOMPATIBLE with Better Auth
const hash = await scrypt(password, salt, 32)
const passwordHash = `${salt}:${hash.toString('hex')}`
```

**Secure Approach** (Better Auth compatible):

```typescript
// Uses Better Auth sign-up API for proper hashing
const response = await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  body: JSON.stringify({ email, password, name, role }),
})
```

### Database Field Mapping

```typescript
// Better Auth standard fields
{
  role: 'user',           // Better Auth standard for all users
  userType: 'coach',      // Application-specific role differentiation
  email: 'user@example.com',
  name: 'User Name'
}
```

### Error Prevention

1. **Server Dependency**: Scripts check that dev/production server is running before seeding
2. **Cleanup First**: Removes existing users to prevent conflicts
3. **Role Verification**: Ensures proper `role`/`userType` mapping after creation
4. **Final Validation**: Verifies all users were created successfully

## 🚨 Deprecated Scripts Status

The following scripts are now deprecated and will show warnings:

- `scripts/seed-local.ts` - Shows deprecation warning, aborts unless `FORCE_DEPRECATED_SEEDING=true`
- `scripts/seed-production.ts` - Shows deprecation warning, aborts unless `FORCE_DEPRECATED_SEEDING=true`
- `scripts/lib/database-operations.ts` - Functions show warnings when called

### Forcing Deprecated Scripts (Not Recommended)

```bash
# Only use if you understand the authentication failure risk
FORCE_DEPRECATED_SEEDING=true pnpm tsx scripts/seed-local.ts
```

## ✅ Benefits of Secure Seeding

1. **Authentication Compatibility**: Users can actually log in after seeding
2. **Playwright Test Success**: E2E tests pass with proper authentication
3. **Production Readiness**: No authentication failures in production
4. **Security Compliance**: Uses Better Auth's secure password handling
5. **Type Safety**: Full TypeScript coverage with proper error handling
6. **Monitoring Ready**: Structured logging for production debugging

## 🔄 Migration Checklist

- [ ] Stop using `pnpm run db:seed` (deprecated)
- [ ] Use `pnpm run db:seed:secure` for local development
- [ ] Use `pnpm run prod:db:seed:secure` for production
- [ ] Ensure dev server is running before local seeding
- [ ] Ensure production app is deployed and accessible before production seeding
- [ ] Verify authentication works after seeding
- [ ] Update any CI/CD pipelines to use secure scripts

## 🎯 Success Verification

After running secure seeding, verify success:

1. **User Creation**: Check that all expected users are in database
2. **Role Mapping**: Verify `role='user'` and correct `userType` values
3. **Authentication**: Test login with created user credentials
4. **Playwright Tests**: Run test suite to ensure authentication works

```bash
# Verify local seeding worked
pnpm run test:e2e

# Check users in local database
pnpm run db:query "SELECT email, role, user_type FROM better_auth_users;"
```

## 📚 Related Documentation

- [Better Auth Documentation](https://better-auth.com/)
- [CLAUDE.md - Password Hashing Section](../CLAUDE.md#-better-auth-configuration-critical)
- [TASKS.md - Authentication Crisis Resolution](../TASKS.md)
- [COMPLETED_MILESTONES.md - Security Fixes](../COMPLETED_MILESTONES.md)

---

**Summary**: Always use the secure seeding scripts (`*-secure.ts`) to ensure authentication compatibility. The deprecated scripts are kept for reference but will cause authentication failures.
