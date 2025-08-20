#!/usr/bin/env node
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function testStravaSync() {
  console.log('🧪 Test Strava Activity Sync')
  console.log('===========================')

  const sessionToken = 'YJUcTaB5Bul8J3IXajxDKj5XoKWUhUSQ'

  // First, get the list of activities
  console.log('\n📋 Step 1: Get Activities')
  try {
    const activitiesResponse = await fetch('http://localhost:3001/api/strava/activities', {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    })

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text()
      console.log(
        `❌ Activities API failed: ${activitiesResponse.status} ${activitiesResponse.statusText}`
      )
      console.log(`Error: ${errorText}`)
      return
    }

    const activitiesData = await activitiesResponse.json()
    console.log(`✅ Found ${activitiesData.activities?.length || 0} activities`)

    if (!activitiesData.activities || activitiesData.activities.length === 0) {
      console.log('❌ No activities found to sync')
      return
    }

    // Try to sync the first activity
    const firstActivity = activitiesData.activities[0]
    console.log(`\n🔄 Step 2: Sync Activity: ${firstActivity.name} (ID: ${firstActivity.id})`)

    const syncResponse = await fetch('http://localhost:3001/api/strava/sync', {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activity_id: firstActivity.id,
        sync_as_workout: true,
      }),
    })

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.log(`❌ Sync API failed: ${syncResponse.status} ${syncResponse.statusText}`)
      console.log(`Error response: ${errorText}`)

      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText)
        console.log('Error details:', errorJson)
      } catch (e) {
        console.log('Raw error text:', errorText)
      }
      return
    }

    const syncResult = await syncResponse.json()
    console.log('✅ Sync successful!')
    console.log('Sync result:', syncResult)
  } catch (error) {
    console.log(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  process.exit(0)
}

testStravaSync().catch(console.error)
