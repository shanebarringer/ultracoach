#!/usr/bin/env node
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { strava_connections } from '@/lib/schema'

// Load environment variables
config({ path: '.env.local' })

async function testStravaApiDirect() {
  console.log('🧪 Test Strava API Direct')
  console.log('========================')

  const userId = 'DHoklsF2prShLRyH8vo4A79VKRQoMrX8'

  // Get current connection
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
  console.log(
    `Using access token: ${conn.access_token?.slice(0, 10)}...${conn.access_token?.slice(-10)}`
  )

  // Test 1: Get athlete profile
  console.log('\n🧪 Test 1: Get Athlete Profile')
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Profile API failed: ${response.status} ${response.statusText}`)
      console.log(`Error response: ${errorText}`)
    } else {
      const athlete = await response.json()
      console.log(
        `✅ Profile API success: ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id})`
      )
    }
  } catch (error) {
    console.log(`❌ Profile API error: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Test 2: Get activities directly
  console.log('\n🧪 Test 2: Get Activities Direct')
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=5', {
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Activities API failed: ${response.status} ${response.statusText}`)
      console.log(`Error response: ${errorText}`)
    } else {
      const activities = await response.json()
      console.log(`✅ Activities API success: Found ${activities.length} activities`)
      if (activities.length > 0) {
        console.log(`First activity: ${activities[0].name} (${activities[0].type})`)
      }
    }
  } catch (error) {
    console.log(
      `❌ Activities API error: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Test 3: Compare with strava-v3 library
  console.log('\n🧪 Test 3: Using strava-v3 library')
  try {
    const strava = await import('strava-v3')

    strava.default.config({
      access_token: conn.access_token,
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    })

    const activities = await new Promise((resolve, reject) => {
      strava.default.athlete.listActivities(
        {
          page: 1,
          per_page: 5,
        },
        (err: unknown, payload: unknown) => {
          if (err) reject(err)
          else resolve(payload)
        }
      )
    })

    console.log(`✅ strava-v3 library success: Found activities`)
    console.log(activities)
  } catch (error) {
    console.log(
      `❌ strava-v3 library error: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  process.exit(0)
}

testStravaApiDirect().catch(console.error)
