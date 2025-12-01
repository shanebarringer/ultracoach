'use client'

/**
 * usePrivacySettings Hook
 *
 * React hook for accessing and checking privacy settings.
 * Provides easy access to privacy utilities based on user settings.
 */
import { useAtomValue } from 'jotai'

import { useMemo } from 'react'

import { asyncUserSettingsAtom } from '@/lib/atoms/settings'
import * as privacyUtils from '@/lib/privacy/privacy-utils'

export function usePrivacySettings() {
  const userSettings = useAtomValue(asyncUserSettingsAtom)
  const privacySettings = userSettings?.privacy_settings

  return useMemo(
    () => ({
      settings: privacySettings,

      // Privacy check functions
      canViewProfile: (
        ownerId: string,
        viewerId: string,
        viewerRelationship?: 'coach' | 'runner' | null
      ) => privacyUtils.canViewProfile(ownerId, viewerId, privacySettings, viewerRelationship),

      canViewActivityStats: (ownerId: string, viewerId: string) =>
        privacyUtils.canViewActivityStats(ownerId, viewerId, privacySettings),

      canViewTrainingCalendar: (ownerId: string, viewerId: string) =>
        privacyUtils.canViewTrainingCalendar(ownerId, viewerId, privacySettings),

      canViewLocation: (ownerId: string, viewerId: string) =>
        privacyUtils.canViewLocation(ownerId, viewerId, privacySettings),

      canViewAge: (ownerId: string, viewerId: string) =>
        privacyUtils.canViewAge(ownerId, viewerId, privacySettings),

      // Connection acceptance
      acceptsCoachInvitations: () => privacyUtils.acceptsCoachInvitations(privacySettings),

      acceptsRunnerConnections: () => privacyUtils.acceptsRunnerConnections(privacySettings),

      // Data filtering
      filterUserData: <T extends Record<string, unknown>>(
        userData: T,
        ownerId: string,
        viewerId: string
      ) => privacyUtils.filterUserDataByPrivacy(userData, ownerId, viewerId, privacySettings),
    }),
    [privacySettings]
  )
}
