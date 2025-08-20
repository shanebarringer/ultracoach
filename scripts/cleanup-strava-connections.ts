#!/usr/bin/env node
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { strava_connections } from '../src/lib/schema'

// Load environment variables
config({ path: '.env.local' })

async function cleanupStravaConnections() {
  console.log('🧹 Cleaning up old Strava connections...')

  try {
    // Get all current connections
    const connections = await db.select().from(strava_connections)

    console.log(`Found ${connections.length} Strava connections`)

    for (const conn of connections) {
      console.log(
        `- Athlete ID: ${conn.strava_athlete_id}, User: ${conn.user_id}, Scope: ${conn.scope}`
      )
    }

    if (connections.length > 0) {
      console.log('\n⚠️  This will DELETE ALL existing Strava connections!')
      console.log("This should free up your app's connected athlete limit.")
      console.log('\nTo continue, uncomment the delete line in the script.\n')

      // Uncomment this line to actually delete the connections:
      // await db.delete(strava_connections)

      // console.log('✅ Deleted all Strava connections')
      // console.log('You can now reconnect with fresh permissions')
    } else {
      console.log('No connections found to clean up')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error cleaning up connections:', error)
    process.exit(1)
  }
}

cleanupStravaConnections()
