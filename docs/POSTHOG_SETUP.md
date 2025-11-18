# PostHog Analytics & Error Tracking Setup Guide

This guide will help you complete the PostHog setup for UltraCoach.

## What is PostHog?

PostHog is an all-in-one product analytics platform that provides:

- **Product Analytics**: Track user behavior, feature usage, and conversion funnels
- **Session Replay**: Watch recordings of user sessions to understand behavior
- **Feature Flags**: Gradual rollouts and A/B testing
- **Error Tracking**: Capture and analyze application errors
- **Surveys**: Collect user feedback directly in your app

## Why PostHog over Sentry?

PostHog was chosen for UltraCoach because:

- **100x more generous free tier**: 1M events vs Sentry's 5K errors
- **Product analytics included**: Track user engagement alongside errors
- **Session replays**: 5K recordings vs Sentry's 50 replays
- **All features on free plan**: No feature restrictions
- **Better for growth**: Proactive product improvement vs reactive error fixing

## Free Tier Limits (More Than Enough!)

- ✅ 1,000,000 events/month (product analytics)
- ✅ 5,000 session recordings
- ✅ 100,000 error events
- ✅ 1,000,000 feature flag requests
- ✅ 1,500 survey responses
- ✅ No credit card required
- ✅ 1-year data retention

## Setup Steps

### 1. Create PostHog Account

1. Go to [https://posthog.com](https://posthog.com)
2. Click "Get started - free" (no credit card required)
3. Choose **US Cloud** hosting (recommended for UltraCoach)
4. Complete the signup flow

### 2. Get Your API Keys

After signup, PostHog will show you your project details:

1. Go to **Project Settings** (gear icon in left sidebar)
2. Find your **Project API Key** (starts with `phc_`)
3. Note the **Host** URL (should be `https://us.i.posthog.com` for US Cloud)
4. Note your **Project ID** (shown in Project Settings)

### 3. Get Personal API Key (for Source Maps)

To enable readable error stack traces in production, you'll need a Personal API Key:

1. Go to **Personal Settings** → **Personal API Keys**
2. Click **Create Personal API Key**
3. Name it "UltraCoach Source Maps"
4. Select **Write-only** permissions (safer than full access)
5. Copy the generated key (starts with `phx_`)

**What are source maps?**
- Production code is minified (e.g., `a.b.c()` instead of actual function names)
- Source maps translate minified code back to original source
- Makes debugging production errors **much easier**
- Stack traces show real file names and line numbers

### 4. Add Environment Variables

Create or update your `.env.local` file:

```bash
# PostHog Analytics & Error Tracking
NEXT_PUBLIC_POSTHOG_KEY="phc_your_actual_key_here"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
NEXT_PUBLIC_POSTHOG_PROJECT_ID="your-project-id"
# Personal API Key for source map upload
POSTHOG_PERSONAL_API_KEY="phx_your_personal_key_here"
```

**Important Notes:**

- Replace `phc_your_actual_key_here` with your actual PostHog Project API Key
- Replace `phx_your_personal_key_here` with your Personal API Key
- Replace `your-project-id` with your Project ID from settings
- The `NEXT_PUBLIC_` prefix is required for Next.js client-side access
- The Personal API Key is only used during builds, not at runtime
- Never commit `.env.local` to version control (it's already in `.gitignore`)

### 5. Add to Vercel (Production)

For production deployment on Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `NEXT_PUBLIC_POSTHOG_KEY` = your PostHog Project API key
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com`
   - `NEXT_PUBLIC_POSTHOG_PROJECT_ID` = your Project ID
   - `POSTHOG_PERSONAL_API_KEY` = your Personal API key (for source maps)
4. Set them for **Production**, **Preview**, and **Development** environments

**Important:** The Personal API Key enables automatic source map upload during builds, making production errors much easier to debug!

### 6. Verify Installation

Start your development server:

```bash
pnpm dev
```

**Check the browser console:**

- You should see a warning: "PostHog API key not found. Analytics disabled." (because it's disabled in development)
- This is expected - PostHog is configured to opt-out in development mode

**To test in development:**

1. Open `src/providers/posthog.tsx`
2. Comment out the opt-out line (line 50-52)
3. Visit `http://localhost:3000`
4. Check PostHog dashboard for events

## What's Already Configured

✅ **Automatic Pageview Tracking**: Every route change is tracked
✅ **User Identification**: Authenticated users are automatically identified with email, name, and userType
✅ **Error Tracking**: Unhandled errors and promise rejections are captured
✅ **Session Recording**: With privacy controls (all inputs masked)
✅ **Error Boundary**: React errors are caught and sent to PostHog
✅ **Development Safety**: Analytics disabled in development (opt-in if needed)

## How to Use PostHog in Your Code

### Track Custom Events

```typescript
import { usePostHogEvent } from '@/hooks/usePostHogIdentify'

function MyComponent() {
  const trackEvent = usePostHogEvent()

  const handleWorkoutComplete = () => {
    trackEvent('workout_completed', {
      workoutType: 'long_run',
      distance: 20,
      duration: 180 // minutes
    })
  }

  return <button onClick={handleWorkoutComplete}>Complete Workout</button>
}
```

### Feature Flags (A/B Testing)

```typescript
import { usePostHogFeatureFlag } from '@/hooks/usePostHogIdentify'

function Dashboard() {
  const useNewDashboard = usePostHogFeatureFlag('new-dashboard-ui')

  if (useNewDashboard) {
    return <NewDashboard />
  }

  return <OldDashboard />
}
```

### Server-Side Tracking

```typescript
import { trackServerEvent } from '@/lib/posthog-server'

export async function POST(req: Request) {
  const userId = await getUserId(req)

  // Track server-side event
  await trackServerEvent(userId, 'training_plan_created', {
    planType: 'ultramarathon',
    duration: 16, // weeks
  })

  return Response.json({ success: true })
}
```

## Privacy & GDPR Compliance

PostHog is configured with privacy-first settings:

- ✅ All input fields are masked in session recordings
- ✅ Elements with `data-private` attribute are masked
- ✅ Respects "Do Not Track" browser setting
- ✅ Only creates user profiles for identified users
- ✅ No cross-domain tracking

### Mark sensitive data as private:

```tsx
<div data-private>Sensitive information here</div>
```

## Dashboard Features

Once data starts flowing, you can:

1. **View Session Replays**: Watch user sessions to understand behavior
2. **Create Funnels**: Analyze conversion paths (signup → workout created → plan active)
3. **Track Retention**: See how many users return week-over-week
4. **Analyze Errors**: Group errors by type, view stack traces, see affected users
5. **Set Up Alerts**: Get notified when errors spike or metrics change

## Recommended Events to Track

Here are some key events to add to UltraCoach:

```typescript
// Training Plan Events
trackEvent('training_plan_created', { planType, duration, raceGoal })
trackEvent('training_plan_started', { planId, startDate })
trackEvent('training_plan_completed', { planId, completionRate })

// Workout Events
trackEvent('workout_completed', { type, distance, duration, effort })
trackEvent('workout_skipped', { type, reason })
trackEvent('workout_modified', { field, oldValue, newValue })

// Strava Integration
trackEvent('strava_connected', { userId })
trackEvent('strava_sync_started', { activityCount })
trackEvent('strava_sync_completed', { syncedActivities })

// Coach-Runner Relationships
trackEvent('relationship_created', { coachId, runnerId })
trackEvent('message_sent', { conversationId, hasWorkoutLink })

// Feature Usage
trackEvent('race_imported', { importType: 'gpx' | 'csv', raceCount })
trackEvent('feature_flag_evaluated', { flagKey, value })
```

## Troubleshooting

### No Data Appearing in PostHog?

1. **Check environment variables are set correctly**

   ```bash
   # Verify variables are loaded
   echo $NEXT_PUBLIC_POSTHOG_KEY
   ```

2. **Check browser console for errors**
   - Open DevTools → Console
   - Look for PostHog initialization messages

3. **Verify opt-out is disabled**
   - PostHog is disabled in development by default
   - Check `src/providers/posthog.tsx` line 50-52

4. **Check PostHog dashboard settings**
   - Ensure your project is active
   - Check if API key is correct

### Session Replays Not Recording?

Session recording has strict privacy controls:

- All inputs are masked by default
- Check `session_recording` config in `src/providers/posthog.tsx`
- Ensure you have available recording credits

### Feature Flags Not Working?

1. Create the feature flag in PostHog dashboard first
2. Wait a few seconds for flag to propagate
3. Call `posthog.reloadFeatureFlags()` if needed

## Resources

- **PostHog Dashboard**: [https://app.posthog.com](https://app.posthog.com)
- **Documentation**: [https://posthog.com/docs](https://posthog.com/docs)
- **Next.js Guide**: [https://posthog.com/docs/libraries/next-js](https://posthog.com/docs/libraries/next-js)
- **Support**: [https://posthog.com/questions](https://posthog.com/questions)

## Next Steps

1. ✅ Sign up for PostHog (free, no credit card)
2. ✅ Add API keys to `.env.local` and Vercel
3. ✅ Deploy to production
4. ✅ Watch data flow in PostHog dashboard
5. 🎯 Add custom event tracking for key user actions
6. 🎯 Set up funnels and retention analysis
7. 🎯 Create feature flags for gradual rollouts

---

**Need Help?** The UltraCoach PostHog integration is production-ready and follows all best practices. Just add your API keys and you're good to go!
