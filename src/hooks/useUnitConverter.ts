'use client'

/**
 * useUnitConverter Hook
 *
 * React hook that provides a UnitConverter instance based on user settings.
 * Automatically updates when user preferences change.
 */

import { useAtomValue } from 'jotai'

import { useMemo } from 'react'

import { asyncUserSettingsAtom } from '@/lib/atoms/settings'
import { DEFAULT_UNIT_PREFS, UnitConverter } from '@/lib/units/converter'

export function useUnitConverter(): UnitConverter {
  const userSettings = useAtomValue(asyncUserSettingsAtom)
  const unitPrefs = userSettings?.unit_preferences

  // Create converter instance, memoized based on preferences
  return useMemo(() => {
    return new UnitConverter(unitPrefs ?? DEFAULT_UNIT_PREFS)
  }, [unitPrefs])
}
