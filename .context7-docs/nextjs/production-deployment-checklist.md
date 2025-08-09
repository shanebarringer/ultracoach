# Production Deployment Checklist for Dynamic Routes

## 🎯 Overview

This checklist ensures that Next.js 15 App Router dynamic routes work correctly in production environments, preventing common issues like static rendering of user-specific content.

## 📋 Pre-Deployment Checklist

### 1. Route Analysis

- [ ] **Audit all authenticated routes** - Identify which routes need dynamic rendering
- [ ] **Check for `'use client'` overuse** - Ensure Server Components are used for authentication
- [ ] **Verify dynamic signals** - All user-specific routes use `headers()`, `cookies()`, or `fetch({ cache: 'no-store' })`
- [ ] **Test route behavior** - Confirm routes render user-specific content

#### Routes to Verify:
- [ ] `/chat` - User conversations
- [ ] `/chat/[userId]` - Specific conversation
- [ ] `/dashboard/coach` - Coach dashboard
- [ ] `/dashboard/runner` - Runner dashboard  
- [ ] `/calendar` - User workout calendar
- [ ] `/workouts` - Personal workouts
- [ ] `/training-plans` - User training plans
- [ ] `/profile` - User profile

### 2. Environment Configuration

#### Environment Variables
- [ ] **Production `.env` validation** - All required variables present
- [ ] **Database URL format** - Correct connection string with SSL
- [ ] **Better Auth configuration** - Proper secrets and URLs
- [ ] **Supabase credentials** - Valid API keys and project refs

#### Required Variables:
```bash
# Database
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://yourdomain.com"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### 3. Better Auth Configuration

- [ ] **Session configuration** - Proper cookie settings for production
- [ ] **CORS settings** - Allow production domain
- [ ] **Database adapter** - Drizzle adapter configured correctly
- [ ] **Custom session fields** - Role and user data properly included

```typescript
// lib/better-auth.ts
export const auth = betterAuth({
  database: {
    adapter: drizzleAdapter(db, {
      provider: 'pg'
    })
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    }
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production'
    }
  }
})
```

### 4. Database Schema Validation

- [ ] **Better Auth tables** - All required tables exist with correct schema
- [ ] **Indexes** - Performance indexes on user_id, email, session columns
- [ ] **Constraints** - Foreign key constraints properly configured
- [ ] **RLS policies** - Row Level Security enabled and tested

#### Critical Tables Check:
```sql
-- Verify Better Auth tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user', 'session', 'account', 'verification');

-- Check session table has both id and token fields
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'session' AND column_name IN ('id', 'token');
```

### 5. Authentication Flow Testing

- [ ] **Sign up flow** - Complete registration process
- [ ] **Sign in flow** - Authentication with existing users
- [ ] **Session persistence** - Sessions survive page refreshes
- [ ] **Sign out flow** - Proper session cleanup
- [ ] **Role-based routing** - Correct dashboard redirection

### 6. Performance and Caching

#### Cache Headers
- [ ] **API routes** - Proper cache control headers
- [ ] **Dynamic pages** - No-cache headers for user-specific content
- [ ] **Static assets** - Long-term caching for CSS/JS

```typescript
// app/api/user-data/route.ts
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
```

#### Build Configuration
- [ ] **Next.js config** - Proper production settings
- [ ] **Build optimization** - Tree shaking and minification enabled
- [ ] **Bundle analysis** - No unexpected large bundles

```javascript
// next.config.js
module.exports = {
  experimental: {
    ppr: false // Disable Partial Prerendering for UltraCoach
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate'
        }
      ]
    }
  ]
}
```

## 🚀 Deployment Process

### 1. Pre-Deployment Tests

#### Local Production Build
```bash
# Build and test locally
pnpm build
pnpm start

# Test key user flows
curl -I https://localhost:3000/chat
curl -I https://localhost:3000/dashboard/coach
```

#### Environment Variable Test
```bash
# Verify all variables load correctly
pnpm tsx scripts/test-env-vars.ts
```

### 2. Database Migration Strategy

- [ ] **Backup current database** - Create recovery point
- [ ] **Test migrations** - Run on staging environment first
- [ ] **Rollback plan** - Prepare rollback procedures

```bash
# Production database operations
pnpm db:backup-production
pnpm db:migrate-production
pnpm db:verify-production
```

### 3. Deployment Verification

#### Immediate Post-Deployment Checks
- [ ] **Health check endpoint** - `/api/health` responds correctly
- [ ] **Authentication endpoints** - Sign in/out work
- [ ] **Database connectivity** - API routes can query database
- [ ] **Environment variables** - All secrets loaded correctly

#### User Flow Verification
- [ ] **Guest user flow** - Can browse public pages
- [ ] **Sign up flow** - New users can register
- [ ] **Sign in flow** - Existing users can authenticate
- [ ] **Authenticated flows** - Chat, dashboard, calendar work
- [ ] **Role-based access** - Coaches and runners see appropriate content

### 4. Monitoring Setup

#### Error Tracking
- [ ] **Error boundaries** - Catch and log client-side errors
- [ ] **Server error logging** - API route error handling
- [ ] **Authentication errors** - Better Auth error tracking

#### Performance Monitoring
- [ ] **Response times** - API endpoint performance
- [ ] **Database queries** - Query performance monitoring
- [ ] **User experience** - Core Web Vitals tracking

## 🔍 Post-Deployment Validation

### Automated Tests
```bash
# Run production smoke tests
pnpm test:production

# Run Playwright tests against production
npx playwright test --config=playwright.prod.config.ts
```

### Manual Verification Checklist

#### Authentication Flows
- [ ] Navigate to `/chat` without authentication → redirects to signin
- [ ] Sign in as coach → lands on coach dashboard
- [ ] Sign in as runner → lands on runner dashboard
- [ ] Access `/chat/[userId]` → shows personalized conversation
- [ ] Refresh page in authenticated state → maintains session

#### Data Personalization
- [ ] Coach sees their connected runners
- [ ] Runner sees their training plan and workouts
- [ ] Messages show correct sender/recipient
- [ ] Calendar shows user-specific workouts
- [ ] Profile shows current user data

#### Error Scenarios
- [ ] Invalid session cookie → redirects to signin
- [ ] Expired session → handles gracefully
- [ ] Network errors → proper error boundaries
- [ ] Database connection issues → fallback handling

## 🛠️ Troubleshooting Guide

### Issue: Routes Still Marked as Static

**Symptoms:**
- Build output shows routes as "○ (Static)" instead of "λ (Server)"
- User-specific content not loading
- Same content shown to all users

**Solutions:**
1. Add `await headers()` to page components
2. Check for Client Components (`'use client'`) that should be Server Components
3. Verify authentication logic runs server-side

### Issue: Session Not Available

**Symptoms:**
- `getServerSession()` returns null in production
- Authentication redirects not working
- "No session found" errors

**Solutions:**
1. Check Better Auth database connection
2. Verify session table schema (id AND token fields)
3. Check cookie configuration for production domain

### Issue: Performance Degradation

**Symptoms:**
- Slow page loads after forcing dynamic rendering
- High server load
- Database connection issues

**Solutions:**
1. Implement proper caching strategies
2. Optimize database queries
3. Use Suspense for non-critical content
4. Consider hybrid static/dynamic approach

### Issue: Environment Variable Problems

**Symptoms:**
- "Variable not found" errors
- Authentication configuration failures
- Database connection errors

**Solutions:**
1. Verify production `.env` file syntax
2. Check for multiline values (like secrets)
3. Ensure proper secret rotation procedures

## ✅ Success Criteria

### Technical Metrics
- [ ] All authenticated routes show "λ (Server)" in build output
- [ ] Zero static rendering of user-specific content
- [ ] Response times under 500ms for authenticated routes
- [ ] Zero authentication-related errors in production

### User Experience Metrics
- [ ] Sign up completion rate > 95%
- [ ] Authentication success rate > 99%
- [ ] Session persistence across page refreshes
- [ ] Zero reports of "wrong user data" showing

### Monitoring Alerts
- [ ] Authentication error rate < 1%
- [ ] API response time < 1000ms 95th percentile
- [ ] Database connection success rate > 99%
- [ ] Zero static rendering alerts

This checklist ensures that UltraCoach's dynamic routes work correctly in production, providing personalized experiences for all users while maintaining performance and security standards.