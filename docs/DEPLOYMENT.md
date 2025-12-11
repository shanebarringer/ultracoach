# Production Deployment Guide

This guide covers deploying the UltraCoach application to production on Vercel.

## Prerequisites

- [x] Vercel account with project linked to GitHub repository
- [x] Supabase project (free tier or higher)
- [x] Environment variables configured in Vercel
- [x] Database migrations applied to production database

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Strava OAuth
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Monitoring (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Optional Variables

```bash
# Feature Flags
NEXT_PUBLIC_ENABLE_FEATURE_X=true

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
```

## Pre-Deployment Checklist

### Database

- [ ] All migrations applied to production database
  ```bash
  pnpm run prod:db:migrate
  ```
- [ ] Database connection pooling configured (Supabase handles this)
- [ ] Backup strategy in place
- [ ] Supabase Storage bucket created (`avatars`)
- [ ] Storage RLS policies applied

### Code

- [ ] All tests passing (`pnpm test`)
- [ ] Linting checks pass (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Build succeeds locally (`pnpm build`)
- [ ] No console.log statements in production code

### Configuration

- [ ] All environment variables set in Vercel dashboard
- [ ] NEXTAUTH_URL matches production domain
- [ ] Strava OAuth callback URLs updated
- [ ] Rate limit thresholds appropriate for production
- [ ] PostHog project configured

## Deployment Steps

### 1. Deploy via GitHub

**Automatic Deployment** (Recommended):

```bash
# Push to main branch - triggers auto-deployment
git push origin main
```

**Manual Deployment** (via Vercel CLI):

```bash
vercel --prod
```

### 2. Verify Deployment

1. **Check Build Logs**
   - Go to Vercel dashboard
   - Click on the deployment
   - Review build logs for errors

2. **Run Post-Deployment Checks** (see below)

3. **Monitor Error Tracking**
   - Check PostHog for JavaScript errors
   - Review Vercel Analytics for performance issues

## Post-Deployment Verification

### Critical Features Checklist

- [ ] **Authentication**
  - [ ] Sign up works
  - [ ] Sign in works
  - [ ] Sign out works
  - [ ] Session persistence

- [ ] **Profile Management**
  - [ ] Avatar upload works (Supabase Storage)
  - [ ] Profile editing works
  - [ ] Social profile connections work

- [ ] **Strava Integration**
  - [ ] OAuth flow completes successfully
  - [ ] Activity sync works
  - [ ] Webhooks receive events

- [ ] **Database Operations**
  - [ ] User creation works
  - [ ] Data updates persist
  - [ ] Queries perform well (< 500ms)

- [ ] **File Storage**
  - [ ] Avatar uploads succeed
  - [ ] Images load from Supabase CDN
  - [ ] Old avatars deleted on new upload

### Performance Checks

```bash
# Use Lighthouse or similar tool
npx lighthouse https://your-domain.com --view
```

**Expected Scores:**

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

### API Health Check

```bash
curl https://your-domain.com/api/health
# Expected: 200 OK
```

## Known Limitations & Considerations

### 1. Vercel Serverless Constraints

**Function Execution Time:**

- **Free Tier**: 10 seconds max
- **Pro Tier**: 60 seconds max

**Memory Limit:**

- **Free Tier**: 1024 MB
- **Pro Tier**: 3008 MB

**Deployment Size:**

- Max 50 MB per serverless function

**Implications:**

- Large file uploads may timeout (use chunked uploads for files > 5MB)
- Heavy computation should be moved to background jobs
- Image processing should use Supabase image transformations

### 2. Database Connection Pooling

Supabase handles connection pooling automatically. Each serverless function gets a connection from the pool.

**Best Practices:**

- Use `@/lib/db` for all database queries
- Don't create custom database connections
- Close connections explicitly (handled by Drizzle ORM)

### 3. File Storage (Supabase Storage)

**Current Implementation:**

- ✅ Avatar uploads via Supabase Storage
- ✅ Works with Vercel serverless
- ✅ 1GB free storage + 2GB bandwidth/month
- ✅ Built-in CDN

**Setup Required:**

- Storage bucket created via migration: `supabase/migrations/20251211000000_create_avatars_storage_bucket.sql`
- See `docs/SUPABASE_STORAGE_SETUP.md` for details

**Cost Estimate:**

- Free tier sufficient for ~100 coaches
- Paid tier: $0.021/GB if exceeded

### 4. Rate Limiting (Upstash Redis)

**Configuration:**

- Uploads: 10 per hour per user
- API endpoints: 60 requests per minute per IP

**Monitoring:**

```bash
# Check rate limit stats in Upstash dashboard
```

## Rollback Procedure

If deployment fails or critical issues arise:

### 1. Instant Rollback (Vercel)

```bash
# Via Vercel Dashboard
# 1. Go to Deployments
# 2. Find previous successful deployment
# 3. Click "..." → "Promote to Production"

# Via Vercel CLI
vercel rollback
```

### 2. Database Rollback (if needed)

```bash
# Revert latest migration
pnpm run db:rollback

# Or restore from backup
./supabase/scripts/restore_backup.sh [backup-file]
```

### 3. Verify Rollback

- [ ] Site accessible
- [ ] Core features working
- [ ] No new errors in logs

## Monitoring & Alerts

### Error Tracking

**PostHog Dashboard:**

- JavaScript errors
- Failed API requests
- User session drops

**Vercel Analytics:**

- Function errors
- Timeout issues
- Cold start performance

### Key Metrics to Monitor

1. **Response Time**
   - P50 < 200ms
   - P95 < 500ms
   - P99 < 1000ms

2. **Error Rate**
   - Target: < 0.1%
   - Alert threshold: > 1%

3. **Uptime**
   - Target: 99.9%
   - Vercel provides this automatically

## Troubleshooting Common Issues

### Issue: Avatar Upload Fails

**Symptoms:**

- 500 error when uploading avatar
- "Failed to upload avatar to storage" message

**Diagnosis:**

```bash
# Check Supabase Storage bucket exists
supabase storage list

# Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

**Solution:**

```bash
# Re-run storage migration
pnpm run db:migrate:local
```

See: `docs/SUPABASE_STORAGE_SETUP.md`

### Issue: Database Connection Timeouts

**Symptoms:**

- Intermittent 503 errors
- "Database unavailable" messages

**Diagnosis:**

- Check Supabase dashboard for connection pool exhaustion
- Review slow query logs

**Solution:**

1. Enable connection pooling in DATABASE_URL (transaction mode)
2. Optimize slow queries
3. Add database indexes

### Issue: Function Timeouts

**Symptoms:**

- 504 Gateway Timeout
- Functions exceed 10s limit

**Diagnosis:**

- Check Vercel function logs for slow operations
- Profile code execution time

**Solution:**

1. Optimize database queries
2. Move heavy processing to background jobs
3. Upgrade to Vercel Pro for 60s timeout

### Issue: Environment Variables Not Loading

**Symptoms:**

- "Required environment variable not found" errors
- Features not working after deployment

**Diagnosis:**

```bash
# Check Vercel environment variables
vercel env ls
```

**Solution:**

1. Add missing variables in Vercel dashboard
2. Ensure variables are set for "Production" environment
3. Redeploy after adding variables

## Security Considerations

### 1. API Route Protection

All API routes must validate authentication:

```typescript
const session = await getServerSession()
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 2. Rate Limiting

- Implemented via Upstash Redis
- Applied to all public API routes
- Upload endpoints: 10 req/hour per user

### 3. Input Validation

- Zod schemas for all API inputs
- Magic bytes validation for file uploads
- XSS protection via React (automatic)

### 4. Database Security

- RLS policies on all tables
- Service role key never exposed to client
- Prepared statements prevent SQL injection (Drizzle ORM)

## Performance Optimization

### 1. Static Generation

- Landing pages pre-rendered at build time
- ISR (Incremental Static Regeneration) for semi-dynamic content

### 2. Image Optimization

- Next.js Image component for automatic optimization
- Supabase Storage transforms for avatars
  ```
  ?width=200&height=200&quality=80&format=webp
  ```

### 3. Code Splitting

- Dynamic imports for heavy components
- Lazy loading for non-critical features

### 4. Caching Strategy

- API responses cached via Redis
- Static assets cached via Vercel Edge Network
- Database query results memoized

## Scaling Considerations

### Current Architecture Limits

**Free Tier (Vercel + Supabase):**

- ~1,000 active users
- ~10,000 API requests/day
- 1GB file storage
- 2GB bandwidth/month

**When to Upgrade:**

- Vercel Pro: > 1,000 API requests/day
- Supabase Pro: > 500MB storage or 2GB bandwidth

### Horizontal Scaling

Vercel automatically scales serverless functions:

- No configuration needed
- Pay-per-execution model
- Cold start optimization built-in

## Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Supabase Storage Setup](./SUPABASE_STORAGE_SETUP.md)
