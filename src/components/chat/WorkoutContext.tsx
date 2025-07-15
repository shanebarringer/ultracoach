'use client'

import React from 'react'
import { Card, CardBody, Chip, Button } from '@heroui/react'
import { Calendar, MapPin, Target, Clock, ExternalLink } from 'lucide-react'
import { Workout } from '@/lib/supabase'

interface WorkoutContextProps {
  workout: Workout | null
  linkType?: string
  className?: string
  onViewWorkout?: (workoutId: string) => void
}

const LINK_TYPE_COLORS = {
  reference: 'default',
  feedback: 'success', 
  question: 'warning',
  update: 'primary',
  plan_change: 'secondary'
} as const

const LINK_TYPE_LABELS = {
  reference: 'Referenced',
  feedback: 'Feedback',
  question: 'Question',
  update: 'Update',
  plan_change: 'Plan Change'
} as const

export default function WorkoutContext({ 
  workout, 
  linkType = 'reference',
  className = '',
  onViewWorkout 
}: WorkoutContextProps) {
  if (!workout) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'planned': return 'primary'
      case 'skipped': return 'warning'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  return (
    <Card className={`border-l-4 border-l-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ${className}`}>
      <CardBody className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header with link type and status */}
            <div className="flex items-center gap-2 mb-2">
              <Chip 
                size="sm" 
                color={LINK_TYPE_COLORS[linkType as keyof typeof LINK_TYPE_COLORS] || 'default'}
                variant="flat"
                startContent={<Target className="h-3 w-3" />}
              >
                {LINK_TYPE_LABELS[linkType as keyof typeof LINK_TYPE_LABELS] || linkType}
              </Chip>
              <Chip 
                size="sm" 
                color={getStatusColor(workout.status || 'planned')}
                variant="dot"
              >
                {workout.status || 'planned'}
              </Chip>
            </div>

            {/* Workout details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-small">
                <Calendar className="h-3 w-3 text-default-500" />
                <span className="font-medium">
                  {formatDate(workout.date || '')}
                </span>
                <span className="text-default-600">
                  {workout.planned_type || 'Training Run'}
                </span>
              </div>

              {(workout.planned_distance || workout.planned_duration) && (
                <div className="flex items-center gap-4 text-small text-default-600">
                  {workout.planned_distance && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{workout.planned_distance} miles</span>
                    </div>
                  )}
                  {workout.planned_duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{workout.planned_duration} min</span>
                    </div>
                  )}
                </div>
              )}

              {workout.workout_notes && (
                <p className="text-small text-default-500 line-clamp-2 mt-1">
                  {workout.workout_notes}
                </p>
              )}
            </div>
          </div>

          {/* Action button */}
          {onViewWorkout && (
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => onViewWorkout(workout.id)}
              className="text-default-500 hover:text-default-700"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}