import { Card, CardBody, CardHeader, Chip } from '@heroui/react'

interface StravaDashboardWidgetSkeletonProps {
  className?: string
}

/**
 * Skeleton component for StravaDashboardWidget
 * Provides loading state that matches the actual component structure
 */
export function StravaDashboardWidgetSkeleton({
  className = '',
}: StravaDashboardWidgetSkeletonProps) {
  return (
    <Card className={`h-fit ${className}`} data-testid="strava-dashboard-widget-skeleton">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-default-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-default-200 rounded animate-pulse" />
          </div>
          <Chip size="sm" variant="flat" isDisabled>
            <div className="h-4 w-16 bg-default-200 rounded animate-pulse" />
          </Chip>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Connection setup placeholder */}
        <div className="text-center py-4">
          <div className="h-12 w-12 bg-default-200 rounded-full animate-pulse mx-auto mb-4" />
          <div className="h-5 w-32 bg-default-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-48 bg-default-200 rounded animate-pulse mx-auto mb-4" />
          <div className="h-10 w-full bg-default-200 rounded animate-pulse" />
        </div>

        {/* Quick actions skeleton */}
        <div className="flex gap-2">
          <div className="h-8 flex-1 bg-default-200 rounded animate-pulse" />
          <div className="h-8 flex-1 bg-default-200 rounded animate-pulse" />
        </div>

        {/* Recent activities section skeleton */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="h-4 w-20 bg-default-200 rounded animate-pulse" />
            <div className="h-6 w-6 bg-default-200 rounded animate-pulse" />
          </div>

          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-content2">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-default-200 rounded animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-12 bg-default-200 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-default-200 rounded animate-pulse" />
                    <div className="h-3 w-3 bg-default-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-default-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 bg-default-200 rounded animate-pulse" />
                  <div className="h-3 w-3 bg-default-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status footer skeleton */}
        <div className="pt-3 border-t border-divider">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-default-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-default-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-12 bg-default-200 rounded animate-pulse" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
