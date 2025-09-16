'use client'

import { Suspense } from 'react'

import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'

import AsyncStravaDashboardWidget from './AsyncStravaDashboardWidget'
import { StravaDashboardWidgetSkeleton } from './StravaDashboardWidgetSkeleton'

interface StravaDashboardWidgetProps {
  className?: string
}

/**
 * Strava integration widget with Error Boundary and Suspense
 * Provides robust error handling and seamless loading experience
 */
const StravaDashboardWidget = ({ className = '' }: StravaDashboardWidgetProps) => {
  return (
    <ModernErrorBoundary>
      <Suspense fallback={<StravaDashboardWidgetSkeleton className={className} />}>
        <AsyncStravaDashboardWidget className={className} />
      </Suspense>
    </ModernErrorBoundary>
  )
}

StravaDashboardWidget.displayName = 'StravaDashboardWidget'

export default StravaDashboardWidget
