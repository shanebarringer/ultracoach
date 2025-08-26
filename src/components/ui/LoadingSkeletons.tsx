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

// Coach Dashboard Skeleton
export const CoachDashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Page Header */}
    <div className="flex flex-col lg:flex-row justify-between gap-6">
      <div>
        <Skeleton className="h-9 w-56 rounded mb-2" />
        <Skeleton className="h-6 w-80 rounded" />
      </div>

      {/* Quick Stats Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Primary Column - Athletes */}
      <div className="xl:col-span-2 space-y-6">
        {/* Your Athletes Card */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-divider">
              <div>
                <Skeleton className="h-6 w-32 rounded mb-2" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <Skeleton className="h-8 w-20 rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-divider rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-3 w-32 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-7 flex-1 rounded" />
                    <Skeleton className="h-7 flex-1 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Training Expeditions Card */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-divider">
              <div>
                <Skeleton className="h-6 w-40 rounded mb-2" />
                <Skeleton className="h-4 w-36 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded" />
            </div>

            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-divider rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Secondary Column - Analytics */}
      <div className="xl:col-span-2 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-t-4 border-t-primary/60">
              <CardBody className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-8 w-12 rounded" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                  </div>
                  <Skeleton className="w-12 h-12 rounded-lg" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-8 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Strava Widget */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-6 w-32 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="space-y-2 mb-4">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border border-divider rounded-lg"
                >
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
)

// Runner Dashboard Skeleton
export const RunnerDashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Enhanced Header */}
    <div className="flex justify-between items-start">
      <div>
        <Skeleton className="h-9 w-56 rounded mb-2" />
        <Skeleton className="h-5 w-80 rounded" />
      </div>

      <Card className="p-4">
        <div className="text-center space-y-1">
          <Skeleton className="h-3 w-32 rounded mx-auto" />
          <Skeleton className="h-8 w-12 rounded mx-auto" />
          <Skeleton className="h-4 w-24 rounded mx-auto" />
        </div>
      </Card>
    </div>

    {/* Advanced Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-t-4 border-t-primary/60">
          <CardBody className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-8 w-12 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Training Plans Column */}
      <div className="xl:col-span-2 space-y-8">
        {/* Active Training Plans */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Skeleton className="h-6 w-48 rounded mb-2" />
                <Skeleton className="h-4 w-56 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded" />
            </div>

            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border border-divider rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* This Week's Workouts */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Skeleton className="h-6 w-40 rounded mb-2" />
                <Skeleton className="h-4 w-52 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded" />
            </div>

            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-divider rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-32 rounded" />
                        <Skeleton className="h-4 w-48 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded" />
                      <Skeleton className="h-8 w-20 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Side Column */}
      <div className="space-y-6">
        {/* Strava Widget */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-6 w-32 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </CardBody>
        </Card>

        {/* Coach Connection */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="space-y-2 mb-4">
              <Skeleton className="h-6 w-28 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-divider rounded-lg">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
)

// Chat Window Skeleton
export const ChatWindowSkeleton = () => (
  <div className="flex flex-col h-full min-h-0">
    {/* Chat Header Skeleton */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>

    {/* Messages Area Skeleton */}
    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-sm ${i % 3 === 0 ? 'order-2' : 'order-1'}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Card className="p-3">
                <Skeleton className="h-4 w-full rounded mb-1" />
                {i % 4 === 0 && <Skeleton className="h-4 w-2/3 rounded" />}
              </Card>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Message Input Skeleton */}
    <div className="border-t border-divider p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-20 rounded" />
      </div>
    </div>
  </div>
)

// Workouts Page Skeleton
export const WorkoutsPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-32 rounded mb-2" />
        <Skeleton className="h-5 w-48 rounded" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded" />
        <Skeleton className="h-10 w-28 rounded" />
      </div>
    </div>

    {/* Filter Bar */}
    <div className="flex flex-wrap gap-3 p-4 bg-content2 rounded-lg">
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-8 w-24 rounded" />
      <Skeleton className="h-8 w-28 rounded" />
      <Skeleton className="h-8 w-16 rounded" />
    </div>

    {/* Workouts List */}
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <WorkoutCardSkeleton key={i} />
      ))}
    </div>
  </div>
)

// Training Plans Page Skeleton
export const TrainingPlansPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-40 rounded mb-2" />
        <Skeleton className="h-5 w-56 rounded" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded" />
        <Skeleton className="h-10 w-32 rounded" />
      </div>
    </div>

    {/* Tabs */}
    <div className="flex gap-1 p-1 bg-content2 rounded-lg w-fit">
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-8 w-24 rounded" />
      <Skeleton className="h-8 w-28 rounded" />
    </div>

    {/* Training Plans Grid */}
    <TrainingPlanGridSkeleton count={6} />
  </div>
)

// Settings Page Skeleton
export const SettingsPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div>
      <Skeleton className="h-8 w-24 rounded mb-2" />
      <Skeleton className="h-5 w-48 rounded" />
    </div>

    {/* Settings Navigation */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardBody className="p-6">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-6 w-32 rounded mb-2" />
                <Skeleton className="h-4 w-full rounded mb-4" />
              </div>

              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Skeleton className="h-10 w-20 rounded" />
                <Skeleton className="h-10 w-16 rounded" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
)

// Races Page Skeleton
export const RacesPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header Section */}
    <Card className="bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
      <CardBody className="p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-5 w-72 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded" />
            <Skeleton className="h-10 w-28 rounded" />
          </div>
        </div>
      </CardBody>
    </Card>

    {/* Search & Filter Section */}
    <Card>
      <CardBody className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>
      </CardBody>
    </Card>

    {/* Races Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border-l-4 border-l-primary/60">
          <CardBody className="p-6">
            {/* Race Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            </div>

            {/* Race Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 mt-4 border-t border-divider">
              <Skeleton className="h-8 w-full rounded" />
            </div>
          </CardBody>
        </Card>
      ))}
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
