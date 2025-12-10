import { eq } from 'drizzle-orm'
import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { user_profiles } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('AvatarUploadAPI')

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')

    try {
      const { mkdir } = await import('fs/promises')
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, that's fine
      logger.debug('Directory creation result:', error)
    }

    // Save the file (buffer already available from validation)
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Generate public URL
    const avatarUrl = `/uploads/avatars/${filename}`

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
        // Delete old avatar file if it exists
        const oldAvatarUrl = existingProfile[0].avatar_url
        if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
          try {
            const oldFilePath = join(process.cwd(), 'public', oldAvatarUrl)
            await unlink(oldFilePath)
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

    return NextResponse.json({
      avatarUrl,
      message: 'Avatar uploaded successfully',
    })
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

      // Delete file if it's a local upload
      if (avatarUrl.startsWith('/uploads/avatars/')) {
        try {
          const filePath = join(process.cwd(), 'public', avatarUrl)
          await unlink(filePath)
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
