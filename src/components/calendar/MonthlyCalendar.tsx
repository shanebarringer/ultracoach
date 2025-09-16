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

import { useCallback, useMemo, useState, useRef, useEffect } from 'react'

import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('MonthlyCalendar')

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
  const [announceText, setAnnounceText] = useState('')
  const [focusedDate, setFocusedDate] = useState<CalendarDate | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

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
        const dayWorkouts = (workouts || []).filter(workout => {
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
      logger.error('Error generating calendar days:', error)
      return []
    }
  }, [currentMonth, workouts])

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = direction === 'prev' ? prev.subtract({ months: 1 }) : prev.add({ months: 1 })
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      })
      setAnnounceText(`Navigated to ${formatter.format(newMonth.toDate(getLocalTimeZone()))}`)
      return newMonth
    })
  }, [])

  // Enhanced keyboard navigation for calendar grid
  const handleCalendarKeyDown = useCallback((event: React.KeyboardEvent, day: WorkoutDay) => {
    if (!calendarDays || calendarDays.length === 0) return

    const currentIndex = calendarDays.findIndex(d => d.date.compare(day.date) === 0)
    if (currentIndex === -1) return

    let nextIndex: number | null = null

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : null
        break
      case 'ArrowRight':
        nextIndex = currentIndex < calendarDays.length - 1 ? currentIndex + 1 : null
        break
      case 'ArrowUp':
        nextIndex = currentIndex >= 7 ? currentIndex - 7 : null
        break
      case 'ArrowDown':
        nextIndex = currentIndex + 7 < calendarDays.length ? currentIndex + 7 : null
        break
      case 'Home':
        nextIndex = Math.floor(currentIndex / 7) * 7 // First day of current week
        break
      case 'End':
        nextIndex = Math.min(Math.floor(currentIndex / 7) * 7 + 6, calendarDays.length - 1) // Last day of current week
        break
      case 'PageUp':
        event.preventDefault()
        navigateMonth('prev')
        return
      case 'PageDown':
        event.preventDefault()
        navigateMonth('next')
        return
      default:
        return
    }

    if (nextIndex !== null) {
      event.preventDefault()
      const nextDay = calendarDays[nextIndex]
      setFocusedDate(nextDay.date)
      setAnnounceText(`Focus moved to ${nextDay.date.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}`)

      // Focus the next calendar cell
      setTimeout(() => {
        const nextCell = calendarRef.current?.querySelector(`[data-date="${nextDay.date.toString()}"]`) as HTMLElement
        nextCell?.focus()
      }, 0)
    }
  }, [calendarDays, navigateMonth])

  // Auto-focus management for accessibility
  useEffect(() => {
    if (focusedDate && announcementRef.current) {
      // Announce focused date to screen readers
      announcementRef.current.textContent = announceText
    }
  }, [focusedDate, announceText])

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
            aria-label={`Previous month, navigate to ${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth.subtract({ months: 1 }).toDate(getLocalTimeZone()))}`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>

          <Button
            variant="light"
            size="sm"
            onPress={() => {
              setCurrentMonth(today(getLocalTimeZone()))
              setAnnounceText('Navigated to current month')
            }}
            aria-label="Go to current month"
          >
            Today
          </Button>

          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => navigateMonth('next')}
            aria-label={`Next month, navigate to ${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth.add({ months: 1 }).toDate(getLocalTimeZone()))}`}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Enhanced screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announceText}
        </div>
        <div ref={announcementRef} aria-live="assertive" aria-atomic="true" className="sr-only"></div>

        {/* Hidden keyboard navigation instructions for screen readers */}
        <div id="calendar-instructions" className="sr-only">
          Use arrow keys to navigate between dates. Press Home for first day of week, End for last day of week.
          Page Up and Page Down to change months. Enter or Space to select a date.
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6">
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-1 mb-2" role="row">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-sm font-medium text-foreground-600 py-2"
              role="columnheader"
            >
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
          <div
            ref={calendarRef}
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={`Calendar for ${formatMonthYear}`}
            aria-describedby="calendar-instructions"
          >
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.date.month === currentMonth.month
              const dayNumber = day.date.day
              const formattedDate = day.date
                .toDate(getLocalTimeZone())
                .toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              const workoutSummary =
                day.workouts.length > 0
                  ? `, ${day.workouts.length} workout${day.workouts.length > 1 ? 's' : ''} scheduled: ${day.workouts.map(w => w.planned_type?.replace('_', ' ') || 'workout').join(', ')}`
                  : ''
              const statusInfo = day.isToday ? ', today' : day.isPastDue ? ', past due' : ''

              return (
                <div
                  key={index}
                  className={`
                  relative min-h-[80px] p-1 border border-divider rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  ${isCurrentMonth ? 'bg-background hover:bg-content1' : 'bg-content1/50 text-foreground-400'}
                  ${day.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                  ${day.isPastDue ? 'bg-danger-50 dark:bg-danger-50/20' : ''}
                  ${focusedDate && focusedDate.compare(day.date) === 0 ? 'ring-2 ring-secondary ring-offset-2' : ''}
                `}
                  onClick={() => onDateClick?.(day.date)}
                  role="gridcell"
                  aria-label={`${formattedDate}${workoutSummary}${statusInfo}`}
                  aria-current={day.isToday ? 'date' : undefined}
                  aria-selected={focusedDate ? focusedDate.compare(day.date) === 0 : false}
                  data-date={day.date.toString()}
                  tabIndex={day.isToday || (focusedDate && focusedDate.compare(day.date) === 0) ? 0 : -1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onDateClick?.(day.date)
                    } else {
                      handleCalendarKeyDown(e, day)
                    }
                  }}
                  onFocus={() => setFocusedDate(day.date)}
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
                            role="button"
                            tabIndex={0}
                            aria-label={`${workout.planned_type?.replace('_', ' ') || 'Workout'}, ${workout.status || 'planned'}, ${workout.planned_distance ? workout.planned_distance + ' miles' : ''} ${workout.planned_duration ? workout.planned_duration + ' minutes' : ''}, click for details`}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                onWorkoutClick?.(workout)
                              }
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
        <div
          className="mt-4 pt-4 border-t border-divider"
          role="group"
          aria-labelledby="calendar-legend"
        >
          <h3 id="calendar-legend" className="sr-only">
            Calendar workout status legend
          </h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2" role="listitem">
              <div
                className="w-3 h-3 rounded bg-success-100 dark:bg-success-100/20"
                aria-hidden="true"
              ></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <div
                className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-100/20"
                aria-hidden="true"
              ></div>
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <div
                className="w-3 h-3 rounded bg-warning-100 dark:bg-warning-100/20"
                aria-hidden="true"
              ></div>
              <span>High Intensity</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <div
                className="w-3 h-3 rounded bg-danger-100 dark:bg-danger-100/20"
                aria-hidden="true"
              ></div>
              <span>Missed/Skipped</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
