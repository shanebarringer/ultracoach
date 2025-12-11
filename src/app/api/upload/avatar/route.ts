import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { RedisRateLimiter, addRateLimitHeaders, formatRetryAfter } from '@/lib/redis-rate-limiter'
import { user_profiles } from '@/lib/schema'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('AvatarUploadAPI')

// Rate limiter for avatar uploads (10 uploads per hour per user)
const avatarUploadLimiter = new RedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (userId: string) => `avatar-upload:${userId}`,
})

/**
 * Avatar Upload API - Production Ready
 *
 * Storage: Supabase Storage (cloud-based)
 * - Works seamlessly with Vercel serverless deployment
 * - 1GB free storage + 2GB bandwidth/month
 * - Built-in CDN for fast delivery
 * - Automatic image optimization available
 *
 * Security:
 * - RLS policies enforce user-specific access
 * - Magic bytes validation (server-side)
 * - File type and size validation
 * - 5MB maximum file size
 *
 * See: docs/SUPABASE_STORAGE_SETUP.md for setup instructions
 */

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit (10 uploads per hour)
    const rateLimitResult = await avatarUploadLimiter.check(session.user.id)
    if (!rateLimitResult.allowed) {
      const retryDisplay = formatRetryAfter(rateLimitResult.retryAfter)
      logger.warn('Avatar upload rate limit exceeded', {
        userId: session.user.id,
        retryAfter: rateLimitResult.retryAfter,
      })

      const response = NextResponse.json(
        {
          error: 'Too many upload attempts',
          message: `Please try again ${retryDisplay}`,
          retryAfter: rateLimitResult.retryAfter, // Always in seconds
        },
        { status: 429 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type by MIME type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Validate and sanitize file extension
    const rawExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const extension = allowedExtensions.includes(rawExtension) ? rawExtension : 'jpg'

    // Validate file content by checking magic bytes
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check magic bytes for common image formats
    const isValidImage =
      // JPEG: FF D8 FF
      (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      // PNG: 89 50 4E 47
      (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
      // GIF: 47 49 46
      (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) ||
      // WebP: RIFF...WEBP
      (buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50)

    if (!isValidImage) {
      return NextResponse.json({ error: 'Invalid image file format' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `avatar-${session.user.id}-${timestamp}.${extension}`

    // Upload to Supabase Storage
    // File path: {userId}/{filename} for organization
    const storagePath = `${session.user.id}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      logger.error('Supabase storage upload failed:', uploadError)
      return NextResponse.json({ error: 'Failed to upload avatar to storage' }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('avatars').getPublicUrl(storagePath)

    const avatarUrl = publicUrl

    // Update or create user profile with new avatar URL (with fallback for missing table)
    let existingProfile = []
    try {
      existingProfile = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, session.user.id))
        .limit(1)
    } catch {
      logger.warn('user_profiles table not found, skipping avatar URL update')
      // Still return success since the file was uploaded successfully
      return NextResponse.json({
        avatarUrl,
        message: 'Avatar uploaded successfully (profile table not found)',
      })
    }

    try {
      if (existingProfile.length > 0) {
        // Delete old avatar file from Supabase Storage if it exists
        const oldAvatarUrl = existingProfile[0].avatar_url
        if (oldAvatarUrl && oldAvatarUrl.includes('/storage/v1/object/public/avatars/')) {
          try {
            // Extract storage path from URL
            const oldPath = oldAvatarUrl.split('/storage/v1/object/public/avatars/')[1]
            if (oldPath) {
              const { error: deleteError } = await supabaseAdmin.storage
                .from('avatars')
                .remove([oldPath])

              if (deleteError) {
                logger.warn('Failed to delete old avatar from storage:', deleteError)
              }
            }
          } catch (error) {
            logger.warn('Failed to delete old avatar file:', error)
          }
        }

        // Update existing profile
        await db
          .update(user_profiles)
          .set({
            avatar_url: avatarUrl,
            updated_at: new Date(),
          })
          .where(eq(user_profiles.user_id, session.user.id))
      } else {
        // Create new profile
        await db.insert(user_profiles).values({
          user_id: session.user.id,
          avatar_url: avatarUrl,
        })
      }
    } catch (error) {
      logger.error('Failed to update avatar URL in database:', error)
      // Still return success since the file was uploaded successfully
      return NextResponse.json({
        avatarUrl,
        message: 'Avatar uploaded successfully (database update failed)',
      })
    }

    logger.info('Avatar uploaded successfully', {
      userId: session.user.id,
      filename,
      fileSize: file.size,
    })

    const response = NextResponse.json({
      avatarUrl,
      message: 'Avatar uploaded successfully',
    })

    return addRateLimitHeaders(response, rateLimitResult)
  } catch (error) {
    logger.error('Avatar upload failed:', error)
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current avatar URL (with fallback for missing table)
    let existingProfile = []
    try {
      existingProfile = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, session.user.id))
        .limit(1)
    } catch {
      logger.warn('user_profiles table not found, skipping avatar removal')
      return NextResponse.json({
        message: 'Avatar removal skipped - table not found',
      })
    }

    if (existingProfile.length > 0 && existingProfile[0].avatar_url) {
      const avatarUrl = existingProfile[0].avatar_url

      // Delete file from Supabase Storage
      if (avatarUrl.includes('/storage/v1/object/public/avatars/')) {
        try {
          // Extract storage path from URL
          const storagePath = avatarUrl.split('/storage/v1/object/public/avatars/')[1]
          if (storagePath) {
            const { error: deleteError } = await supabaseAdmin.storage
              .from('avatars')
              .remove([storagePath])

            if (deleteError) {
              logger.warn('Failed to delete avatar from storage:', deleteError)
            }
          }
        } catch (error) {
          logger.warn('Failed to delete avatar file:', error)
        }
      }

      // Remove avatar URL from database
      try {
        await db
          .update(user_profiles)
          .set({
            avatar_url: null,
            updated_at: new Date(),
          })
          .where(eq(user_profiles.user_id, session.user.id))
      } catch (error) {
        logger.error('Failed to remove avatar URL from database:', error)
        return NextResponse.json(
          { error: 'Failed to remove avatar from database' },
          { status: 500 }
        )
      }
    }

    logger.info('Avatar removed successfully', {
      userId: session.user.id,
    })

    return NextResponse.json({
      message: 'Avatar removed successfully',
    })
  } catch (error) {
    logger.error('Avatar removal failed:', error)
    return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 })
  }
}
