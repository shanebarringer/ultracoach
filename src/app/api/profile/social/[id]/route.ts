import { and, eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { social_profiles } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('SocialProfilesAPI')

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: profileId } = await params

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Verify ownership - only delete if the profile belongs to the current user
    const existingProfile = await db
      .select()
      .from(social_profiles)
      .where(and(eq(social_profiles.id, profileId), eq(social_profiles.user_id, session.user.id)))
      .limit(1)

    if (existingProfile.length === 0) {
      return NextResponse.json(
        {
          error: 'Profile not found',
          message: 'Social profile does not exist or you do not have permission to delete it',
        },
        { status: 404 }
      )
    }

    // Delete the social profile
    await db
      .delete(social_profiles)
      .where(and(eq(social_profiles.id, profileId), eq(social_profiles.user_id, session.user.id)))

    logger.info('Social profile deleted', {
      userId: session.user.id,
      profileId,
      platform: existingProfile[0].platform,
    })

    return NextResponse.json({
      success: true,
      message: 'Social profile deleted successfully',
    })
  } catch (error) {
    logger.error('Failed to delete social profile:', error)
    return NextResponse.json({ error: 'Failed to delete social profile' }, { status: 500 })
  }
}
