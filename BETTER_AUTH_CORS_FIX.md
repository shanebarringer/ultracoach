# Better Auth CORS Fix

## Problem
Better Auth was rejecting requests from new Vercel deployment URLs with the error:
```
Invalid origin: https://ultracoach-git-fix-cors-error-shane-hehims-projects.vercel.app
```

## Root Cause
Better Auth's `trustedOrigins` configuration only included the original Vercel URL and didn't account for new deployment URLs created by different branches or deployments.

## Solution Applied

### 1. Updated Better Auth Configuration
Modified `src/lib/better-auth.ts` to include:
- Dynamic trusted origins based on `VERCEL_URL` environment variable
- Common Vercel deployment patterns for ultracoach
- Support for additional trusted origins via environment variables

### 2. Added Trusted Origins
The configuration now includes:
- Development URLs: `http://localhost:3000`, `http://localhost:3001`
- Current Vercel URL: `https://${process.env.VERCEL_URL}`
- Common ultracoach deployment patterns
- Environment variable support via `BETTER_AUTH_TRUSTED_ORIGINS`

## How to Handle Future URL Changes

### Option 1: Environment Variable (Recommended)
Add the new URL to your Vercel environment variables:
```bash
BETTER_AUTH_TRUSTED_ORIGINS=https://new-deployment-url.vercel.app
```

### Option 2: Update Code
Add the new URL pattern to the `getTrustedOrigins()` function in `src/lib/better-auth.ts`:
```typescript
origins.push('https://new-deployment-url.vercel.app')
```

### Option 3: Use Wildcard Pattern (if supported)
Some versions of Better Auth support wildcard patterns:
```typescript
origins.push('https://*.vercel.app')
```

## Current Configuration
The system now automatically:
1. Detects the current `VERCEL_URL` environment variable
2. Adds it to trusted origins
3. Includes common ultracoach deployment patterns
4. Supports additional origins via environment variables

## Testing
To verify the fix works:
1. Deploy to a new branch
2. Check that the new deployment URL is automatically trusted
3. Test authentication flows on the new deployment

## Notes
- The fix is backward compatible
- Existing deployments continue to work
- New deployments are automatically supported
- Environment variables provide flexibility for custom URLs 