'use client'

import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Progress } from '@heroui/react'
import { useAtom } from 'jotai'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Target,
  TrendingUp,
} from 'lucide-react'

import { memo } from 'react'

import { workoutAtomFamily } from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

type WorkoutAtom = import('jotai').Atom<Workout | null>

interface EnhancedWorkoutCardProps {
  workoutId: string
  userRole: 'runner' | 'coach'
  onEdit?: (workout: Workout) => void
  onLog?: (workout: Workout) => void
  variant?: 'default' | 'compact' | 'detailed'
}

// Enhanced workout name with type and category
const EnhancedWorkoutName = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const workoutType = workout.planned_type || 'Workout'
  const workoutCategory = getWorkoutCategory(workoutType)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-foreground leading-tight">{workoutType}</h3>
        <Badge
          color={getCategoryColor(workoutCategory)}
          variant="flat"
          size="sm"
          className="text-xs"
        >
          {workoutCategory}
        </Badge>
      </div>
      {workout.workout_notes && (
        <p className="text-sm text-foreground-600 line-clamp-1">
          {workout.workout_notes.split('\n')[0]}
        </p>
      )}
    </div>
  )
})
EnhancedWorkoutName.displayName = 'EnhancedWorkoutName'

// Enhanced status with progress indicator
const EnhancedWorkoutStatus = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const status = workout.status || 'planned'
  const statusConfig = getStatusConfig(status)

  return (
    <div className="flex items-center gap-2">
      <statusConfig.icon className={`h-5 w-5 ${statusConfig.iconColor}`} strokeWidth={2} />
      <Badge color={statusConfig.badgeColor} variant="flat" size="sm" className="font-medium">
        {statusConfig.label}
      </Badge>
    </div>
  )
})
EnhancedWorkoutStatus.displayName = 'EnhancedWorkoutStatus'

// Enhanced date with relative time
const EnhancedWorkoutDate = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const workoutDate = new Date(workout.date || '')
  const today = new Date()
  const diffInDays = Math.ceil((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const getDateLabel = () => {
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Tomorrow'
    if (diffInDays === -1) return 'Yesterday'
    if (diffInDays > 0) return `In ${diffInDays} days`
    if (diffInDays < 0) return `${Math.abs(diffInDays)} days ago`
    return workoutDate.toLocaleDateString()
  }

  const getDateColor = () => {
    if (diffInDays === 0) return 'text-primary'
    if (diffInDays === 1) return 'text-secondary'
    if (diffInDays < -7) return 'text-foreground-400'
    return 'text-foreground-600'
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-foreground-400" />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${getDateColor()}`}>{getDateLabel()}</span>
        <span className="text-xs text-foreground-400">
          {workoutDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  )
})
EnhancedWorkoutDate.displayName = 'EnhancedWorkoutDate'

// Enhanced metrics row
const WorkoutMetrics = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const distance = workout.actual_distance || workout.planned_distance
  const duration = workout.actual_duration || workout.planned_duration
  const intensity = workout.intensity

  return (
    <div className="grid grid-cols-3 gap-3">
      {distance && (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{distance}</span>
            <span className="text-xs text-foreground-500">miles</span>
          </div>
        </div>
      )}

      {duration && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-secondary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{duration}</span>
            <span className="text-xs text-foreground-500">min</span>
          </div>
        </div>
      )}

      {intensity && (
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-warning" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{intensity}/10</span>
            <span className="text-xs text-foreground-500">intensity</span>
          </div>
        </div>
      )}
    </div>
  )
})
WorkoutMetrics.displayName = 'WorkoutMetrics'

// Progress indicator for completion
const WorkoutProgress = memo(({ workoutAtom }: { workoutAtom: WorkoutAtom }) => {
  const [workout] = useAtom(workoutAtom)
  if (!workout) return null

  const status = workout.status || 'planned'
  const progressValue = status === 'completed' ? 100 : status === 'skipped' ? 0 : 50
  const progressColor =
    status === 'completed' ? 'success' : status === 'skipped' ? 'danger' : 'primary'

  if (status === 'planned') return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-600">Progress</span>
        <span className="text-xs font-medium text-foreground">
          {status === 'completed' ? 'Complete' : status === 'skipped' ? 'Skipped' : 'In Progress'}
        </span>
      </div>
      <Progress size="sm" value={progressValue} color={progressColor} className="w-full" />
    </div>
  )
})
WorkoutProgress.displayName = 'WorkoutProgress'

// Main enhanced workout card
const EnhancedWorkoutCard = memo(
  ({
    workoutId,
    userRole: _userRole,
    onEdit,
    onLog,
    variant = 'default',
  }: EnhancedWorkoutCardProps) => {
    const workoutAtom = workoutAtomFamily(workoutId)
    const [workout] = useAtom(workoutAtom)

    if (!workout) {
      return (
        <Card className="w-full">
          <CardBody>
            <div className="text-center text-foreground-400">Workout not found</div>
          </CardBody>
        </Card>
      )
    }

    const cardStyles =
      variant === 'compact'
        ? 'w-full hover:shadow-md transition-all duration-200'
        : 'w-full hover:shadow-lg hover:scale-[1.02] transition-all duration-200'

    return (
      <Card className={cardStyles}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start w-full">
            <div className="flex-1 min-w-0">
              <EnhancedWorkoutName workoutAtom={workoutAtom} />
            </div>
            <EnhancedWorkoutStatus workoutAtom={workoutAtom} />
          </div>
        </CardHeader>

        <CardBody className="space-y-4 py-3">
          <EnhancedWorkoutDate workoutAtom={workoutAtom} />
          <WorkoutMetrics workoutAtom={workoutAtom} />
          <WorkoutProgress workoutAtom={workoutAtom} />

          {/* Expanded notes for detailed variant */}
          {variant === 'detailed' && workout.workout_notes && (
            <div className="text-sm text-foreground-600 bg-content2 p-3 rounded-lg">
              <p className="whitespace-pre-wrap">{workout.workout_notes}</p>
            </div>
          )}
        </CardBody>

        <CardFooter className="pt-2">
          <div className="flex gap-2 w-full">
            {onEdit && (
              <Button
                size="sm"
                variant="bordered"
                onPress={() => onEdit(workout)}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            {onLog && workout.status !== 'completed' && (
              <Button
                size="sm"
                color="primary"
                onPress={() => onLog(workout)}
                className="flex-1"
                startContent={<TrendingUp className="h-4 w-4" />}
              >
                Log Workout
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    )
  }
)

EnhancedWorkoutCard.displayName = 'EnhancedWorkoutCard'

// Helper functions
function getWorkoutCategory(type: string): string {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('run') || lowerType.includes('jog')) return 'Running'
  if (lowerType.includes('bike') || lowerType.includes('cycle')) return 'Cycling'
  if (lowerType.includes('swim')) return 'Swimming'
  if (lowerType.includes('hike') || lowerType.includes('trail')) return 'Hiking'
  if (lowerType.includes('strength') || lowerType.includes('weight')) return 'Strength'
  if (lowerType.includes('yoga') || lowerType.includes('stretch')) return 'Recovery'
  return 'Training'
}

function getCategoryColor(
  category: string
): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default' {
  switch (category) {
    case 'Running':
      return 'primary'
    case 'Cycling':
      return 'secondary'
    case 'Swimming':
      return 'success'
    case 'Hiking':
      return 'warning'
    case 'Strength':
      return 'danger'
    case 'Recovery':
      return 'success'
    default:
      return 'default'
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        iconColor: 'text-success',
        badgeColor: 'success' as const,
        label: 'Completed',
      }
    case 'skipped':
      return {
        icon: AlertCircle,
        iconColor: 'text-danger',
        badgeColor: 'danger' as const,
        label: 'Skipped',
      }
    case 'planned':
    default:
      return {
        icon: Circle,
        iconColor: 'text-primary',
        badgeColor: 'primary' as const,
        label: 'Planned',
      }
  }
}

export default EnhancedWorkoutCard
