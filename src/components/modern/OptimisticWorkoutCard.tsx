'use client'

import { memo, useTransition } from 'react'
import { Card, CardBody, Chip, Button, Spinner } from '@heroui/react'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react'
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates'
import type { Workout } from '@/lib/supabase'

interface OptimisticWorkoutCardProps {
  workout: Workout & { isPending?: boolean; hasError?: boolean }
  onPress: (workout: Workout) => void
  formatDate: (date: string) => string
  getWorkoutStatusColor: (status: string) => "default" | "warning" | "success" | "primary" | "secondary" | "danger"
  getWorkoutTypeIcon: (type: string) => React.ReactNode
  getWorkoutIntensityColor: (intensity: number) => "default" | "warning" | "success" | "primary" | "secondary" | "danger"
}

/**
 * Modern workout card that demonstrates React 19 best practices:
 * - useTransition for non-blocking updates
 * - Optimistic updates for immediate feedback
 * - Proper memoization to prevent unnecessary re-renders
 * - Concurrent features for better UX
 */
const OptimisticWorkoutCard = memo(function OptimisticWorkoutCard({
  workout,
  onPress,
  formatDate,
  getWorkoutStatusColor,
  getWorkoutTypeIcon,
  getWorkoutIntensityColor,
}: OptimisticWorkoutCardProps) {
  const [isPending, startTransition] = useTransition()
  const { updateWorkoutOptimistic } = useOptimisticUpdates()

  const handleQuickStatusUpdate = (newStatus: 'completed' | 'skipped') => {
    startTransition(() => {
      updateWorkoutOptimistic(
        workout.id,
        { status: newStatus },
        async () => {
          const response = await fetch(`/api/workouts/${workout.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
          
          if (!response.ok) {
            throw new Error('Failed to update workout status')
          }
          
          return response.json()
        }
      )
    })
  }

  const isUpdating = isPending || workout.isPending
  const hasError = workout.hasError

  return (
    <Card 
      className={`
        transition-all duration-200 cursor-pointer hover:shadow-lg
        ${isUpdating ? 'opacity-75 scale-[0.98]' : 'hover:scale-[1.02]'}
        ${hasError ? 'border-danger border-2' : ''}
      `}
      isPressable={!isUpdating}
      onPress={() => !isUpdating && onPress(workout)}
    >
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Header with loading indicator */}
            <div className="flex items-center gap-2">
              {getWorkoutTypeIcon(workout.planned_type)}
              <h3 className="font-semibold text-foreground">
                {workout.planned_type || 'Workout'}
              </h3>
              {isUpdating && (
                <Spinner size="sm" color="primary" className="ml-2" />
              )}
              {hasError && (
                <Chip color="danger" size="sm" variant="flat">
                  Update Failed
                </Chip>
              )}
            </div>

            {/* Workout details */}
            <div className="flex flex-wrap gap-2 text-sm text-foreground-600">
              <span>{formatDate(workout.date)}</span>
              {workout.planned_distance && (
                <span>• {workout.planned_distance} miles</span>
              )}
              {workout.planned_duration && (
                <span>• {workout.planned_duration} min</span>
              )}
            </div>

            {/* Status and intensity */}
            <div className="flex items-center gap-2">
              <Chip 
                color={getWorkoutStatusColor(workout.status)} 
                size="sm"
                variant="flat"
              >
                {workout.status}
              </Chip>
              
              {workout.intensity && (
                <Chip
                  color={getWorkoutIntensityColor(workout.intensity)}
                  size="sm"
                  variant="dot"
                >
                  Zone {workout.intensity}
                </Chip>
              )}
            </div>

            {/* Quick actions for planned workouts */}
            {workout.status === 'planned' && !isUpdating && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  color="success"
                  variant="flat"
                  startContent={<CheckCircleIcon className="w-4 h-4" />}
                  onPress={() => {
                    handleQuickStatusUpdate('completed')
                  }}
                  disabled={isUpdating}
                >
                  Complete
                </Button>
                
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  startContent={<XCircleIcon className="w-4 h-4" />}
                  onPress={() => {
                    handleQuickStatusUpdate('skipped')
                  }}
                  disabled={isUpdating}
                >
                  Skip
                </Button>
              </div>
            )}

            {/* Optimistic update feedback */}
            {isUpdating && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <ClockIcon className="w-4 h-4" />
                <span>Updating...</span>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
})

export default OptimisticWorkoutCard