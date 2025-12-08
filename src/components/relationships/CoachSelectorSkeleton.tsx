'use client'

import { Card, CardBody } from '@heroui/react'

/**
 * Skeleton loading state for CoachSelector component
 * Matches the actual CoachSelector layout
 */
export function CoachSelectorSkeleton() {
  return (
    <Card className="w-full" data-testid="coach-selector-skeleton">
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 bg-default-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-default-200 rounded animate-pulse" />
          </div>

          <div className="h-10 w-full bg-default-200 rounded animate-pulse mb-4" />

          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-default-50 rounded-lg">
              <div className="h-12 w-12 bg-default-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-default-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-default-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-default-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
