import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { social_profiles } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('SocialProfilesAPI')

// Valid platform values matching the schema enum
const VALID_PLATFORMS = [
  'strava',
  'instagram',
  'twitter',
  'youtube',
  'facebook',
  'linkedin',
  'tiktok',
] as const

const createSocialProfileSchema = z.object({
  platform: z.enum(VALID_PLATFORMS),
  profile_url: z.string().url().max(500),
  display_name: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate input data
    let validatedData
    try {
      validatedData = createSocialProfileSchema.parse(body)
    } catch (error) {
      logger.warn('Social profile validation failed:', error)
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: error instanceof z.ZodError ? error.issues : 'Validation failed',
        },
        { status: 400 }
      )
    }

    const { platform, profile_url, display_name } = validatedData

    // Check for duplicate (user_id, platform) combination
    const existingProfile = await db
      .select()
      .from(social_profiles)
      .where(
        and(eq(social_profiles.user_id, session.user.id), eq(social_profiles.platform, platform))
      )
      .limit(1)

    if (existingProfile.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate profile',
          message: `You already have a ${platform} profile connected`,
        },
        { status: 409 }
      )
    }

    // Insert the new social profile
    const [newProfile] = await db
      .insert(social_profiles)
      .values({
        user_id: session.user.id,
        platform,
        profile_url,
        display_name: display_name || null,
        is_verified: false,
        is_public: true,
      })
      .returning()

    logger.info('Social profile created', {
      userId: session.user.id,
      platform,
      profileId: newProfile.id,
    })

    return NextResponse.json(newProfile, { status: 201 })
  } catch (error) {
    logger.error('Failed to create social profile:', error)

    // Handle database errors
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string }

      // Unique constraint violation (backup check)
      if (dbError.code === '23505') {
        return NextResponse.json(
          {
            error: 'Duplicate profile',
            message: 'This platform is already connected',
          },
          { status: 409 }
        )
      }

      // Foreign key violation
      if (dbError.code === '23503') {
        return NextResponse.json(
          {
            error: 'Invalid user',
            message: 'User does not exist',
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Failed to create social profile' }, { status: 500 })
  }
}
