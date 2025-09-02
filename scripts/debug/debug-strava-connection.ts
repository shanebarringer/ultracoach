#!/usr/bin/env node
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!

async function debugStravaConnection() {
  console.log('🔍 Debug Strava Connection Issue')
  console.log('================================')

  console.log('\n📋 Current App Details:')
  console.log(`Client ID: ${STRAVA_CLIENT_ID}`)
  console.log(`Client Secret: ${STRAVA_CLIENT_SECRET ? '[REDACTED]' : 'NOT SET'}`)

  console.log('\n🔧 Troubleshooting Steps:')
  console.log(
    '1. ✅ Check https://www.strava.com/settings/apps for any connected "UltraCoach" apps'
  )
  console.log('2. ✅ If found, click "Revoke Access" to clear the connection')
  console.log('3. ✅ Wait 10-15 minutes for Strava cache to clear')
  console.log('4. ✅ Send quota increase email (email template created)')
  console.log('5. ✅ Try OAuth flow again after cache clears')

  console.log('\n📧 Email Template Created:')
  console.log('- File: scripts/strava-quota-request-email.txt')
  console.log('- Copy/paste and send to developers@strava.com')
  console.log('- Usually get response in 2-3 business days')

  console.log('\n🔄 Current OAuth URL (with scope fix):')

  // Generate a new OAuth URL with current timestamp
  const stateData = {
    userId: 'DHoklsF2prShLRyH8vo4A79VKRQoMrX8',
    timestamp: Date.now(),
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3001/api/strava/callback',
    approval_prompt: 'force',
    scope: 'read,activity:read_all,profile:read_all',
    state: state,
  })

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`
  console.log(`\n${authUrl}`)

  console.log('\n💡 This URL will work once:')
  console.log('- Any cached connections are cleared, OR')
  console.log('- Strava increases your athlete limit')

  process.exit(0)
}

debugStravaConnection()
