'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { format } from 'date-fns'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  MountainSnowIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { useCallback, useMemo, useState } from 'react'

import type { Workout } from '@/lib/supabase'

interface MonthlyCalendarProps {
  workouts: Workout[]
  onWorkoutClick?: (workout: Workout) => void
  onDateClick?: (date: CalendarDate) => void
  className?: string
}

interface WorkoutDay {
  date: CalendarDate
  workouts: Workout[]
  hasWorkouts: boolean
  isPastDue: boolean
  isToday: boolean
}

export default function MonthlyCalendar({
  workouts,
  onWorkoutClick,
  onDateClick,
  className = '',
}: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => today(getLocalTimeZone()))

  // Generate calendar grid for the current month
  const calendarDays = useMemo(() => {
    try {
      const startOfMonth = currentMonth.set({ day: 1 })
      const endOfMonth = currentMonth.set({
        day: currentMonth.calendar.getDaysInMonth(currentMonth),
      })

      // Get the first day of the week for the month view
      const startDayOfWeek = startOfMonth.toDate(getLocalTimeZone()).getDay()
      const endDayOfWeek = endOfMonth.toDate(getLocalTimeZone()).getDay()
      const startOfWeek = startOfMonth.subtract({ days: startDayOfWeek })
      const endOfWeek = endOfMonth.add({ days: 6 - endDayOfWeek })

      const days: WorkoutDay[] = []
      let currentDate = startOfWeek

      while (currentDate.compare(endOfWeek) <= 0) {
        // Format CalendarDate to YYYY-MM-DD to match workout data format
        const dateString = format(currentDate.toDate(getLocalTimeZone()), 'yyyy-MM-dd')
        const dayWorkouts = workouts.filter(workout => {
          // Handle different date formats that might come from the API
          const workoutDate = workout.date
          if (typeof workoutDate === 'string') {
            // Extract just the date part if it's a full datetime string
            const datePart = workoutDate.split('T')[0]
            return datePart === dateString
          }
          return workoutDate === dateString
        })
        const todayDate = today(getLocalTimeZone())

        days.push({
          date: currentDate,
          workouts: dayWorkouts,
          hasWorkouts: dayWorkouts.length > 0,
          isPastDue:
            currentDate.compare(todayDate) < 0 && dayWorkouts.some(w => w.status === 'planned'),
          isToday: currentDate.compare(todayDate) === 0,
        })

        currentDate = currentDate.add({ days: 1 })
      }

      return days
    } catch (error) {
      console.error('Error generating calendar days:', error)
      return []
    }
  }, [currentMonth, workouts])

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      return direction === 'prev' ? prev.subtract({ months: 1 }) : prev.add({ months: 1 })
    })
  }, [])

  const getWorkoutIcon = useCallback((type: string) => {
    switch (type?.toLowerCase()) {
      case 'long_run':
        return <MountainSnowIcon className="w-3 h-3" />
      case 'interval':
        return <TrendingUpIcon className="w-3 h-3" />
      case 'tempo':
        return <ClockIcon className="w-3 h-3" />
      default:
        return <MapPinIcon className="w-3 h-3" />
    }
  }, [])

  const getWorkoutColor = useCallback((workout: Workout) => {
    if (workout.status === 'completed') return 'success'
    if (workout.status === 'skipped') return 'danger'
    if (workout.intensity && workout.intensity >= 7) return 'warning'
    return 'primary'
  }, [])

  const getIntensityColor = useCallback((intensity?: number) => {
    if (!intensity) return 'default'
    if (intensity <= 3) return 'success'
    if (intensity <= 6) return 'primary'
    if (intensity <= 8) return 'warning'
    return 'danger'
  }, [])

  const formatMonthYear = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    })
    return formatter.format(currentMonth.toDate(getLocalTimeZone()))
  }, [currentMonth])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className={`w-full ${className}`} shadow="sm" data-testid="monthly-calendar">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{formatMonthYear}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => navigateMonth('prev')}
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>

          <Button
            variant="light"
            size="sm"
            onPress={() => setCurrentMonth(today(getLocalTimeZone()))}
          >
            Today
          </Button>

          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => navigateMonth('next')}
            aria-label="Next month"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6">
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-foreground-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {calendarDays.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-content2 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-foreground-400" />
              </div>
              <p className="text-foreground-600">Unable to load calendar</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.date.month === currentMonth.month
              const dayNumber = day.date.day

              return (
                <div
                  key={index}
                  className={`
                  relative min-h-[80px] p-1 border border-divider rounded-md transition-colors cursor-pointer
                  ${isCurrentMonth ? 'bg-background hover:bg-content1' : 'bg-content1/50 text-foreground-400'}
                  ${day.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                  ${day.isPastDue ? 'bg-danger-50 dark:bg-danger-50/20' : ''}
                `}
                  onClick={() => onDateClick?.(day.date)}
                >
                  {/* Day number */}
                  <div
                    className={`
                  text-sm font-medium mb-1
                  ${day.isToday ? 'text-primary font-bold' : ''}
                  ${!isCurrentMonth ? 'text-foreground-400' : 'text-foreground-700'}
                `}
                  >
                    {dayNumber}
                  </div>

                  {/* Workouts */}
                  <div className="space-y-1">
                    {day.workouts.slice(0, 2).map(workout => (
                      <Popover key={workout.id} placement="top">
                        <PopoverTrigger>
                          <div
                            className={`
                            px-1.5 py-0.5 rounded text-xs cursor-pointer transition-transform hover:scale-105
                            ${getWorkoutColor(workout) === 'success' ? 'bg-success-100 dark:bg-success-100/20 text-success-700 dark:text-success-400' : ''}
                            ${getWorkoutColor(workout) === 'danger' ? 'bg-danger-100 dark:bg-danger-100/20 text-danger-700 dark:text-danger-400' : ''}
                            ${getWorkoutColor(workout) === 'warning' ? 'bg-warning-100 dark:bg-warning-100/20 text-warning-700 dark:text-warning-400' : ''}
                            ${getWorkoutColor(workout) === 'primary' ? 'bg-primary-100 dark:bg-primary-100/20 text-primary-700 dark:text-primary-400' : ''}
                          `}
                            onClick={e => {
                              e.stopPropagation()
                              onWorkoutClick?.(workout)
                            }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              {getWorkoutIcon(workout.planned_type)}
                              <span className="truncate">
                                {workout.planned_type?.replace('_', ' ') || 'Workout'}
                              </span>
                            </div>
                          </div>
                        </PopoverTrigger>

                        <PopoverContent className="max-w-xs">
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">
                                {workout.planned_type?.replace('_', ' ').toUpperCase()}
                              </h4>
                              {workout.intensity && (
                                <Chip
                                  size="sm"
                                  color={getIntensityColor(workout.intensity)}
                                  variant="flat"
                                >
                                  Zone {workout.intensity}
                                </Chip>
                              )}
                            </div>

                            <div className="space-y-1 text-xs">
                              {workout.planned_distance && (
                                <div>Distance: {workout.planned_distance} miles</div>
                              )}
                              {workout.planned_duration && (
                                <div>Duration: {workout.planned_duration} min</div>
                              )}
                              {workout.workout_notes && (
                                <div className="text-foreground-600">{workout.workout_notes}</div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <Chip size="sm" color={getWorkoutColor(workout)} variant="flat">
                                {workout.status || 'planned'}
                              </Chip>
                              {workout.terrain && (
                                <span className="text-foreground-600">{workout.terrain}</span>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}

                    {/* Show "+X more" if there are additional workouts */}
                    {day.workouts.length > 2 && (
                      <div className="text-xs text-foreground-500 px-1.5">
                        +{day.workouts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-divider">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success-100 dark:bg-success-100/20"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-100/20"></div>
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-warning-100 dark:bg-warning-100/20"></div>
              <span>High Intensity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-danger-100 dark:bg-danger-100/20"></div>
              <span>Missed/Skipped</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
