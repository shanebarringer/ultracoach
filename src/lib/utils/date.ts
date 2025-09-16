/**
 * Date utility functions using date-fns for timezone-safe operations
 * These utilities ensure consistent date handling across the application
 * and prevent timezone drift issues in date comparisons
 */
import {
  addDays,
  compareAsc,
  compareDesc,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'

/**
 * Converts a date to YYYY-MM-DD format in local timezone
 * This prevents UTC drift when comparing dates
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 */
export const toLocalYMD = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

/**
 * Normalizes a date to the start of day in local timezone
 * Useful for date-only comparisons without time components
 * @param date - Date object or ISO string
 * @returns Date at 00:00:00.000 local time
 */
export const normalizeToStartOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return startOfDay(d)
}

/**
 * Normalizes a date to the end of day in local timezone
 * @param date - Date object or ISO string
 * @returns Date at 23:59:59.999 local time
 */
export const normalizeToEndOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return endOfDay(d)
}

/**
 * Checks if a workout date is upcoming (today or future)
 * @param workoutDate - Workout date as Date object or ISO string
 * @returns True if workout is today or in the future
 */
export const isWorkoutUpcoming = (workoutDate: Date | string): boolean => {
  const workout = normalizeToStartOfDay(workoutDate)
  const today = startOfDay(new Date())
  return isAfter(workout, today) || isSameDay(workout, today)
}

/**
 * Checks if a workout date is in the past
 * @param workoutDate - Workout date as Date object or ISO string
 * @returns True if workout is before today
 */
export const isWorkoutPast = (workoutDate: Date | string): boolean => {
  const workout = normalizeToStartOfDay(workoutDate)
  const today = startOfDay(new Date())
  return isBefore(workout, today)
}

/**
 * Checks if a workout is within the next N days
 * @param workoutDate - Workout date as Date object or ISO string
 * @param days - Number of days to look ahead
 * @returns True if workout is within the specified range
 */
export const isWorkoutWithinDays = (workoutDate: Date | string, days: number): boolean => {
  const workout = normalizeToStartOfDay(workoutDate)
  const today = startOfDay(new Date())
  const endDate = startOfDay(addDays(today, days))

  return isWithinInterval(workout, {
    start: today,
    end: endDate,
  })
}

/**
 * Compares two dates for sorting in ascending order
 * @param dateA - First date
 * @param dateB - Second date
 * @returns Negative if A < B, positive if A > B, 0 if equal
 */
export const compareDatesAsc = (dateA: Date | string, dateB: Date | string): number => {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB
  return compareAsc(a, b)
}

/**
 * Compares two dates for sorting in descending order
 * @param dateA - First date
 * @param dateB - Second date
 * @returns Negative if A > B, positive if A < B, 0 if equal
 */
export const compareDatesDesc = (dateA: Date | string, dateB: Date | string): number => {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB
  return compareDesc(a, b)
}

/**
 * Checks if two dates are the same day (ignoring time)
 * @param dateA - First date
 * @param dateB - Second date
 * @returns True if both dates are on the same day
 */
export const areSameDay = (dateA: Date | string, dateB: Date | string): boolean => {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB
  return isSameDay(a, b)
}

/**
 * Gets the start and end of the current week
 * @returns Object with start and end dates for the current week
 */
export const getCurrentWeekRange = (): { start: Date; end: Date } => {
  const today = new Date()
  const start = startOfDay(today)
  const end = startOfDay(addDays(today, 7))
  return { start, end }
}

/**
 * Formats a date for display in the UI
 * @param date - Date to format
 * @param formatStr - Optional format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string
 */
export const formatDateForDisplay = (
  date: Date | string,
  formatStr: string = 'MMM d, yyyy'
): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}
