# PostHog Verification Checklist

## ✅ Environment Variables Set?

- [x] Added NEXT_PUBLIC_POSTHOG_KEY to .env.local
- [x] Added NEXT_PUBLIC_POSTHOG_HOST to .env.local
- [ ] Added both variables to Vercel (Production, Preview, Development)

## 🧪 Testing Options

### Option A: Deploy to Preview (Recommended)

1. Push your changes to GitHub (already done! ✅)
2. Vercel will create a preview deployment
3. Visit the preview URL
4. Check PostHog dashboard for events

### Option B: Enable in Development (Quick Test)

Temporarily enable PostHog in dev mode:

1. Open `src/providers/posthog.tsx`
2. Search for and comment out the `ph.opt_out_capturing()` call
3. Restart dev server
4. Open <http://localhost:3001>
5. Check browser console - should see PostHog initialized
6. Check PostHog dashboard for events

### Option C: Check Production

If you already have production deployed:

1. Add PostHog keys to Vercel
2. Redeploy production
3. Visit your production site
4. Check PostHog dashboard

## 📱 What to Check in PostHog Dashboard

Once you visit your site (preview/production):

1. **Go to PostHog Dashboard**: <https://app.posthog.com>
2. **Check "Events" tab**: You should see:
   - `$pageview` events (automatic)
   - `$autocapture` events (clicks, etc.)
3. **Check "Session Replay"**: If you clicked around, you should see session recordings
4. **Check "Persons"**: If you logged in, you should see your user identified

## 🎯 Quick Win: Add Custom Event Tracking

Once basic tracking works, add these custom events to get valuable insights:

### Workout Completion Events

- Track when users complete workouts
- See which workout types are most popular
- Understand workout completion rates

### Strava Integration Events

- Track Strava connections
- Monitor sync success rates
- Identify sync issues early

### Training Plan Events

- Track plan creation and completion
- Understand which plan types are popular
- See user engagement with plans

## 🚀 Next Steps

1. ✅ Deploy to preview/production
2. ✅ Verify events in PostHog dashboard
3. 🎯 Add custom event tracking
4. 📊 Create funnels and insights
5. 🎬 Watch session replays to understand user behavior
