# How to Increase Strava API Athlete Limit

## Current Status

- **Current Limit**: 1 athlete
- **Currently Connected**: 0 athletes
- **Issue**: Still getting 403 "Limit exceeded" error despite showing 0/1

## Solution 1: Request Quota Increase (Recommended)

### Email Template to Strava Developer Support

**To:** developers@strava.com  
**Subject:** Request for Athlete Connection Limit Increase - App ID 157317

**Body:**

```
Hello Strava Developer Support,

I am developing UltraCoach, a professional ultramarathon coaching platform that integrates with Strava for activity synchronization.

App Details:
- App ID: 157317
- App Name: UltraCoach
- Current Limit: 1 connected athlete
- Use Case: Development and testing of coach-runner activity sync features

I am requesting an increase to at least 50-100 connected athletes to support:
1. Development testing with multiple user accounts
2. Beta testing with real coaches and runners
3. Demonstration of the coaching platform features

The app is designed for professional coaching relationships and will help coaches better serve ultramarathon athletes by automatically syncing training activities.

Could you please increase the athlete connection limit for development purposes?

Thank you for your consideration.

Best regards,
[Your Name]
[Your Email]
```

### Expected Response Time

- Usually 3-5 business days
- They often approve increases for legitimate development use

## Solution 2: Debug Current Connection Issue

The fact that you show 0/1 but still get "limit exceeded" suggests:

1. **Cached/Ghost Connections**: Strava might have cached connections that don't show in the dashboard
2. **Rate Limiting**: You might be hitting a different rate limit
3. **App Status**: Your app might need to be in a different status

### Check App Status

1. Go to https://developers.strava.com/
2. Click on your "UltraCoach" app
3. Check if the app status shows any warnings or limitations

## Solution 3: Alternative Testing Approach

Create a second app specifically for testing:

1. **App Name**: "UltraCoach Development"
2. **Purpose**: Testing only
3. **Fresh limits**: New app = new athlete limit

This gives you immediate testing capability while waiting for the quota increase.

## Solution 4: Clear Any Cached Connections

Try these steps:

1. **Revoke from Strava side**: https://www.strava.com/settings/apps
2. **Wait 10-15 minutes** for Strava's cache to clear
3. **Try connecting again** with the fixed OAuth flow

## Immediate Action Plan

1. ✅ **Send the quota increase email** (takes 3-5 days but worth doing)
2. ✅ **Create a second test app** for immediate testing needs
3. ✅ **Check your current app's status** for any warnings
4. ✅ **Try the connection again** with our fixed scope parsing

The scope parsing fix I just implemented should resolve the permission issues once you can connect successfully.
