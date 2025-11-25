'use client'

import { useFeatureFlagEnabled } from 'posthog-js/react'

import { useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'

const logger = createLogger('GarminFeatureFlag')

interface GarminFeatureFlagProps {
  children: React.ReactNode
  fallback?: React.ReactNode
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
  const isGarminEnabled = useFeatureFlagEnabled('garmin-integration')

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
