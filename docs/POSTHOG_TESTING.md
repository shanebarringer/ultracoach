# PostHog Testing & Troubleshooting Guide

## Quick Troubleshooting Checklist

### 1. Verify Environment Variables (Preview Deployment)

Check that these are set in **Vercel → Project Settings → Environment Variables**:

```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_..." (your project API key)
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com" (or your region)
NEXT_PUBLIC_POSTHOG_PROJECT_ID="your-project-id"
```

**Important**: Make sure these are enabled for **Preview** environments, not just Production!

### 2. Check Browser Console

Open your preview site with **Developer Tools** (F12) and check the Console tab for:

```text
✅ Good signs:
- "PostHog initialized successfully" (from tslog)
- "[PostHog] Tracking pageview" messages
- No PostHog error messages

❌ Bad signs:
- "PostHog opted out of capturing" (means it detected development mode)
- "Failed to initialize PostHog" errors
- Missing NEXT_PUBLIC_POSTHOG_KEY errors
```

### 3. Check Network Tab

In Developer Tools → Network tab:

1. Filter by "posthog" or "i.posthog.com"
2. You should see POST requests to:
   - `https://us.i.posthog.com/e/` (event tracking)
   - `https://us.i.posthog.com/decide/` (feature flags)
3. Check the request payload - should contain your events

### 4. Verify NODE_ENV

The code disables tracking when `process.env.NODE_ENV === 'development'`. Check if Vercel preview is setting this correctly:

**Quick test**: Add this to any page temporarily:

```typescript
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PostHog Key exists:', !!process.env.NEXT_PUBLIC_POSTHOG_KEY)
```

If NODE_ENV is "development" on preview, that's the problem!

---

## Manual Testing Steps

### Test 1: Basic Pageview Tracking

1. **Open preview site in incognito window** (fresh session)
2. **Open browser DevTools** (F12)
3. **Navigate to homepage** → Should see pageview event
4. **Navigate to /dashboard** → Should see another pageview
5. **Check PostHog dashboard** (can take 1-2 minutes to appear)
   - Go to PostHog → Activity → Live Events
   - You should see `$pageview` events

### Test 2: User Identification

1. **Sign in to your preview site** with a test account
2. **Check browser console** for "PostHog user identified" message
3. **In PostHog dashboard**:
   - Go to Persons → should see your user
   - User properties should include email, name, userType

### Test 3: Custom Event Tracking

**Test Workout Logging:**

1. Sign in as a runner/coach
2. Go to Workouts page
3. Log a workout (fill out the modal and save)
4. Check PostHog → Activity → Live Events
5. Look for `workout_logged` event with properties:
   - status
   - workoutType
   - distance
   - duration
   - etc.

**Test Strava Connection:**

1. Go to Strava integration page
2. Click "Connect to Strava" button
3. Check for `strava_connect_initiated` event in PostHog

**Test Training Plan Creation:**

1. Go to Training Plans page
2. Create a new training plan
3. Check for `training_plan_created` event with:
   - planType
   - goalType
   - targetRaceDistance

### Test 4: Session Recording

1. Navigate around your preview site
2. After 2-3 minutes, go to PostHog → Session Replay
3. You should see your session recording
4. Verify that inputs are masked (passwords, sensitive fields)

---

## Common Issues & Solutions

### Issue: "No events showing in PostHog"

**Solution 1**: Check environment variables

```bash
# In your preview deployment, verify:
echo $NEXT_PUBLIC_POSTHOG_KEY
echo $NEXT_PUBLIC_POSTHOG_HOST
```

**Solution 2**: Disable development mode detection temporarily

```typescript
// In src/providers/posthog.tsx, temporarily comment out:
// if (process.env.NODE_ENV === 'development') {
//   ph.opt_out_capturing()
// }
```

**Solution 3**: Check PostHog project API key

- Go to PostHog → Project Settings → Project API Key
- Copy the key (starts with `phc_`)
- Make sure it matches your `NEXT_PUBLIC_POSTHOG_KEY`

### Issue: "PostHog initialized but opted out"

This means the code detected development mode. Check:

```typescript
// In browser console:
console.log('NODE_ENV:', process.env.NODE_ENV)
```

If it shows "development" on Vercel preview, you need to force production mode for previews.

### Issue: "Events tracked but user not identified"

Check that:

1. You're signed in (PostHog only identifies authenticated users)
2. `PostHogIdentifier` component is rendered in Layout
3. Better Auth session is working correctly

### Issue: "Session recordings not appearing"

Session recordings can take 2-5 minutes to process. Also check:

1. Session recording is enabled in PostHog project settings
2. Your PostHog plan includes session replay (free plan has limits)

---

## Debug Mode

To enable verbose PostHog debugging, temporarily add to `posthog.init()`:

```typescript
posthog.init(apiKey, {
  // ... existing config
  debug: true, // ADD THIS
  loaded: ph => {
    console.log('PostHog loaded:', ph)
  },
})
```

This will log all PostHog activity to console.

---

## Testing in Production vs Preview

**Preview environments** should work exactly like production IF:

- Environment variables are set for "Preview" in Vercel
- NODE_ENV is "production" (not "development")

**To test locally** (with tracking enabled):

1. Set `NODE_ENV=production` in your `.env.local`
2. Or temporarily remove the opt-out code:

   ```typescript
   // Comment out in posthog.tsx:
   // if (process.env.NODE_ENV === 'development') {
   //   ph.opt_out_capturing()
   // }
   ```

---

## Expected PostHog Dashboard Views

After successful testing, you should see:

1. **Live Events** (Activity tab):
   - `$pageview` events with URLs
   - `workout_logged` events with workout details
   - `strava_connect_initiated` events
   - `training_plan_created` events

2. **Persons** tab:
   - Your test users with email, name, userType properties
   - Session counts
   - Last seen timestamps

3. **Session Replay**:
   - Recorded sessions showing user interactions
   - Masked input fields (privacy-protected)

4. **Insights** (create custom):
   - Workout logging trends
   - Most active features
   - User engagement metrics
