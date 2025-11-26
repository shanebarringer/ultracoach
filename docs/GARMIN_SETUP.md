# Garmin Connect API Setup Guide

This guide walks you through setting up the Garmin Connect integration for UltraCoach.

## Prerequisites

- UltraCoach running locally or deployed
- Business use case (Garmin requires business approval)
- PostHog account for feature flags (optional but recommended)

---

## Step 1: Apply for Garmin Connect Developer Program

### 1.1 Submit Application

1. Visit https://developer.garmin.com/gc-developer-program/
2. Click **"Request Access"** or **"Apply Now"**
3. Fill out the application form:
   - **Business Name**: Your company/organization
   - **Contact Information**: Business email (not personal)
   - **Use Case**: Describe UltraCoach as an ultramarathon training platform
   - **Expected Volume**: Estimate number of users and API calls
   - **Integration Type**: Workout sync, activity import

### 1.2 Wait for Approval

- **Timeline**: 2 business days
- **Next Steps**: If approved, you'll receive:
  - Access to Developer Portal
  - Integration call invitation
  - API documentation

### 1.3 Integration Call

- **Duration**: 30-60 minutes
- **Topics**: Technical requirements, API capabilities, best practices
- **Outcome**: OAuth credentials and production access

---

## Step 2: Configure OAuth Application

### 2.1 Create OAuth App (After Approval)

1. Log in to Garmin Developer Portal
2. Navigate to **OAuth Provider** section
3. Click **"Create an App"**
4. Fill in details:

   **Development:**
   - App Name: `UltraCoach Development`
   - Description: `Ultramarathon training platform - Development environment`
   - Redirect URI: `http://localhost:3001/api/garmin/callback`

   **Production:**
   - App Name: `UltraCoach`
   - Description: `Ultramarathon training platform with Garmin device sync`
   - Redirect URI: `https://your-domain.com/api/garmin/callback`

5. Save and note your credentials:
   - **Consumer Key** (also called Client ID)
   - **Consumer Secret**

---

## Step 3: Set Up PostHog (Feature Flags)

### 3.1 Create PostHog Account

1. Visit https://posthog.com/
2. Sign up for free account
3. Create a new project for UltraCoach

### 3.2 Get PostHog API Key

1. Go to **Project Settings** → **Project API Key**
2. Copy your **Project API Key** (starts with `phc_`)
3. Note the **Host URL** (usually `https://us.i.posthog.com`)

### 3.3 Create Feature Flag

1. Go to **Feature Flags** → **New Feature Flag**
2. Create flag:
   - **Key**: `garmin-integration`
   - **Name**: Garmin Integration
   - **Description**: Enable Garmin Connect API integration
   - **Default**: `false` (disabled)
3. Save the flag

---

## Step 4: Configure Environment Variables

### 4.1 Local Development (.env.local)

Create or update `.env.local` with:

```bash
# PostHog Analytics & Feature Flags
NEXT_PUBLIC_POSTHOG_KEY="phc_your_actual_posthog_key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# Garmin Connect API
GARMIN_CLIENT_ID="your_consumer_key_from_garmin"
GARMIN_CLIENT_SECRET="your_consumer_secret_from_garmin"
GARMIN_REDIRECT_URI="http://localhost:3001/api/garmin/callback"

# Security Keys (Generate with: openssl rand -hex 32)
GARMIN_ENCRYPTION_KEY="generate_32_character_hex_string"
CRON_SECRET="generate_32_character_hex_string"
```

### 4.2 Production Environment (Vercel)

Add environment variables using Vercel CLI or Dashboard:

```bash
# Using Vercel CLI
vercel env add NEXT_PUBLIC_POSTHOG_KEY
vercel env add NEXT_PUBLIC_POSTHOG_HOST
vercel env add GARMIN_CLIENT_ID
vercel env add GARMIN_CLIENT_SECRET
vercel env add GARMIN_REDIRECT_URI  # Use production URL!
vercel env add GARMIN_ENCRYPTION_KEY
vercel env add CRON_SECRET
```

**Important**: Production `GARMIN_REDIRECT_URI` must match exactly what you registered with Garmin.

---

## Step 5: Run Database Migration

Apply the Garmin integration schema:

```bash
# Development
pnpm db:migrate

# Production (if using Supabase CLI)
supabase db push --linked
```

This creates three tables:

- `garmin_connections` - OAuth tokens
- `garmin_workout_syncs` - Sync status tracking
- `garmin_devices` - User devices

---

## Step 6: Enable Feature Flag

### 6.1 PostHog Dashboard

1. Go to **Feature Flags** → `garmin-integration`
2. Set rollout strategy:
   - **Internal Testing**: Release to specific user IDs/emails
   - **Beta Testing**: Release to 5% of users
   - **Full Release**: Release to 100% of users

### 6.2 Test Locally

With feature flag enabled:

1. Start dev server: `pnpm dev`
2. Go to **Settings** → **Integrations**
3. Click **"Connect Garmin Account"**
4. Complete OAuth flow
5. Verify connection success

---

## Step 7: Test the Integration

### 7.1 Connection Test

1. Navigate to Settings → Integrations
2. Click "Connect Garmin Account"
3. Authorize on Garmin's site
4. Verify redirect back to UltraCoach
5. Check connection status shows "Connected"

### 7.2 Workout Sync Test

1. Go to Dashboard
2. Check Garmin widget shows upcoming workouts
3. Click "Sync Now"
4. Verify workouts appear on Garmin device

### 7.3 Activity Import Test

1. Complete a workout on Garmin device
2. Go to Settings → Integrations → Garmin Activities
3. Click "Import to UltraCoach"
4. Verify activity appears in workouts

---

## Troubleshooting

### OAuth Errors

**Error**: "Invalid redirect URI"

- **Fix**: Ensure `GARMIN_REDIRECT_URI` matches exactly what you registered

**Error**: "Invalid credentials"

- **Fix**: Double-check `GARMIN_CLIENT_ID` and `GARMIN_CLIENT_SECRET`

### Feature Flag Not Working

**Issue**: Garmin components not showing

- **Fix**: Check PostHog API key is correct
- **Fix**: Verify feature flag is enabled in PostHog dashboard
- **Fix**: Clear browser cache and refresh

### Database Errors

**Error**: "Table does not exist"

- **Fix**: Run `pnpm db:migrate` to apply schema

**Error**: "Column not found"

- **Fix**: Check migration applied successfully: `pnpm db:studio`

### Encryption Errors

**Error**: "Encryption key not found"

- **Fix**: Generate key with `openssl rand -hex 32`
- **Fix**: Add to `.env.local` as `GARMIN_ENCRYPTION_KEY`

---

## Gradual Rollout Strategy

### Phase 1: Internal Testing (Week 1)

- Enable for your own account only
- Test all features thoroughly
- Fix any issues before wider release

### Phase 2: Beta Testing (Week 2-3)

- Release to 5-10% of users
- Monitor for errors in PostHog
- Gather user feedback

### Phase 3: Gradual Rollout (Week 4-6)

- 25% → 50% → 75% → 100%
- Monitor performance and errors
- Ready to disable quickly if needed

### Phase 4: Full Release

- 100% rollout
- Monitor cron job performance
- Consider rate limiting for scale

---

## Security Checklist

- [ ] OAuth credentials stored in environment variables (not code)
- [ ] Encryption key is 32+ characters and random
- [ ] Cron secret is random and secure
- [ ] Database RLS policies applied
- [ ] HTTPS enforced in production
- [ ] Redirect URIs match exactly
- [ ] Token refresh working correctly
- [ ] Error logging configured

---

## Support Resources

- **Garmin Developer Program**: https://developer.garmin.com/gc-developer-program/
- **Garmin Developer Forums**: https://forums.garmin.com/developer/
- **PostHog Documentation**: https://posthog.com/docs
- **UltraCoach Issues**: GitHub Issues tab

---

## Quick Reference

### Environment Variables

| Variable                   | Required | Purpose                                 |
| -------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Yes      | PostHog API key for feature flags       |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes      | PostHog API host URL                    |
| `GARMIN_CLIENT_ID`         | Yes      | Garmin OAuth consumer key               |
| `GARMIN_CLIENT_SECRET`     | Yes      | Garmin OAuth consumer secret            |
| `GARMIN_REDIRECT_URI`      | Yes      | OAuth callback URL                      |
| `GARMIN_ENCRYPTION_KEY`    | Yes      | 32-char hex string for token encryption |
| `CRON_SECRET`              | Yes      | Secret for cron job authentication      |

### API Endpoints

| Endpoint                 | Method | Purpose                 |
| ------------------------ | ------ | ----------------------- |
| `/api/garmin/connect`    | GET    | Initiate OAuth flow     |
| `/api/garmin/callback`   | GET    | OAuth callback handler  |
| `/api/garmin/disconnect` | DELETE | Remove connection       |
| `/api/garmin/status`     | GET    | Check connection status |
| `/api/garmin/sync`       | POST   | Manual workout sync     |
| `/api/garmin/activities` | GET    | Fetch activities        |
| `/api/garmin/import`     | POST   | Import activity         |
| `/api/cron/garmin-sync`  | GET    | Automatic daily sync    |

### Feature Flag

- **Name**: `garmin-integration`
- **Default**: `false` (disabled)
- **Rollout**: Manual (dashboard controlled)

---

**Questions?** Check the troubleshooting section or open a GitHub issue.
