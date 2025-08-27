'use client'

import { Button, Card, CardBody, Chip, Tooltip } from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { atomWithReset } from 'jotai/utils'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EditIcon,
  MapPinIcon,
  MessageCircleIcon,
  XCircleIcon,
} from 'lucide-react'

import { memo } from 'react'

import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('WeeklyWorkoutCard')

// Create atom for tracking hover state per workout
const workoutHoverStateAtom = atomWithReset<Record<string, boolean>>({})

interface WeeklyWorkoutCardProps {
  workout: Workout
  compact?: boolean
  onClick?: (workout: Workout) => void
  onEdit?: (workout: Workout) => void
  onMessage?: (workoutId: string) => void
  showActions?: boolean
}

function WeeklyWorkoutCard({
  workout,
  compact = false,
  onClick,
  onEdit,
  onMessage,
  showActions = false,
}: WeeklyWorkoutCardProps) {
  const hoverStates = useAtomValue(workoutHoverStateAtom)
  const setHoverStates = useSetAtom(workoutHoverStateAtom)
  const isHovered = hoverStates[workout.id] || false

  const handleClick = () => {
    if (onClick) {
      logger.debug('Weekly workout card clicked', {
        workoutId: workout.id,
        status: workout.status,
        type: workout.planned_type,
      })
      onClick(workout)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      logger.debug('Edit workout clicked', { workoutId: workout.id })
      onEdit(workout)
    }
  }

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMessage) {
      logger.debug('Message workout clicked', { workoutId: workout.id })
      onMessage(workout.id)
    }
  }

  // Get workout status icon and color
  const getStatusConfig = () => {
    switch (workout.status) {
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'success' as const,
          bgColor: 'bg-success/10',
          borderColor: 'border-success/40',
        }
      case 'planned':
        return {
          icon: ClockIcon,
          color: 'warning' as const,
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/40',
        }
      case 'skipped':
        return {
          icon: XCircleIcon,
          color: 'danger' as const,
          bgColor: 'bg-danger/10',
          borderColor: 'border-danger/40',
        }
      default:
        return {
          icon: AlertTriangleIcon,
          color: 'default' as const,
          bgColor: 'bg-default/10',
          borderColor: 'border-default/40',
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  // Get workout type display
  const workoutType =
    workout.status === 'completed'
      ? workout.actual_type || workout.planned_type || 'workout'
      : workout.planned_type || 'workout'

  const displayType = workoutType.replace('_', ' ')

  // Format distance and duration
  const formatDistance = (distance: string | number | null | undefined) => {
    if (!distance) return null
    const dist = parseFloat(distance.toString())
    return dist > 0 ? `${dist}mi` : null
  }

  const formatDuration = (duration: string | number | null | undefined) => {
    if (!duration) return null
    const dur = parseInt(duration.toString())
    return dur > 0 ? `${dur}min` : null
  }

  const plannedDistance = formatDistance(workout.planned_distance)
  const actualDistance = formatDistance(workout.actual_distance)
  const plannedDuration = formatDuration(workout.planned_duration)
  const actualDuration = formatDuration(workout.actual_duration)

  // Determine what to show for metrics
  const showDistance = workout.status === 'completed' ? actualDistance : plannedDistance
  const showDuration = workout.status === 'completed' ? actualDuration : plannedDuration

  if (compact) {
    // Compact view for weekly grid
    return (
      <Tooltip
        content={
          <div className="p-2">
            <div className="font-medium capitalize mb-1">{displayType}</div>
            <div className="text-sm space-y-1">
              {showDistance && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" />
                  <span>{showDistance}</span>
                </div>
              )}
              {showDuration && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>{showDuration}</span>
                </div>
              )}
              {workout.workout_notes && (
                <div className="text-xs text-foreground/60 mt-1 max-w-48">
                  {workout.workout_notes}
                </div>
              )}
            </div>
          </div>
        }
        placement="top"
      >
        <Card
          className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-l-2 cursor-pointer hover:shadow-md transition-all duration-200 min-h-[60px] relative group`}
          isPressable={!!onClick}
          onPress={onClick ? handleClick : undefined}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, [workout.id]: true }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, [workout.id]: false }))}
        >
          <CardBody className="p-2">
            <div className="flex items-center gap-1 mb-1">
              <StatusIcon className={`w-3 h-3 text-${statusConfig.color}`} />
              <Chip size="sm" variant="flat" color={statusConfig.color} className="h-4 text-xs">
                {workout.status === 'completed' ? '✅' : workout.status === 'planned' ? '⏱️' : '❌'}
              </Chip>
            </div>

            <div className="text-xs font-medium text-foreground capitalize mb-1">
              {displayType.length > 8 ? `${displayType.substring(0, 8)}...` : displayType}
            </div>

            <div className="text-xs text-foreground/60 space-y-0.5">
              {showDistance && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-2 h-2" />
                  <span>{showDistance}</span>
                </div>
              )}
              {showDuration && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-2 h-2" />
                  <span>{showDuration}</span>
                </div>
              )}
            </div>

            {/* Quick Actions on Hover */}
            {showActions && isHovered && (
              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center gap-1 rounded-lg">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    isIconOnly
                    onClick={handleEdit}
                    className="h-6 w-6 min-w-6"
                  >
                    <EditIcon className="w-3 h-3" />
                  </Button>
                )}
                {onMessage && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="success"
                    isIconOnly
                    onClick={handleMessage}
                    className="h-6 w-6 min-w-6"
                  >
                    <MessageCircleIcon className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </Tooltip>
    )
  }

  // Full view for detailed display
  return (
    <Card
      className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-l-4 hover:shadow-lg transition-all duration-300`}
      isPressable={!!onClick}
      onPress={onClick ? handleClick : undefined}
    >
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 text-${statusConfig.color}`} />
            <div>
              <h4 className="font-semibold text-foreground capitalize">{displayType}</h4>
              <p className="text-sm text-foreground/60">
                {new Date(workout.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <Chip
            color={statusConfig.color}
            variant="flat"
            size="sm"
            startContent={<StatusIcon className="w-3 h-3" />}
            className="capitalize"
          >
            {workout.status}
          </Chip>
        </div>

        {/* Planned vs Actual Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          {/* Planned Section */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-foreground/70 flex items-center gap-1">
              <ActivityIcon className="w-3 h-3" />
              Planned
            </h5>
            <div className="text-sm text-foreground/80">
              {plannedDistance && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" />
                  <span>{plannedDistance}</span>
                </div>
              )}
              {plannedDuration && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>{plannedDuration}</span>
                </div>
              )}
              {!plannedDistance && !plannedDuration && (
                <span className="text-foreground/40 italic">Flexible session</span>
              )}
            </div>
          </div>

          {/* Actual Section (if completed) */}
          {workout.status === 'completed' && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-foreground/70 flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                Actual
              </h5>
              <div className="text-sm text-success">
                {actualDistance && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" />
                    <span>{actualDistance}</span>
                  </div>
                )}
                {actualDuration && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{actualDuration}</span>
                  </div>
                )}
                {!actualDistance && !actualDuration && (
                  <span className="text-foreground/40 italic">No data logged</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Workout Notes */}
        {workout.workout_notes && (
          <div className="border-t border-divider/50 pt-3">
            <h5 className="text-sm font-medium text-foreground/70 mb-1">Notes</h5>
            <p className="text-sm text-foreground/80">{workout.workout_notes}</p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default memo(WeeklyWorkoutCard)
