'use client'

import { Card, CardBody } from '@heroui/react'

import { ReactNode } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface FeatureFlagGuardProps {
  /**
   * The feature flag key to check
   */
  flagKey: string
  /**
   * Default value while loading or if flag check fails
   */
  defaultValue?: boolean
  /**
   * Content to render when flag is enabled
   */
  children: ReactNode
  /**
   * Optional fallback content when flag is disabled
   */
  fallback?: ReactNode
  /**
   * Optional loading state while checking flag
   */
  loading?: ReactNode
}

/**
 * Feature Flag Guard Component
 *
 * Conditionally renders children based on PostHog feature flag status.
 * Shows fallback content when feature is disabled.
 *
 * @example
 * ```tsx
 * <FeatureFlagGuard
 *   flagKey="settings-functionality"
 *   fallback={<div>Settings coming soon!</div>}
 * >
 *   <SettingsPage />
 * </FeatureFlagGuard>
 * ```
 */
export function FeatureFlagGuard({
  flagKey,
  defaultValue = false,
  children,
  fallback,
}: FeatureFlagGuardProps) {
  const isEnabled = useFeatureFlag(flagKey, defaultValue)

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>
    }

    // Default fallback UI
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Card className="border-2 border-mountain-mist/30 bg-gradient-to-br from-white to-mountain-snow/30 shadow-xl dark:from-mountain-shadow dark:to-mountain-shadow/80">
          <CardBody className="gap-6 p-8">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-mountain-peak dark:text-mountain-snow">
                🏔️ Feature Coming Soon
              </h2>
              <p className="text-lg text-mountain-ridge dark:text-mountain-mist">
                This feature is currently being refined and will be available soon.
              </p>
              <p className="mt-4 text-sm text-mountain-mist dark:text-mountain-ridge">
                We&apos;re working hard to bring you the best experience possible.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Inline Feature Flag Component
 *
 * Simpler version for inline conditional rendering without fallback UI.
 *
 * @example
 * ```tsx
 * <InlineFeatureFlag flagKey="notifications">
 *   <NotificationBell />
 * </InlineFeatureFlag>
 * ```
 */
export function InlineFeatureFlag({
  flagKey,
  defaultValue = false,
  children,
}: {
  flagKey: string
  defaultValue?: boolean
  children: ReactNode
}) {
  const isEnabled = useFeatureFlag(flagKey, defaultValue)

  if (!isEnabled) {
    return null
  }

  return <>{children}</>
}
