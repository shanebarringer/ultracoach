'use client'

/**
 * ThemeWrapper
 *
 * Applies user display preferences to the application:
 * - Theme (light/dark/system) from user settings or legacy themeModeAtom
 * - Interface density (compact/comfortable/spacious)
 * - Animations and reduced motion
 */
import { useAtom, useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'

import { useEffect, useMemo } from 'react'

import { userAtom } from '@/lib/atoms/auth'
import { themeModeAtom } from '@/lib/atoms/index'
import { asyncUserSettingsAtom } from '@/lib/atoms/settings'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ThemeWrapper')

// Create a loadable version of the settings atom to handle loading/error states
const loadableUserSettingsAtom = loadable(asyncUserSettingsAtom)

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [themeMode] = useAtom(themeModeAtom) // Legacy atom for backward compatibility
  const user = useAtomValue(userAtom)

  // Always subscribe to settings atom (hooks must be called unconditionally)
  // The atom itself handles unauthenticated state by returning null on 401
  const loadableSettings = useAtomValue(loadableUserSettingsAtom)

  // Only use settings if user is authenticated and settings loaded successfully
  const displayPrefs = useMemo(() => {
    if (!user) return null
    if (loadableSettings.state !== 'hasData') return null
    return loadableSettings.data?.display_preferences
  }, [user, loadableSettings])

  useEffect(() => {
    // Prefer user settings over legacy themeModeAtom
    const theme = displayPrefs?.theme || (themeMode === 'dark' ? 'dark' : 'light')
    const density = displayPrefs?.density || 'comfortable'
    const reducedMotion = displayPrefs?.reduced_motion || false
    const animationsEnabled = displayPrefs?.animations_enabled ?? true

    logger.debug('Applying display preferences:', {
      theme,
      density,
      reducedMotion,
      animationsEnabled,
    })

    // Apply theme (light/dark/system)
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark')
      } else if (theme === 'system') {
        // System preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      }
    }

    // Apply density (compact/comfortable/spacious)
    const applyDensity = () => {
      document.documentElement.setAttribute('data-density', density)
    }

    // Apply motion preferences
    const applyMotionPreferences = () => {
      if (reducedMotion) {
        document.documentElement.classList.add('reduce-motion')
      } else {
        document.documentElement.classList.remove('reduce-motion')
      }

      if (!animationsEnabled) {
        document.documentElement.classList.add('disable-animations')
      } else {
        document.documentElement.classList.remove('disable-animations')
      }
    }

    // Apply all preferences
    applyTheme()
    applyDensity()
    applyMotionPreferences()

    // Listen for system theme changes (only if theme is set to 'system')
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches)
        logger.debug(`System theme changed to: ${e.matches ? 'dark' : 'light'}`)
      }

      mediaQuery.addEventListener('change', handleChange)

      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [themeMode, displayPrefs])

  return <>{children}</>
}
