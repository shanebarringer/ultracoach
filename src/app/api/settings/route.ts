import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'
import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user_settings } from '@/lib/schema'

const logger = createLogger('api/settings')

// Get user settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user settings
    const [userSettings] = await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, session.user.id))

    // If no settings exist, create default settings
    if (!userSettings) {
      const [newSettings] = await db
        .insert(user_settings)
        .values({
          user_id: session.user.id,
        })
        .returning()

      return NextResponse.json({
        success: true,
        settings: newSettings,
      })
    }

    return NextResponse.json({
      success: true,
      settings: userSettings,
    })
  } catch (error) {
    logger.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
  }
}

// Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      notification_preferences,
      display_preferences,
      unit_preferences,
      privacy_settings,
      communication_settings,
      training_preferences,
    } = body

    // Validate that at least one settings section is provided
    if (
      !notification_preferences &&
      !display_preferences &&
      !unit_preferences &&
      !privacy_settings &&
      !communication_settings &&
      !training_preferences
    ) {
      return NextResponse.json(
        { error: 'At least one settings section must be provided' },
        { status: 400 }
      )
    }

    // Check if user settings exist
    const [existingSettings] = await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, session.user.id))

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    }

    // Only update provided sections
    if (notification_preferences) {
      updateData.notification_preferences = notification_preferences
    }
    if (display_preferences) {
      updateData.display_preferences = display_preferences
    }
    if (unit_preferences) {
      updateData.unit_preferences = unit_preferences
    }
    if (privacy_settings) {
      updateData.privacy_settings = privacy_settings
    }
    if (communication_settings) {
      updateData.communication_settings = communication_settings
    }
    if (training_preferences) {
      updateData.training_preferences = training_preferences
    }

    let updatedSettings

    if (!existingSettings) {
      // Create new settings with provided data
      const [newSettings] = await db
        .insert(user_settings)
        .values({
          user_id: session.user.id,
          ...updateData,
        })
        .returning()

      updatedSettings = newSettings
    } else {
      // Update existing settings
      const [updated] = await db
        .update(user_settings)
        .set(updateData)
        .where(eq(user_settings.user_id, session.user.id))
        .returning()

      updatedSettings = updated
    }

    logger.info(`User settings updated for user ${session.user.id}`, {
      sectionsUpdated: Object.keys(updateData).filter(key => key !== 'updated_at'),
    })

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    logger.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 })
  }
}

// Update specific settings section
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { section, settings } = body

    if (!section || !settings) {
      return NextResponse.json({ error: 'Section and settings are required' }, { status: 400 })
    }

    // Validate section name
    const validSections = [
      'notification_preferences',
      'display_preferences',
      'unit_preferences',
      'privacy_settings',
      'communication_settings',
      'training_preferences',
    ]

    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user settings exist
    const [existingSettings] = await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, session.user.id))

    let updatedSettings

    if (!existingSettings) {
      // Create new settings with the specific section
      const newSettingsData = {
        user_id: session.user.id,
        [section]: settings,
      }

      const [newSettings] = await db.insert(user_settings).values(newSettingsData).returning()

      updatedSettings = newSettings
    } else {
      // Merge with existing settings for the section
      const currentSectionSettings =
        (existingSettings[section as keyof typeof existingSettings] as Record<string, unknown>) ||
        {}
      const mergedSettings = { ...currentSectionSettings, ...settings }

      const [updated] = await db
        .update(user_settings)
        .set({
          [section]: mergedSettings,
          updated_at: new Date(),
        })
        .where(eq(user_settings.user_id, session.user.id))
        .returning()

      updatedSettings = updated
    }

    logger.info(`User settings section updated for user ${session.user.id}`, {
      section,
      settingsKeys: Object.keys(settings),
    })

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    logger.error('Error updating user settings section:', error)
    return NextResponse.json({ error: 'Failed to update user settings section' }, { status: 500 })
  }
}
