'use client'

import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useAtomValue } from 'jotai'

import { DashboardSuspenseBoundary } from '@/components/ui/SuspenseBoundary'
import { asyncWorkoutsAtom, completedWorkoutsAtom } from '@/lib/atoms/workouts'
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
  // Trigger async workouts loading for Suspense
  useAtomValue(asyncWorkoutsAtom)

  const completedWorkouts = useAtomValue(completedWorkoutsAtom)

  // The completedWorkoutsAtom already filters and sorts, just limit results
  const recentWorkouts = completedWorkouts.slice(0, limit)

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

export default function RecentActivity({
  title = 'Recent Peaks Conquered',
  subtitle = 'Latest summit achievements',
  limit = 5,
  userRole = 'coach',
  useSuspense = true,
}: RecentActivityProps) {
  if (useSuspense) {
    return (
      <DashboardSuspenseBoundary section="recent activity">
        <RecentActivityContent
          title={title}
          subtitle={subtitle}
          limit={limit}
          userRole={userRole}
        />
      </DashboardSuspenseBoundary>
    )
  }

  // Traditional loading pattern - return the component directly
  // This allows the parent to handle loading states
  return (
    <RecentActivityContent title={title} subtitle={subtitle} limit={limit} userRole={userRole} />
  )
}
