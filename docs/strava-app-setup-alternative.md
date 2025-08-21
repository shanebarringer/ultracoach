# Alternative Strava App Setup for Testing

## Issue

Your current Strava app has hit the connected athlete limit (403 error). Here are solutions:

## Solution 1: Create a Second Test App

1. **Go to https://developers.strava.com/**
2. **Click "Create App"**
3. **Fill in the form:**
   - Application Name: `UltraCoach Dev Test`
   - Category: `Training`
   - Club: (leave blank)
   - Website: `http://localhost:3001`
   - Application Description: `Development testing for UltraCoach`
   - Authorization Callback Domain: `localhost`

4. **Get your new credentials:**

   ```bash
   Client ID: [NEW_CLIENT_ID]
   Client Secret: [NEW_CLIENT_SECRET]
   ```

5. **Update your .env.local:**
   ```env
   # New test app credentials
   STRAVA_CLIENT_ID=[NEW_CLIENT_ID]
   STRAVA_CLIENT_SECRET=[NEW_CLIENT_SECRET]
   ```

## Solution 2: Manually Revoke Access

1. **Go to https://www.strava.com/settings/apps**
2. **Find "UltraCoach" in your connected apps**
3. **Click "Revoke Access"**
4. **This frees up one athlete connection slot**

## Solution 3: Request Quota Increase

1. **Email Strava Developer Support:**
   - Email: developers@strava.com
   - Subject: "Request athlete limit increase for development app"
   - Include: Your app ID and use case

2. **Typical limits:**
   - Development: 100-300 connected athletes
   - Production: 1000+ with approval

## Quick Test with New App

After creating a new app, restart your server and try the OAuth flow again:

```bash
pnpm dev
# Then use the generated OAuth URL from the script
```

The new app will have a fresh athlete limit, allowing you to test the full permissions flow.
