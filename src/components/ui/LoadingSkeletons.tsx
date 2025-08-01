'use client'

import { Card, CardBody, Skeleton } from '@heroui/react'

/**
 * Enhanced loading skeleton components for better Suspense integration
 * Provides consistent, accessible loading states across the application
 */

export const WorkoutCardSkeleton = () => (
  <Card className="w-full">
    <CardBody className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-6 w-32 rounded" />
          </div>
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Skeleton className="w-20 h-5 rounded-full" />
          <Skeleton className="w-24 h-8 rounded" />
        </div>
      </div>
    </CardBody>
  </Card>
)

export const TrainingPlanCardSkeleton = () => (
  <Card className="w-full">
    <CardBody className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Skeleton className="w-20 h-6 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="w-16 h-8 rounded" />
            <Skeleton className="w-16 h-8 rounded" />
          </div>
        </div>
      </div>
    </CardBody>
  </Card>
)

export const ConversationListSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="w-full">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <Skeleton className="h-4 w-full rounded" />
            </div>
          </div>
        </CardBody>
      </Card>
    ))}
  </div>
)

export const DashboardStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="w-full">
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
        </CardBody>
      </Card>
    ))}
  </div>
)

export const WorkoutListSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <WorkoutCardSkeleton key={i} />
    ))}
  </div>
)

export const TrainingPlanGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(count)].map((_, i) => (
      <TrainingPlanCardSkeleton key={i} />
    ))}
  </div>
)

// Specialized loading states
export const PageContentSkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-5 w-64 rounded" />
      </div>
      <Skeleton className="w-32 h-10 rounded" />
    </div>

    <div className="space-y-6">
      <DashboardStatsSkeleton />
      <TrainingPlanGridSkeleton count={3} />
    </div>
  </div>
)

// Generic fallback for unknown content types
export const GenericContentSkeleton = ({
  rows = 3,
  showHeader = true,
}: {
  rows?: number
  showHeader?: boolean
}) => (
  <div className="space-y-6">
    {showHeader && (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-5 w-64 rounded" />
      </div>
    )}

    <div className="space-y-4">
      {[...Array(rows)].map((_, i) => (
        <Card key={i} className="w-full">
          <CardBody className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  </div>
)
