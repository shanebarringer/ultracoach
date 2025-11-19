'use client'

/**
 * useCommunicationSettings Hook
 *
 * React hook for accessing and checking communication preferences.
 * Handles quiet hours, auto-responses, and message delivery timing.
 */
import { useAtomValue } from 'jotai'

import { useMemo } from 'react'

import { asyncUserSettingsAtom } from '@/lib/atoms/settings'
import * as communicationUtils from '@/lib/privacy/communication-utils'

export function useCommunicationSettings() {
  const userSettings = useAtomValue(asyncUserSettingsAtom)
  const communicationSettings = userSettings?.communication_settings

  return useMemo(
    () => ({
      settings: communicationSettings,

      // Quiet hours checks
      isInQuietHours: () => communicationUtils.isInQuietHours(communicationSettings),

      getAutoResponseMessage: () =>
        communicationUtils.getAutoResponseMessage(communicationSettings),

      hasTypingIndicatorsEnabled: () =>
        communicationUtils.hasTypingIndicatorsEnabled(communicationSettings),

      hasMessageSoundsEnabled: () =>
        communicationUtils.hasMessageSoundsEnabled(communicationSettings),

      shouldDelayNotification: () =>
        communicationUtils.shouldDelayNotification(communicationSettings),

      formatQuietHours: () => communicationUtils.formatQuietHours(communicationSettings),
    }),
    [communicationSettings]
  )
}
