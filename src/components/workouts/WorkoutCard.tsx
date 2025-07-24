import React, { memo, useCallback } from 'react'
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { ClockIcon, MapPinIcon, TrendingUpIcon } from 'lucide-react'
import type { Workout } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('WorkoutCard')

interface WorkoutCardProps {
  workout: Workout
  onPress: (workout: Workout) => void
  formatDate: (dateString: string) => string
  getWorkoutStatusColor: (status: string) => 'success' | 'danger' | 'warning'
  getWorkoutTypeIcon: (type: string) => React.ReactNode
  getWorkoutIntensityColor: (intensity: number) => 'success' | 'primary' | 'warning' | 'danger' | 'secondary'
}

const WorkoutCard = memo(function WorkoutCard({
  workout,
  onPress,
  formatDate,
  getWorkoutStatusColor,
  getWorkoutTypeIcon,
  getWorkoutIntensityColor
}: WorkoutCardProps) {
  
  const handlePress = useCallback(() => {
    logger.debug('Workout card pressed:', { 
      workoutId: workout.id, 
      workoutType: workout.planned_type, 
      status: workout.status 
    })
    onPress(workout)
  }, [workout, onPress])

  return (
    <Card 
      className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-primary/60"
      isPressable
      onPress={handlePress}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start w-full">
          <div className="flex items-center gap-3">
            {getWorkoutTypeIcon(workout.status === 'completed' ? workout.actual_type || 'general' : workout.planned_type || 'general')}
            <div>
              <h3 className="text-lg font-semibold text-foreground capitalize">
                {(workout.status === 'completed' ? workout.actual_type || 'general' : workout.planned_type || 'general').replace('_', ' ')}
              </h3>
              <p className="text-sm text-foreground-600">{formatDate(workout.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chip 
              color={getWorkoutStatusColor(workout.status)}
              variant="flat"
              size="sm"
              className="capitalize"
            >
              {workout.status}
            </Chip>
            {workout.intensity && (
              <Chip 
                color={getWorkoutIntensityColor(workout.intensity)}
                variant="bordered"
                size="sm"
              >
                Zone {Math.ceil(workout.intensity / 2)}
              </Chip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              Planned Route
            </h4>
            <div className="text-sm text-foreground-600">
              {workout.planned_distance && (
                <div className="flex items-center gap-1">
                  <span>Distance:</span>
                  <span className="font-medium">{workout.planned_distance} miles</span>
                </div>
              )}
              {workout.planned_duration && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>Duration:</span>
                  <span className="font-medium">{workout.planned_duration} min</span>
                </div>
              )}
              {!workout.planned_distance && !workout.planned_duration && (
                <span className="text-foreground-400 italic">Flexible training session</span>
              )}
            </div>
          </div>
          
          {workout.status === 'completed' && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground-700 flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4" />
                Actual Performance
              </h4>
              <div className="text-sm text-foreground-600">
                {workout.actual_distance && (
                  <div className="flex items-center gap-1">
                    <span>Distance:</span>
                    <span className="font-medium text-success">{workout.actual_distance} miles</span>
                  </div>
                )}
                {workout.actual_duration && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>Duration:</span>
                    <span className="font-medium text-success">{workout.actual_duration} min</span>
                  </div>
                )}
                {!workout.actual_distance && !workout.actual_duration && (
                  <span className="text-foreground-400 italic">No performance data logged</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {workout.workout_notes && (
          <div className="mt-4 p-3 bg-content2 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground-700 mb-2">Training Notes</h4>
            <p className="text-sm text-foreground-600">{workout.workout_notes}</p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  // Only re-render if workout data has actually changed
  return (
    prevProps.workout.id === nextProps.workout.id &&
    prevProps.workout.status === nextProps.workout.status &&
    prevProps.workout.planned_type === nextProps.workout.planned_type &&
    prevProps.workout.actual_type === nextProps.workout.actual_type &&
    prevProps.workout.planned_distance === nextProps.workout.planned_distance &&
    prevProps.workout.actual_distance === nextProps.workout.actual_distance &&
    prevProps.workout.planned_duration === nextProps.workout.planned_duration &&
    prevProps.workout.actual_duration === nextProps.workout.actual_duration &&
    prevProps.workout.intensity === nextProps.workout.intensity &&
    prevProps.workout.workout_notes === nextProps.workout.workout_notes &&
    prevProps.workout.date === nextProps.workout.date
  )
})

export default WorkoutCard