#!/usr/bin/env node

// Generate Strava OAuth URL with full permissions
const crypto = require('crypto')

const STRAVA_CLIENT_ID = '157317'
const REDIRECT_URI = 'http://localhost:3001/api/strava/callback'
const FULL_SCOPE = 'read,activity:read_all,profile:read_all'

// Generate state parameter (normally would include user ID from session)
const stateData = {
  userId: 'DHoklsF2prShLRyH8vo4A79VKRQoMrX8', // Sarah Mountain's user ID from logs
  timestamp: Date.now(),
}

const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

const params = new URLSearchParams({
  client_id: STRAVA_CLIENT_ID,
  response_type: 'code',
  redirect_uri: REDIRECT_URI,
  approval_prompt: 'force', // This forces re-authorization with new permissions
  scope: FULL_SCOPE,
  state: state,
})

const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`

console.log('\n🚀 Strava OAuth Authorization URL with FULL permissions:')
console.log('📋 Copy this URL and open it in your browser:\n')
console.log(authUrl)
console.log('\n📝 This will request these permissions:')
console.log('  ✅ read - Basic profile access')
console.log('  ✅ activity:read_all - Read all activities (required for sync)')
console.log('  ✅ profile:read_all - Full profile access')
console.log('\n⚠️  Make sure to APPROVE ALL permissions when Strava asks!')
console.log("\nAfter authorization, you'll be redirected back to the callback URL.")
