#!/usr/bin/env node
import { config } from 'dotenv'
import fetch from 'node-fetch'

// Load environment variables
config({ path: '.env.local' })

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!

async function deauthorizeStravaApp() {
  console.log('🚫 Deauthorizing Strava app to reset athlete limit...')

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    console.error('❌ Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET in .env.local')
    process.exit(1)
  }

  try {
    // This requires a valid access token, but we can try to deauth with the app credentials
    // Note: This is more for documentation - the real solution is to contact Strava support

    const response = await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
      }),
    })

    if (response.ok) {
      console.log('✅ Successfully deauthorized app')
    } else {
      console.log('ℹ️  Deauthorization endpoint called, but may need manual action')
    }
  } catch (error) {
    console.log('ℹ️  Could not programmatically deauthorize')
  }

  console.log("\n📋 To fully reset your Strava app's athlete limit:")
  console.log('1. Go to https://www.strava.com/settings/apps')
  console.log('2. Find "UltraCoach" in your authorized apps')
  console.log('3. Click "Revoke Access" to disconnect')
  console.log('4. This should free up one athlete slot for your app')
  console.log('\n💡 Alternative: Contact Strava Developer Support at:')
  console.log('   https://developers.strava.com/docs/getting-started/#account')
  console.log('   Request a quota increase for development/testing')

  process.exit(0)
}

deauthorizeStravaApp()
