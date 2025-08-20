#!/usr/bin/env node
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { strava_connections } from '@/lib/schema'
import { refreshAccessToken } from '@/lib/strava'

// Load environment variables
config({ path: '.env.local' })

async function debugStravaToken() {
  console.log('🔍 Debug Strava Token Issue')
  console.log('============================')

  const userId = 'DHoklsF2prShLRyH8vo4A79VKRQoMrX8'

  // Get current connection
  console.log('\n📋 Current Connection:')
  const connection = await db
    .select()
    .from(strava_connections)
    .where(eq(strava_connections.user_id, userId))
    .limit(1)

  if (connection.length === 0) {
    console.log('❌ No Strava connection found')
    return
  }

  const conn = connection[0]
  console.log(`Athlete ID: ${conn.strava_athlete_id}`)
  console.log(`Created: ${conn.created_at}`)
  console.log(`Expires: ${conn.expires_at}`)
  console.log(`Scope: ${JSON.stringify(conn.scope)}`)
  console.log(`Access Token: ${conn.access_token?.slice(0, 10)}...${conn.access_token?.slice(-10)}`)
  console.log(
    `Refresh Token: ${conn.refresh_token?.slice(0, 10)}...${conn.refresh_token?.slice(-10)}`
  )

  // Check if expired
  const now = new Date()
  const expiresAt = new Date(conn.expires_at)
  const isExpired = now >= expiresAt
  const minutesUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60))

  console.log(`\n⏰ Token Status:`)
  console.log(`Current time: ${now.toISOString()}`)
  console.log(`Expires at: ${expiresAt.toISOString()}`)
  console.log(`Is expired: ${isExpired}`)
  console.log(`Minutes until expiry: ${minutesUntilExpiry}`)

  // Try to refresh token even if not expired
  console.log(`\n🔄 Testing Token Refresh:`)
  try {
    console.log('Attempting to refresh token...')
    const newTokens = await refreshAccessToken(conn.refresh_token)

    console.log('✅ Token refresh successful!')
    console.log(
      `New access token: ${newTokens.access_token?.slice(0, 10)}...${newTokens.access_token?.slice(-10)}`
    )
    console.log(`New expires_at: ${new Date(newTokens.expires_at * 1000).toISOString()}`)

    // Update database with new tokens
    await db
      .update(strava_connections)
      .set({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: new Date(newTokens.expires_at * 1000),
        updated_at: new Date(),
      })
      .where(eq(strava_connections.id, conn.id))

    console.log('✅ Database updated with new tokens')
    console.log('\n🎯 Now try calling /api/strava/activities again')
  } catch (error) {
    console.log('❌ Token refresh failed:')
    console.log('Error:', error instanceof Error ? error.message : String(error))
    console.log('\n🔍 This suggests the refresh token is also invalid')
    console.log('Solution: User needs to disconnect and reconnect Strava')
  }

  process.exit(0)
}

debugStravaToken().catch(console.error)
