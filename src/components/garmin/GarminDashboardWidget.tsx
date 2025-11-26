'use client'

import { Suspense } from 'react'

import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'

import AsyncGarminDashboardWidget from './AsyncGarminDashboardWidget'
import { GarminDashboardWidgetSkeleton } from './GarminDashboardWidgetSkeleton'

interface GarminDashboardWidgetProps {
  className?: string
}

/**
 * Garmin integration widget with Error Boundary and Suspense
 * Provides robust error handling and seamless loading experience
 */
const GarminDashboardWidget = ({ className = '' }: GarminDashboardWidgetProps) => {
  return (
    <ModernErrorBoundary>
      <Suspense fallback={<GarminDashboardWidgetSkeleton className={className} />}>
        <AsyncGarminDashboardWidget className={className} />
      </Suspense>
    </ModernErrorBoundary>
  )
}

GarminDashboardWidget.displayName = 'GarminDashboardWidget'

export default GarminDashboardWidget
