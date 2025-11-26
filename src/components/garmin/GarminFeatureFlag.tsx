'use client'

import { useFeatureFlagEnabled } from 'posthog-js/react'

import { useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'

const logger = createLogger('GarminFeatureFlag')

interface GarminFeatureFlagProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Type for PostHog mock used in E2E tests
interface PostHogMock {
  isFeatureEnabled?: (flag: string) => boolean
  getFeatureFlag?: (flag: string) => boolean | string | undefined
  onFeatureFlags?: (callback: () => void) => void
  has_opted_in_capturing?: () => boolean
  capture?: () => void
  identify?: () => void
}

/**
 * Gets the Garmin feature flag value, supporting both real PostHog and test mocks
 *
 * In test mode (window.__POSTHOG_TEST_MODE__ = true), reads from window.posthog mock
 * In production, uses the PostHog React hook
 */
function useGarminFeatureFlag(): boolean {
  const [mounted, setMounted] = useState(false)
  const [testModeValue, setTestModeValue] = useState<boolean | undefined>(undefined)

  // Get value from PostHog React hook (used in production)
  const posthogHookValue = useFeatureFlagEnabled('garmin-integration')

  // Check for test mode and mock values on client-side
  useEffect(() => {
    setMounted(true)

    // Check if we're in test mode with a mock
    if (typeof window !== 'undefined') {
      const win = window as typeof window & {
        __POSTHOG_TEST_MODE__?: boolean
        posthog?: PostHogMock
      }

      if (win.__POSTHOG_TEST_MODE__ && win.posthog) {
        // Read from the mock's getFeatureFlag or isFeatureEnabled
        const mockValue =
          win.posthog.getFeatureFlag?.('garmin-integration') ??
          win.posthog.isFeatureEnabled?.('garmin-integration') ??
          false

        setTestModeValue(Boolean(mockValue))
        logger.debug('Using test mode feature flag value', { value: mockValue })
      }
    }
  }, [])

  // Return test mode value if available, otherwise use PostHog hook
  if (!mounted) {
    return false
  }

  if (testModeValue !== undefined) {
    return testModeValue
  }

  return posthogHookValue ?? false
}

/**
 * Feature flag wrapper for Garmin integration
 *
 * Conditionally renders Garmin components based on the 'garmin-integration' feature flag.
 *
 * Usage:
 * <GarminFeatureFlag>
 *   <GarminDashboardWidget />
 * </GarminFeatureFlag>
 *
 * Feature flag name: 'garmin-integration'
 * - Default: false (disabled)
 * - Gradual rollout: 5% → 25% → 50% → 100%
 */
export default function GarminFeatureFlag({ children, fallback = null }: GarminFeatureFlagProps) {
  const [mounted, setMounted] = useState(false)
  const isGarminEnabled = useGarminFeatureFlag()

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Return null on server-side to prevent hydration issues
  if (!mounted) {
    return fallback as React.ReactElement | null
  }

  // Check feature flag on client-side
  if (!isGarminEnabled) {
    logger.debug('Garmin integration feature flag is disabled')
    return fallback as React.ReactElement | null
  }

  logger.debug('Garmin integration feature flag is enabled')
  return <>{children}</>
}
