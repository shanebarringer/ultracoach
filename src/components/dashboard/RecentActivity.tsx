'use client'

import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Card, CardBody, CardHeader, Chip, Skeleton } from '@heroui/react'
import { useAtom } from 'jotai'

import { Suspense } from 'react'

import { asyncWorkoutsAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

interface RecentActivityProps {
  title?: string
  subtitle?: string
  limit?: number
  userRole?: 'coach' | 'runner'
  useSuspense?: boolean
}

interface RecentActivityContentProps {
  title: string
  subtitle: string
  limit: number
  userRole: 'coach' | 'runner'
}

function RecentActivityContent({ title, subtitle, limit }: RecentActivityContentProps) {
  const [workouts] = useAtom(asyncWorkoutsAtom)

  // Filter to completed workouts and limit results
  const recentWorkouts = workouts
    .filter((workout: Workout) => workout.status === 'completed')
    .sort((a: Workout, b: Workout) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)

  return (
    <Card
      className="hover:shadow-lg transition-shadow duration-300"
      data-testid="recent-activity-section"
    >
      <CardHeader>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-foreground-600">{subtitle}</p>
        </div>
      </CardHeader>
      <CardBody>
        {recentWorkouts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground-500">No recent workout activity.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentWorkouts.map((workout: Workout) => (
              <div
                key={workout.id}
                className="p-4 bg-content2 border-l-4 border-l-success rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">
                      {workout.actual_type || workout.planned_type}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-foreground-600 mt-1">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>{new Date(workout.date).toLocaleDateString()}</span>
                      </div>
                      {workout.actual_distance && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4" />
                          <span>{workout.actual_distance} miles</span>
                        </div>
                      )}
                      {workout.actual_duration && (
                        <div className="flex items-center gap-1">
                          <span>{workout.actual_duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Chip color="success" variant="dot" size="sm">
                    Completed
                  </Chip>
                </div>
                {workout.workout_notes && (
                  <p className="text-sm text-foreground-600 mt-2 italic">
                    &ldquo;{workout.workout_notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

const LoadingFallback = ({ title }: { title: string }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardHeader>
      <div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <Skeleton className="h-4 w-32 rounded-sm mt-1" />
      </div>
    </CardHeader>
    <CardBody>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-content2 border-l-4 border-l-gray-300 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-20 rounded-sm" />
                  <Skeleton className="h-3 w-16 rounded-sm" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
)

export default function RecentActivity({
  title = 'Recent Peaks Conquered',
  subtitle = 'Latest summit achievements',
  limit = 5,
  userRole = 'coach',
  useSuspense = true,
}: RecentActivityProps) {
  if (useSuspense) {
    return (
      <Suspense fallback={<LoadingFallback title={title} />}>
        <RecentActivityContent
          title={title}
          subtitle={subtitle}
          limit={limit}
          userRole={userRole}
        />
      </Suspense>
    )
  }

  // For backward compatibility, fall back to the component without Suspense
  // This would require implementing traditional loading logic
  return <LoadingFallback title={title} />
}
