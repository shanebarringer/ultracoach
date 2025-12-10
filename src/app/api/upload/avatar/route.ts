import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { eq } from 'drizzle-orm'

import { getServerSession } from '@/utils/auth-server'
import { db } from '@/lib/db'
import { user_profiles } from '@/lib/schema'
import { createLogger } from '@/lib/logger'

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `avatar-${session.user.id}-${timestamp}.${extension}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    
    try {
      await writeFile(join(uploadsDir, 'test'), '')
      await unlink(join(uploadsDir, 'test'))
    } catch {
      // Directory doesn't exist, create it
      const { mkdir } = await import('fs/promises')
      await mkdir(uploadsDir, { recursive: true })
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadsDir, filename)
    
    await writeFile(filePath, buffer)

    // Generate public URL
    const avatarUrl = `/uploads/avatars/${filename}`

    // Update or create user profile with new avatar URL
    const existingProfile = await db
      .select()
      .from(user_profiles)
      .where(eq(user_profiles.user_id, session.user.id))
      .limit(1)

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
          updated_at: new Date()
        })
        .where(eq(user_profiles.user_id, session.user.id))
    } else {
      // Create new profile
      await db.insert(user_profiles).values({
        user_id: session.user.id,
        avatar_url: avatarUrl,
      })
    }

    logger.info('Avatar uploaded successfully', {
      userId: session.user.id,
      filename,
      fileSize: file.size,
    })

    return NextResponse.json({ 
      avatarUrl,
      message: 'Avatar uploaded successfully' 
    })

  } catch (error) {
    logger.error('Avatar upload failed:', error)
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current avatar URL
    const existingProfile = await db
      .select()
      .from(user_profiles)
      .where(eq(user_profiles.user_id, session.user.id))
      .limit(1)

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
      await db
        .update(user_profiles)
        .set({ 
          avatar_url: null,
          updated_at: new Date()
        })
        .where(eq(user_profiles.user_id, session.user.id))
    }

    logger.info('Avatar removed successfully', {
      userId: session.user.id,
    })

    return NextResponse.json({ 
      message: 'Avatar removed successfully' 
    })

  } catch (error) {
    logger.error('Avatar removal failed:', error)
    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    )
  }
}
