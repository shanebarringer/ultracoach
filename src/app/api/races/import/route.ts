import { and, ilike, or, sql } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { addRateLimitHeaders, formatRetryAfter, raceImportLimiter } from '@/lib/redis-rate-limiter'
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
    waypoints?: Array<{
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

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await raceImportLimiter.check(session.user.id)
    if (!rateLimitResult.allowed) {
      const retryDisplay = formatRetryAfter(rateLimitResult.retryAfter)
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Too many race imports. Please try again in ${retryDisplay}.`,
          retryAfter: rateLimitResult.retryAfter, // Always in seconds for API consistency
        },
        { status: 429 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
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

    // Validate source type
    if (!importData.source || !['gpx', 'csv'].includes(importData.source)) {
      return NextResponse.json(
        { error: 'Invalid source type - must be "gpx" or "csv"' },
        { status: 400 }
      )
    }

    // Validate GPX data structure when source is 'gpx'
    if (importData.source === 'gpx') {
      // Ensure gpx_data exists
      if (!importData.gpx_data) {
        logger.warn('GPX import missing gpx_data', { userId: session.user.id })
        return NextResponse.json(
          { error: 'GPX data is required when source is "gpx"' },
          { status: 400 }
        )
      }

      // Validate tracks array exists and is valid
      if (!Array.isArray(importData.gpx_data.tracks)) {
        logger.warn('GPX import has invalid tracks structure', { userId: session.user.id })
        return NextResponse.json(
          { error: 'Invalid GPX data - tracks must be an array' },
          { status: 400 }
        )
      }

      // Ensure at least one track contains points
      const hasValidTrack = importData.gpx_data.tracks.some(
        track => track.points && Array.isArray(track.points) && track.points.length > 0
      )
      if (!hasValidTrack) {
        logger.warn('GPX import has no valid tracks with points', { userId: session.user.id })
        return NextResponse.json(
          { error: 'GPX data must contain at least one track with points' },
          { status: 400 }
        )
      }

      // Validate waypoints array if provided
      if (importData.gpx_data.waypoints && !Array.isArray(importData.gpx_data.waypoints)) {
        return NextResponse.json(
          { error: 'Invalid GPX data - waypoints must be an array' },
          { status: 400 }
        )
      }

      // Count total track points and enforce limits
      const totalPoints = importData.gpx_data.tracks.reduce((sum, track) => {
        if (!track.points || !Array.isArray(track.points)) {
          return sum
        }
        return sum + track.points.length
      }, 0)

      // Limit to 50,000 points to prevent memory exhaustion
      if (totalPoints > 50000) {
        logger.warn('GPX file too large', {
          totalPoints,
          userId: session.user.id,
          raceName: raceData.name,
        })
        return NextResponse.json(
          {
            error: 'GPX file too large',
            details: `GPX file contains ${totalPoints} points. Maximum allowed is 50,000 points.`,
          },
          { status: 413 }
        )
      }

      // Validate track point structure from ALL tracks (sample from each track)
      for (let trackIndex = 0; trackIndex < importData.gpx_data.tracks.length; trackIndex++) {
        const track = importData.gpx_data.tracks[trackIndex]
        if (track.points && track.points.length > 0) {
          // Sample one representative point from each track (middle point)
          const pointCount = track.points.length
          const sampleIndex = Math.floor(pointCount / 2)
          const samplePoint = track.points[sampleIndex]

          if (samplePoint) {
            // Validate lat/lon are numbers
            if (typeof samplePoint.lat !== 'number' || typeof samplePoint.lon !== 'number') {
              return NextResponse.json(
                {
                  error: 'Invalid GPX data - track points must have numeric lat/lon',
                  details: `Invalid point in track ${trackIndex + 1} at index ${sampleIndex}`,
                },
                { status: 400 }
              )
            }

            // Validate lat/lon ranges
            if (
              samplePoint.lat < -90 ||
              samplePoint.lat > 90 ||
              samplePoint.lon < -180 ||
              samplePoint.lon > 180
            ) {
              return NextResponse.json(
                {
                  error: 'Invalid GPX data - lat/lon out of valid range',
                  details: `Track ${trackIndex + 1}, Point ${sampleIndex}: Latitude must be between -90 and 90, longitude between -180 and 180`,
                },
                { status: 400 }
              )
            }
          }
        }
      }

      // Log GPX validation success with metrics for audit purposes
      const trackCounts = importData.gpx_data.tracks.map(track => track.points?.length || 0)
      const waypointCount = importData.gpx_data.waypoints?.length || 0
      logger.info('GPX validation passed', {
        userId: session.user.id,
        totalPoints,
        trackCount: importData.gpx_data.tracks.length,
        trackCounts,
        waypointCount,
      })
    }

    // Validate CSV data (basic validation for required fields)
    if (importData.source === 'csv') {
      // Ensure minimum required fields are present for CSV imports
      if (!importData.name || importData.name.trim().length === 0) {
        return NextResponse.json({ error: 'CSV import requires race name' }, { status: 400 })
      }

      // Validate distance for CSV imports
      if (!importData.distance_miles || importData.distance_miles <= 0) {
        return NextResponse.json(
          {
            error: 'CSV import requires valid distance',
            details: 'Distance must be greater than 0',
          },
          { status: 400 }
        )
      }

      logger.info('CSV validation passed', {
        raceName: raceData.name,
        distance: raceData.distance_miles,
        userId: session.user.id,
      })
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

      const response = NextResponse.json(
        {
          race,
          message: `Race "${race.name}" imported successfully`,
        },
        { status: 201 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    } catch (error) {
      logger.error('Database error creating imported race:', error)
      return NextResponse.json({ error: 'Failed to save race to database' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Error in POST /api/races/import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
