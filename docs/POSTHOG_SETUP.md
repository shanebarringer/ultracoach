# PostHog Setup Guide

This guide explains how to set up PostHog analytics and feature flags for UltraCoach.

## Table of Contents

- [Overview](#overview)
- [Environment Setup](#environment-setup)
- [Creating Feature Flags](#creating-feature-flags)
- [Using Feature Flags](#using-feature-flags)
- [Analytics Events](#analytics-events)
- [Testing](#testing)

## Overview

UltraCoach uses PostHog for:

- **Feature Flags**: Gradually roll out new features to users
- **Analytics**: Track user behavior and application usage
- **A/B Testing**: Test different features with user segments

## Environment Setup

### 1. Get PostHog Credentials

1. Sign up for PostHog at [https://posthog.com](https://posthog.com) (or use self-hosted instance)
2. Create a new project or use an existing one
3. Copy your **Project API Key** from Project Settings

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# PostHog Analytics & Feature Flags
NEXT_PUBLIC_POSTHOG_KEY="phc_your_project_api_key_here"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

**Note**: For self-hosted PostHog, use your instance URL for `NEXT_PUBLIC_POSTHOG_HOST`.

### 3. Verify Setup

PostHog will automatically initialize when the app starts. User identification happens automatically when users log in via the `PostHogProvider`.

## Creating Feature Flags

### In PostHog Dashboard

1. Navigate to **Feature Flags** in PostHog dashboard
2. Click **New Feature Flag**
3. Configure the flag:
   - **Key**: `settings-functionality` (use kebab-case)
   - **Name**: Settings Functionality (human-readable)
   - **Description**: Advanced settings including notifications, units, privacy, etc.
   - **Release Conditions**: Configure rollout percentage or user segments

### Example Feature Flags

#### Settings Functionality (Current)

```
Key: settings-functionality
Description: Advanced settings panels for notifications, units, privacy, communication, and training preferences
Rollout: 0% → 100% gradual rollout
```

#### Future Flags

```
Key: garmin-integration
Description: Garmin Connect IQ integration features

Key: ai-training-recommendations
Description: AI-powered training plan recommendations

Key: mobile-app-features
Description: Progressive Web App capabilities
```

## Using Feature Flags

### Client-Side Components

Use the `useFeatureFlag` hook for client components:

```tsx
'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export function MyComponent() {
  const isEnabled = useFeatureFlag('settings-functionality', false)

  if (!isEnabled) {
    return <div>Feature coming soon!</div>
  }

  return <div>Feature content here</div>
}
```

### With Feature Flag Guard

Use `FeatureFlagGuard` component for declarative feature gating:

```tsx
import { FeatureFlagGuard } from '@/components/feature-flags/FeatureFlagGuard'

export function MyPage() {
  return (
    <FeatureFlagGuard
      flagKey="settings-functionality"
      defaultValue={false}
      fallback={<div>Coming soon!</div>}
    >
      <SettingsPage />
    </FeatureFlagGuard>
  )
}
```

### Inline Feature Flags

For smaller UI elements:

```tsx
import { InlineFeatureFlag } from '@/components/feature-flags/FeatureFlagGuard'

export function Header() {
  return (
    <nav>
      <InlineFeatureFlag flagKey="notifications-v2">
        <NotificationBellV2 />
      </InlineFeatureFlag>
    </nav>
  )
}
```

### Server-Side Components

Use the server-side utility in API routes or server components:

```tsx
import { isFeatureEnabled } from '@/lib/posthog-server'

export async function GET(request: Request) {
  const userId = await getCurrentUserId()
  const isEnabled = await isFeatureEnabled('settings-functionality', userId, false)

  if (!isEnabled) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
  }

  // Feature logic here
}
```

### With Feature Flag Payload

For flags with custom configuration:

```tsx
import { useFeatureFlagPayload } from '@/hooks/useFeatureFlag'

export function ConfigurableFeature() {
  const config = useFeatureFlagPayload('feature-config') as {
    maxItems?: number
    theme?: string
  }

  return <div>Max items: {config?.maxItems ?? 10}</div>
}
```

## Analytics Events

### Capture Custom Events

```tsx
import { usePostHogCapture } from '@/hooks/useFeatureFlag'

export function SettingsPage() {
  const captureEvent = usePostHogCapture()

  const handleSave = () => {
    captureEvent('settings_saved', {
      section: 'notifications',
      userId: user.id,
    })
  }

  return <button onClick={handleSave}>Save</button>
}
```

### Automatic Events

PostHog automatically captures:

- Page views (configured in `PostHogProvider`)
- User identification (when logged in)
- Session data

## Testing

### Local Development

By default, PostHog is **disabled in development mode** to avoid polluting analytics data.

To enable PostHog in development:

```tsx
// In PostHogProvider.tsx, comment out the opt_out_capturing call
// or set an environment variable to enable it
```

### Feature Flag Testing

#### Test with User Overrides

1. Go to PostHog dashboard
2. Navigate to Feature Flags → Your Flag
3. Add user override: Enter user email or ID
4. Set override to `true` or `false`

#### Test with Percentage Rollout

1. Set rollout to 50%
2. Test with multiple user accounts
3. Verify approximately half see the feature

### CI/CD Testing

Feature flags gracefully handle missing PostHog configuration:

```tsx
// Returns defaultValue when PostHog is not configured
const isEnabled = useFeatureFlag('my-flag', true) // Returns true if PostHog unavailable
```

## Best Practices

### 1. Use Descriptive Flag Names

❌ Bad: `new-feature`, `test1`, `settings`
✅ Good: `settings-functionality`, `garmin-integration`, `ai-recommendations`

### 2. Always Provide Default Values

```tsx
// Always specify what happens when flag check fails
const isEnabled = useFeatureFlag('my-flag', false) // ✅ Explicit default
```

### 3. Clean Up Old Flags

- Archive flags after full rollout (100% for 30+ days)
- Remove flag code after archival
- Document flag lifecycle in pull requests

### 4. Test Both States

```tsx
// Ensure both enabled and disabled states work correctly
<FeatureFlagGuard flagKey="feature" fallback={<GracefulFallback />}>
  <NewFeature />
</FeatureFlagGuard>
```

### 5. Gradual Rollout Strategy

1. **0%**: Feature flag created, code deployed, flag disabled
2. **10%**: Internal team testing
3. **25%**: Beta testers
4. **50%**: Half of users
5. **100%**: Full rollout
6. **Archive**: After 30 days at 100%

## Troubleshooting

### PostHog Not Initializing

**Problem**: Feature flags always return default value

**Solution**:

- Verify `NEXT_PUBLIC_POSTHOG_KEY` is set correctly
- Check browser console for PostHog errors
- Ensure you're not opted out in development mode

### Feature Flag Not Updating

**Problem**: Flag changes in dashboard don't reflect in app

**Solution**:

- PostHog caches flags for ~30 seconds
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check flag key matches exactly (case-sensitive)

### Server-Side Flags Not Working

**Problem**: `isFeatureEnabled` always returns default

**Solution**:

- Server-side flags require user ID for evaluation
- Ensure user is authenticated before checking flag
- Verify PostHog API key has proper permissions

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Feature Flags Guide](https://posthog.com/docs/feature-flags)
- [PostHog React SDK](https://posthog.com/docs/libraries/react)
- [PostHog Node SDK](https://posthog.com/docs/libraries/node)

## Support

For UltraCoach-specific PostHog questions, contact the development team or create an issue in the repository.
