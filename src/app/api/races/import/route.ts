import { and, ilike, or, sql } from 'drizzle-orm'

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

    // Check request size to prevent memory exhaustion attacks
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      logger.warn('Request payload too large', { contentLength, userId: session.user.id })
      return NextResponse.json(
        { error: 'Payload too large - maximum 10MB allowed per import' },
        { status: 413 }
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

    // Check for duplicate races to prevent importing the same race multiple times
    const duplicateQuery = db
      .select()
      .from(races)
      .where(
        and(
          ilike(races.name, `%${raceData.name.trim()}%`),
          or(
            // Same location
            raceData.location !== 'Unknown Location'
              ? ilike(races.location, `%${raceData.location}%`)
              : sql`false`,
            // Similar distance (within 5 miles for ultramarathons)
            sql`ABS(CAST(${races.distance_miles} AS FLOAT) - ${distanceNum}) < 5`,
            // Same date if provided
            raceData.date ? sql`${races.date} = ${raceData.date}` : sql`false`
          )
        )
      )
      .limit(5)

    const existingRaces = await duplicateQuery

    if (existingRaces.length > 0) {
      const duplicateNames = existingRaces.map(r => r.name).join(', ')
      logger.warn('Potential duplicate race detected', {
        newRaceName: raceData.name,
        existingRaces: duplicateNames,
        userId: session.user.id,
      })

      return NextResponse.json(
        {
          error: 'Potential duplicate race detected',
          details: `A similar race may already exist: ${duplicateNames}. Please verify this isn't a duplicate before importing.`,
          existingRaces: existingRaces.map(r => ({
            id: r.id,
            name: r.name,
            location: r.location,
            distance: r.distance_miles,
            date: r.date,
          })),
        },
        { status: 409 }
      )
    }

    try {
      const [race] = await db.insert(races).values(raceData).returning()

      logger.info('Race imported successfully', {
        raceId: race.id,
        name: race.name,
        source: importData.source,
        importedBy: session.user.id,
        duplicateCheckPassed: true,
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
