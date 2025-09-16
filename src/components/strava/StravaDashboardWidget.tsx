'use client'

import { Suspense } from 'react'

import AsyncStravaDashboardWidget from './AsyncStravaDashboardWidget'
import { StravaDashboardWidgetSkeleton } from './StravaDashboardWidgetSkeleton'

interface StravaDashboardWidgetProps {
  className?: string
}

/**
 * Strava integration widget with Suspense boundary
 * Provides seamless loading experience using Suspense pattern
 */
const StravaDashboardWidget = ({ className = '' }: StravaDashboardWidgetProps) => {
  return (
    <Suspense fallback={<StravaDashboardWidgetSkeleton className={className} />}>
      <AsyncStravaDashboardWidget className={className} />
    </Suspense>
  )
}

StravaDashboardWidget.displayName = 'StravaDashboardWidget'

export default StravaDashboardWidget
