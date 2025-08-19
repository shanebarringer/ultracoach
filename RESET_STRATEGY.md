# UltraCoach Database Reset & Refresh Strategy

## 📊 Current State Assessment (2025-08-19)

Based on database audit, the core data is healthy:

- ✅ 8 users (5 coaches, 3 runners) with proper Better Auth accounts
- ✅ 19 public training plan templates
- ✅ 3+ upcoming races
- ✅ 2 coach-runner relationships
- ✅ All authentication records properly structured

**Root Issues Identified**:

1. **API Authentication**: Training plan templates require session but frontend may not be sending proper auth
2. **Preview Branch Login**: Better Auth URL configuration issues in production/preview
3. **Frontend State**: Components may not be properly fetching or displaying existing data

## 🔄 Phase 1: Quick Fixes (Recommended First)

### 1.1 Fix API Authentication Issues

Check if frontend components are properly authenticated when calling APIs:

```bash
# Test with authenticated request (need session cookie)
curl -H "Cookie: better-auth.session_token=xxx" http://localhost:3001/api/training-plans/templates
```

### 1.2 Fix Preview Branch Auth Configuration

Update Better Auth configuration for preview deployments:

- Ensure VERCEL_URL is properly set
- Add preview branch URLs to trusted origins
- Test authentication flow on preview branch

### 1.3 Verify Frontend Components

Check CreateTrainingPlanModal and related components:

- Ensure they're calling the correct API endpoints
- Verify error handling and loading states
- Check if authentication state is properly managed

## 🗄️ Phase 2: Fresh Reset Strategy (If Needed)

### 2.1 Local Development Reset

```bash
# 1. Backup current state
pnpm run db:backup

# 2. Reset and fresh seed using SECURE scripts
pnpm dev &  # Start dev server first
pnpm run db:fresh:comprehensive  # This uses comprehensive seeding
# OR
pnpm run db:seed:secure  # More focused seeding

# 3. Verify authentication
curl -d '{"email":"marcus@ultracoach.dev","password":"password123"}' \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/auth/sign-in/email
```

### 2.2 Production Database Reset

```bash
# 1. Ensure production app is accessible
curl https://ultracoach.vercel.app/api/health

# 2. Reset production database
pnpm run prod:db:reset

# 3. Seed with SECURE script
pnpm run prod:db:seed:secure

# 4. Verify production authentication
curl -d '{"email":"marcus@ultracoach.dev","password":"password123"}' \
     -H "Content-Type: application/json" \
     https://ultracoach.vercel.app/api/auth/sign-in/email
```

### 2.3 Database Schema & Migration Check

```bash
# Ensure schema is up to date
pnpm db:generate
pnpm db:migrate

# For production
pnpm prod:db:generate
pnpm prod:db:migrate
```

## 🎯 Phase 3: Verification Checklist

### 3.1 Authentication Testing

- [ ] Local login works for coach and runner accounts
- [ ] Preview branch login works
- [ ] Production login works
- [ ] Session cookies are properly set
- [ ] API endpoints return data with authentication

### 3.2 Data Verification

- [ ] Training plan templates load in coach interface
- [ ] Races appear in workout/plan setup
- [ ] Coach-runner relationships work
- [ ] Dashboard data loads properly

### 3.3 API Testing

- [ ] `/api/training-plans/templates` returns 19 templates with auth
- [ ] `/api/races` returns race data with auth
- [ ] `/api/my-relationships` works for coaches and runners

## 🔧 Recommended Commands

### Current Secure Seeding (RECOMMENDED)

```bash
# Local development
pnpm dev &
pnpm run db:seed:secure

# Production
pnpm run prod:db:seed:secure
```

### Full Reset if Needed

```bash
# Local comprehensive reset
pnpm run db:fresh:comprehensive

# Production reset (use carefully)
pnpm run prod:db:fresh
```

### Testing Authentication

```bash
# Check users
pnpm db:query "SELECT email, user_type FROM better_auth_users;"

# Check templates
pnpm db:query "SELECT count(*) FROM plan_templates WHERE is_public = true;"

# Check accounts
pnpm db:query "SELECT count(*) FROM better_auth_accounts WHERE provider_id = 'credential';"
```

## 🚨 Safety Notes

1. **ALWAYS backup before major resets**: `pnpm run db:backup`
2. **Use SECURE scripts only**: Avoid deprecated scripts that cause auth issues
3. **Test locally first**: Never reset production without testing locally
4. **Verify server running**: Secure scripts require server to be accessible
5. **Check environment**: Ensure proper .env files are loaded

## 🎯 Success Criteria

After reset/refresh:

- ✅ All users can authenticate (coach and runner accounts)
- ✅ Training plan templates visible to coaches
- ✅ Races load in workout setup
- ✅ Coach-runner relationships functional
- ✅ Playwright tests pass
- ✅ Preview branch authentication works

## 📋 Next Steps After Reset

1. **Test API endpoints** with proper authentication
2. **Fix frontend components** if they're not properly calling authenticated APIs
3. **Enhance navigation** with improved UX
4. **Start Strava integration** development
5. **Fix Playwright tests** for CI/CD pipeline

---

**Recommendation**: Start with Phase 1 (Quick Fixes) since the database state is actually healthy. The issues are likely frontend/authentication related rather than data corruption.
