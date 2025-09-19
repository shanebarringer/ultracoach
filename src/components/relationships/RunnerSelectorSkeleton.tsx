import { Card, CardBody, Input } from '@heroui/react'

/**
 * Skeleton component for RunnerSelector
 * Provides loading state that matches the actual component structure
 */
export function RunnerSelectorSkeleton() {
  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 bg-default-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-default-200 rounded animate-pulse" />
          </div>

          {/* Search input skeleton */}
          <Input
            placeholder="Loading runners..."
            variant="bordered"
            className="mb-4"
            isDisabled
            startContent={<div className="h-4 w-4 bg-default-200 rounded animate-pulse" />}
          />

          {/* Runner cards skeleton */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-default-50 rounded-lg transition-colors"
            >
              {/* Avatar skeleton */}
              <div className="h-12 w-12 bg-default-200 rounded-full animate-pulse flex-shrink-0" />

              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 bg-default-200 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-default-200 rounded animate-pulse" />
                </div>
                <div className="h-3 w-32 bg-default-200 rounded animate-pulse" />
              </div>

              {/* Connect button skeleton */}
              <div className="h-8 w-20 bg-default-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
