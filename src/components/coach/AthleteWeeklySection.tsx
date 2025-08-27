'use client'

import { Avatar, Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  MessageCircleIcon,
  PlusIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
} from 'lucide-react'

import { useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { uiStateAtom } from '@/lib/atoms'
import type { User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

import WeeklyWorkoutCard from './WeeklyWorkoutCard'

const logger = createLogger('AthleteWeeklySection')

interface AthleteWeeklySectionProps {
  athlete: User
  workouts: Workout[]
  weekStart: Date
  coach: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
  }
}

export default function AthleteWeeklySection({
  athlete,
  workouts,
  weekStart,
  coach: _coach,
}: AthleteWeeklySectionProps) {
  const router = useRouter()
  const setUiState = useSetAtom(uiStateAtom)
  const uiState = useAtomValue(uiStateAtom)
  const expandedNotes = uiState.expandedNotes?.[athlete.id] || false

  // Organize workouts by day of week
  const weeklyWorkoutGrid = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const grid = days.map((day, index) => {
      const dayDate = new Date(weekStart)
      dayDate.setDate(weekStart.getDate() + index)

      const dayWorkouts = workouts.filter(workout => {
        const workoutDate = new Date(workout.date)
        return workoutDate.toDateString() === dayDate.toDateString()
      })

      return {
        day,
        date: dayDate,
        workouts: dayWorkouts,
      }
    })

    logger.debug('Generated weekly workout grid', {
      athleteId: athlete.id,
      athleteName: athlete.name,
      weekStart: weekStart.toISOString(),
      totalWorkouts: workouts.length,
      gridDays: grid.map(g => ({ day: g.day, workoutsCount: g.workouts.length })),
    })

    return grid
  }, [workouts, weekStart, athlete])

  // Calculate athlete metrics for the week
  const athleteMetrics = useMemo(() => {
    const completed = workouts.filter(w => w.status === 'completed')
    const planned = workouts.filter(w => w.status === 'planned')
    const totalDistance = completed.reduce((sum, w) => {
      const distance = parseFloat(w.actual_distance?.toString() || '0')
      return sum + distance
    }, 0)

    const completionRate =
      workouts.length > 0 ? Math.round((completed.length / workouts.length) * 100) : 0

    return {
      totalWorkouts: workouts.length,
      completed: completed.length,
      planned: planned.length,
      completionRate,
      totalDistance: totalDistance.toFixed(1),
    }
  }, [workouts])

  // Collect all workout notes for this athlete
  const athleteNotes = useMemo(() => {
    return workouts
      .filter(w => w.workout_notes && w.workout_notes.trim())
      .map(w => ({
        date: new Date(w.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        notes: w.workout_notes,
        type: w.planned_type || 'workout',
        status: w.status,
      }))
  }, [workouts])

  const handleViewProgress = () => {
    router.push(`/weekly-planner/${athlete.id}`)
  }

  const handleAddWorkout = () => {
    setUiState(prev => ({
      ...prev,
      isAddWorkoutModalOpen: true,
      selectedAthleteForWorkout: athlete,
    }))
  }

  const handleQuickMessage = () => {
    setUiState(prev => ({
      ...prev,
      isNewMessageModalOpen: true,
      selectedConversationUserId: athlete.id,
    }))
  }

  const handleViewTrainingPlan = () => {
    // Navigate to training plans with athlete filter
    router.push(`/training-plans?athlete=${athlete.id}`)
  }

  return (
    <Card className="border-l-4 border-l-primary/60 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between w-full">
          {/* Athlete Info */}
          <div className="flex items-center gap-4">
            <Avatar
              name={athlete.name || 'User'}
              size="lg"
              className="bg-linear-to-br from-primary to-secondary text-white"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-foreground">{athlete.name || 'User'}</h3>
                <Chip
                  size="sm"
                  variant="flat"
                  color="success"
                  startContent={<TrendingUpIcon className="w-3 h-3" />}
                >
                  Active
                </Chip>
              </div>
              <p className="text-foreground/60 text-sm">{athlete.email}</p>

              {/* Quick Metrics */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <CalendarIcon className="w-3 h-3 text-primary" />
                  <span className="text-foreground/70">
                    {athleteMetrics.completed}/{athleteMetrics.totalWorkouts} completed
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <MapPinIcon className="w-3 h-3 text-success" />
                  <span className="text-foreground/70">{athleteMetrics.totalDistance} mi</span>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={
                    athleteMetrics.completionRate >= 80
                      ? 'success'
                      : athleteMetrics.completionRate >= 60
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {athleteMetrics.completionRate}% completion
                </Chip>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Primary Actions */}
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<PlusIcon className="w-4 h-4" />}
              onPress={handleAddWorkout}
              className="bg-primary/10 hover:bg-primary/20"
            >
              Add Workout
            </Button>
            <Button
              size="sm"
              variant="flat"
              color="success"
              startContent={<MessageCircleIcon className="w-4 h-4" />}
              onPress={handleQuickMessage}
              className="bg-success/10 hover:bg-success/20"
            >
              Quick Message
            </Button>

            {/* Secondary Actions */}
            <Button
              size="sm"
              variant="ghost"
              color="secondary"
              startContent={<TargetIcon className="w-4 h-4" />}
              onPress={handleViewTrainingPlan}
            >
              Plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="default"
              startContent={<UserIcon className="w-4 h-4" />}
              onPress={handleViewProgress}
            >
              Progress
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        {/* Weekly Workout Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weeklyWorkoutGrid.map((dayData, index) => (
            <div key={index} className="text-center">
              {/* Day Header */}
              <div className="mb-2">
                <div className="text-sm font-medium text-foreground/70">{dayData.day}</div>
                <div className="text-xs text-foreground/50">{dayData.date.getDate()}</div>
              </div>

              {/* Workout Cards for the Day */}
              <div className="space-y-1">
                {dayData.workouts.length === 0 ? (
                  <div className="bg-default-100 rounded-lg p-2 min-h-[60px] flex items-center justify-center">
                    <span className="text-xs text-foreground/40">Rest</span>
                  </div>
                ) : (
                  dayData.workouts.map(workout => (
                    <WeeklyWorkoutCard
                      key={workout.id}
                      workout={workout}
                      compact={true}
                      showActions={true}
                      onEdit={workout => {
                        setUiState(prev => ({
                          ...prev,
                          isWorkoutLogModalOpen: true,
                          selectedWorkout: workout,
                        }))
                      }}
                      onMessage={workoutId => {
                        setUiState(prev => ({
                          ...prev,
                          isNewMessageModalOpen: true,
                          selectedConversationUserId: athlete.id,
                          workoutContext: workoutId,
                        }))
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Athlete Notes Section */}
        {athleteNotes.length > 0 && (
          <div className="border-t border-divider pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-foreground/70" />
                <span className="text-sm font-medium text-foreground/70">
                  Training Notes ({athleteNotes.length})
                </span>
              </div>
              <Button
                size="sm"
                variant="light"
                onClick={() =>
                  setUiState(prev => ({
                    ...prev,
                    expandedNotes: {
                      ...prev.expandedNotes,
                      [athlete.id]: !expandedNotes,
                    },
                  }))
                }
              >
                {expandedNotes ? 'Hide' : 'Show'} Notes
              </Button>
            </div>

            {expandedNotes && (
              <div className="space-y-2">
                {athleteNotes.map((note, index) => (
                  <div
                    key={index}
                    className="bg-content2 rounded-lg p-3 border-l-2 border-l-primary/40"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">{note.date}</span>
                      <span className="text-xs text-foreground/60 capitalize">{note.type}</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={note.status === 'completed' ? 'success' : 'warning'}
                        className="h-4 text-xs"
                      >
                        {note.status}
                      </Chip>
                    </div>
                    <p className="text-sm text-foreground/80">{note.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {workouts.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 bg-default-100 rounded-full flex items-center justify-center mb-3">
              <CalendarIcon className="h-6 w-6 text-default-400" />
            </div>
            <p className="text-foreground/60 font-medium mb-1">No workouts scheduled</p>
            <p className="text-sm text-foreground/40">
              Create a training plan to get started with this athlete.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
