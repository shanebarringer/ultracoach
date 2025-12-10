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
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  MountainSnowIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('WeekView')

interface WeekViewProps {
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

export default function WeekView({
  workouts,
  onWorkoutClick,
  onDateClick,
  className = '',
}: WeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    return startOfWeek(today, { weekStartsOn: 0 }) // Start on Sunday
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragDistance, setDragDistance] = useState(0)
  const [announceText, setAnnounceText] = useState('')
  const [focusedDate, setFocusedDate] = useState<CalendarDate | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

  // Generate week days
  const weekDays = useMemo(() => {
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 })
      const days: WorkoutDay[] = []

      const todayDate = today(getLocalTimeZone())
      let currentDate = new Date(currentWeekStart)

      while (currentDate <= weekEnd) {
        // Convert to CalendarDate
        const calendarDate = new CalendarDate(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          currentDate.getDate()
        )

        // Format to match workout data format
        const dateString = format(currentDate, 'yyyy-MM-dd')
        const dayWorkouts = (workouts || []).filter(workout => {
          const workoutDate = workout.date
          if (typeof workoutDate === 'string') {
            const datePart = workoutDate.split('T')[0]
            return datePart === dateString
          }
          return workoutDate === dateString
        })

        days.push({
          date: calendarDate,
          workouts: dayWorkouts,
          hasWorkouts: dayWorkouts.length > 0,
          isPastDue:
            calendarDate.compare(todayDate) < 0 && dayWorkouts.some(w => w.status === 'planned'),
          isToday: calendarDate.compare(todayDate) === 0,
        })

        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
      }

      return days
    } catch (error) {
      logger.error('Error generating week days:', error)
      return []
    }
  }, [currentWeekStart, workouts])

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeekStart(prevStart => {
      const newWeekStart = direction === 'prev' ? subWeeks(prevStart, 1) : addWeeks(prevStart, 1)

      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

      setAnnounceText(`Navigated to week of ${formatter.format(newWeekStart)}`)

      return newWeekStart
    })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setDragStartX(e.touches[0].clientX)
    setDragDistance(0)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return
      const currentX = e.touches[0].clientX
      setDragDistance(currentX - dragStartX)
    },
    [isDragging, dragStartX]
  )

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    const threshold = 100 // Minimum distance for a swipe
    if (Math.abs(dragDistance) > threshold) {
      navigateWeek(dragDistance > 0 ? 'prev' : 'next')
    }

    setIsDragging(false)
    setDragDistance(0)
  }, [isDragging, dragDistance, navigateWeek])

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

  const getWorkoutDotColor = useCallback((workout: Workout) => {
    if (workout.status === 'completed') return 'bg-success-500'
    if (workout.status === 'skipped') return 'bg-danger-500'
    if (workout.intensity && workout.intensity >= 7) return 'bg-warning-500'
    return 'bg-primary-500'
  }, [])

  const formatWeekRange = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 })
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return `${formatter.format(currentWeekStart)} - ${formatter.format(weekEnd)}`
  }, [currentWeekStart])

  // Keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, day: WorkoutDay) => {
      const currentIndex = weekDays.findIndex(d => d.date.compare(day.date) === 0)
      if (currentIndex === -1) return

      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          nextIndex = currentIndex > 0 ? currentIndex - 1 : null
          break
        case 'ArrowRight':
          e.preventDefault()
          nextIndex = currentIndex < weekDays.length - 1 ? currentIndex + 1 : null
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = weekDays.length - 1
          break
        case 'PageUp':
          e.preventDefault()
          navigateWeek('prev')
          return
        case 'PageDown':
          e.preventDefault()
          navigateWeek('next')
          return
        default:
          return
      }

      if (nextIndex !== null) {
        const nextDay = weekDays[nextIndex]
        setFocusedDate(nextDay.date)
        setAnnounceText(
          `Focus moved to ${nextDay.date.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}`
        )

        // Focus the next day
        setTimeout(() => {
          const nextElement = containerRef.current?.querySelector(
            `[data-week-date="${nextDay.date.toString()}"]`
          ) as HTMLElement
          nextElement?.focus()
        }, 0)
      }
    },
    [weekDays, navigateWeek]
  )

  // Auto-focus management for accessibility
  useEffect(() => {
    if (focusedDate && announcementRef.current) {
      announcementRef.current.textContent = announceText
    }
  }, [focusedDate, announceText])

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className={`w-full ${className}`} shadow="sm" data-testid="week-view">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Week View</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => navigateWeek('prev')}
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>

          <Button
            variant="light"
            size="sm"
            onPress={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            aria-label="Go to current week"
          >
            Today
          </Button>

          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => navigateWeek('next')}
            aria-label="Next week"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announceText}
        </div>
        <div
          ref={announcementRef}
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        ></div>
      </CardHeader>

      <CardBody className="px-4 pb-6">
        {/* Week range display */}
        <div className="text-center mb-4">
          <p className="text-sm font-medium text-foreground-600">{formatWeekRange}</p>
          <p className="text-xs text-foreground-500 mt-1">
            Swipe left/right or use arrow keys to navigate weeks
          </p>
        </div>

        {/* Week grid */}
        {weekDays.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-content2 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-foreground-400" />
              </div>
              <p className="text-foreground-600">Unable to load week view</p>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="grid grid-cols-1 gap-3 touch-pan-x select-none"
            role="grid"
            aria-label={`Week of ${formatWeekRange}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: isDragging ? `translateX(${dragDistance}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 0.3s ease',
            }}
          >
            {weekDays.map((day, index) => {
              const dayLabel = weekDayLabels[index]
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
                  ? `, ${day.workouts.length} workout${day.workouts.length > 1 ? 's' : ''} scheduled`
                  : ''

              return (
                <div
                  key={index}
                  className={`
                    relative p-4 border border-divider rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[120px]
                    ${day.isToday ? 'ring-2 ring-primary ring-offset-1 bg-primary-50/50 dark:bg-primary-50/10' : ''}
                    ${day.isPastDue ? 'bg-danger-50/30 dark:bg-danger-50/20' : ''}
                    ${focusedDate && focusedDate.compare(day.date) === 0 ? 'ring-2 ring-secondary ring-offset-2' : ''}
                    ${isDragging ? 'pointer-events-none' : 'hover:bg-content1'}
                  `}
                  onClick={() => onDateClick?.(day.date)}
                  role="gridcell"
                  aria-label={`${formattedDate}${workoutSummary}`}
                  aria-current={day.isToday ? 'date' : undefined}
                  aria-selected={focusedDate ? focusedDate.compare(day.date) === 0 : false}
                  data-week-date={day.date.toString()}
                  tabIndex={
                    day.isToday || (focusedDate && focusedDate.compare(day.date) === 0) ? 0 : -1
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onDateClick?.(day.date)
                    } else {
                      handleKeyDown(e, day)
                    }
                  }}
                  onFocus={() => setFocusedDate(day.date)}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className={`text-sm font-semibold ${day.isToday ? 'text-primary' : ''}`}>
                        {dayLabel}
                      </div>
                      <div className={`text-lg font-bold ${day.isToday ? 'text-primary' : ''}`}>
                        {day.date.day}
                      </div>
                    </div>
                    {day.isToday && (
                      <Chip size="sm" color="primary" variant="flat">
                        Today
                      </Chip>
                    )}
                    {day.isPastDue && (
                      <Chip size="sm" color="danger" variant="flat">
                        Past Due
                      </Chip>
                    )}
                  </div>

                  {/* Workouts - Show as dots on mobile */}
                  <div className="space-y-2">
                    {day.workouts.length === 0 ? (
                      <div className="text-xs text-foreground-400 italic">No workouts</div>
                    ) : (
                      <>
                        {/* Desktop: Full workout details */}
                        <div className="hidden sm:block space-y-1">
                          {day.workouts.slice(0, 3).map(workout => (
                            <Popover key={workout.id} placement="top">
                              <PopoverTrigger>
                                <div
                                  className={`
                                    px-2 py-1 rounded text-xs cursor-pointer transition-transform hover:scale-105
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
                                    {workout.planned_distance && (
                                      <span className="text-xs opacity-75">
                                        {workout.planned_distance}mi
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs">
                                <div className="p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">
                                      {workout.planned_type?.replace('_', ' ').toUpperCase()}
                                    </h4>
                                    <Chip size="sm" color={getWorkoutColor(workout)} variant="flat">
                                      {workout.status || 'planned'}
                                    </Chip>
                                  </div>
                                  {workout.planned_distance && (
                                    <div className="text-xs">
                                      Distance: {workout.planned_distance} miles
                                    </div>
                                  )}
                                  {workout.planned_duration && (
                                    <div className="text-xs">
                                      Duration: {workout.planned_duration} min
                                    </div>
                                  )}
                                  {workout.workout_notes && (
                                    <div className="text-xs text-foreground-600">
                                      {workout.workout_notes}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ))}
                          {day.workouts.length > 3 && (
                            <div className="text-xs text-foreground-500">
                              +{day.workouts.length - 3} more
                            </div>
                          )}
                        </div>

                        {/* Mobile: Color-coded dots */}
                        <div className="sm:hidden flex flex-wrap gap-1">
                          {day.workouts.map(workout => (
                            <button
                              key={workout.id}
                              className={`
                                w-3 h-3 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                                ${getWorkoutDotColor(workout)}
                              `}
                              onClick={e => {
                                e.stopPropagation()
                                onWorkoutClick?.(workout)
                              }}
                              aria-label={`${workout.planned_type?.replace('_', ' ') || 'Workout'} - ${workout.status || 'planned'}`}
                            />
                          ))}
                          {day.workouts.length > 5 && (
                            <div className="text-xs text-foreground-500 px-1">
                              +{day.workouts.length - 5}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-divider">
          <h3 className="text-sm font-semibold text-foreground mb-3">Workout Status</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success-500" aria-hidden="true"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500" aria-hidden="true"></div>
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning-500" aria-hidden="true"></div>
              <span>High Intensity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger-500" aria-hidden="true"></div>
              <span>Skipped</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
