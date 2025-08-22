import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { races } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('RaceImportAPI')

interface ImportRaceData {
  name: string
  date?: string
  location?: string
  distance_miles?: number
  distance_type?: string
  elevation_gain_feet?: number
  terrain_type?: string
  website_url?: string
  notes?: string
  source: 'gpx' | 'csv'
  gpx_data?: {
    tracks: Array<{
      name?: string
      points: Array<{
        lat: number
        lon: number
        ele?: number
        time?: string
      }>
    }>
    waypoints: Array<{
      name?: string
      lat: number
      lon: number
      ele?: number
      desc?: string
    }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || session.user.userType !== 'coach') {
      return NextResponse.json(
        { error: 'Unauthorized - Only coaches can import races' },
        { status: 401 }
      )
    }

    const importData: ImportRaceData = await request.json()

    // Validate required fields
    if (!importData.name) {
      return NextResponse.json({ error: 'Race name is required' }, { status: 400 })
    }

    // Set defaults for missing fields
    const raceData = {
      name: importData.name,
      date: importData.date ? new Date(importData.date) : null,
      distance_miles: String(importData.distance_miles || 0),
      distance_type: importData.distance_type || 'Custom',
      location: importData.location || 'Unknown Location',
      elevation_gain_feet: importData.elevation_gain_feet || 0,
      terrain_type: importData.terrain_type || 'mixed',
      website_url: importData.website_url || null,
      notes: importData.notes || null,
      created_by: session.user.id,
    }

    // Additional validation
    const distanceNum = parseFloat(raceData.distance_miles)
    if (distanceNum < 0) {
      return NextResponse.json({ error: 'Distance must be positive' }, { status: 400 })
    }

    if (raceData.elevation_gain_feet < 0) {
      return NextResponse.json({ error: 'Elevation gain must be positive' }, { status: 400 })
    }

    // Validate terrain type
    const validTerrainTypes = ['trail', 'mountain', 'road', 'mixed', 'desert', 'forest']
    if (!validTerrainTypes.includes(raceData.terrain_type)) {
      raceData.terrain_type = 'mixed'
    }

    // Validate distance type
    const validDistanceTypes = ['50K', '50M', '100K', '100M', 'Marathon', 'Custom']
    if (!validDistanceTypes.includes(raceData.distance_type)) {
      raceData.distance_type = 'Custom'
    }

    try {
      const [race] = await db.insert(races).values(raceData).returning()

      logger.info('Race imported successfully', {
        raceId: race.id,
        name: race.name,
        source: importData.source,
        importedBy: session.user.id,
      })

      // TODO: Store GPX data in future when we add gpx_data column
      if (importData.gpx_data) {
        logger.info('GPX data available for future storage', {
          raceId: race.id,
          hasTrackData: !!importData.gpx_data.tracks,
          hasWaypoints: !!importData.gpx_data.waypoints,
        })
      }

      return NextResponse.json(
        {
          race,
          message: `Race "${race.name}" imported successfully`,
        },
        { status: 201 }
      )
    } catch (error) {
      logger.error('Database error creating imported race:', error)
      return NextResponse.json({ error: 'Failed to save race to database' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in POST /api/races/import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
