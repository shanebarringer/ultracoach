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
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  isWithinInterval,
  parse as parseFmt,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'

/**
 * Parses date inputs safely to prevent UTC vs local timezone drift:
 * - Date objects: returned as-is
 * - ISO strings with time ("T"): parsed as ISO to preserve time information
 * - Date-only strings (YYYY-MM-DD): parsed as local date to avoid UTC drift
 * @param date - Date object or string to parse
 * @returns Parsed Date object in the correct timezone
 */
export const parseInput = (date: Date | string): Date => {
  if (typeof date !== 'string') return date
  return date.includes('T') ? parseISO(date) : parseFmt(date, 'yyyy-MM-dd', new Date())
}

/**
 * Converts a date to YYYY-MM-DD format in local timezone
 * This prevents UTC drift when comparing dates
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 */
export const toLocalYMD = (date: Date | string): string => {
  const d = parseInput(date)
  return format(startOfDay(d), 'yyyy-MM-dd')
}

/**
 * Normalizes a date to the start of day in local timezone
 * Useful for date-only comparisons without time components
 * @param date - Date object or ISO string
 * @returns Date at 00:00:00.000 local time
 */
export const normalizeToStartOfDay = (date: Date | string): Date => {
  const d = parseInput(date)
  return startOfDay(d)
}

/**
 * Normalizes a date to the end of day in local timezone
 * @param date - Date object or ISO string
 * @returns Date at 23:59:59.999 local time
 */
export const normalizeToEndOfDay = (date: Date | string): Date => {
  const d = parseInput(date)
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
 * Checks if a workout is within the next N days (inclusive range)
 * @param workoutDate - Workout date as Date object or ISO string
 * @param days - Number of days to look ahead
 * @returns True if workout is within the specified range (includes today and day N)
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
  const a = parseInput(dateA)
  const b = parseInput(dateB)
  return compareAsc(a, b)
}

/**
 * Compares two dates for sorting in descending order
 * @param dateA - First date
 * @param dateB - Second date
 * @returns Negative if A > B, positive if A < B, 0 if equal
 */
export const compareDatesDesc = (dateA: Date | string, dateB: Date | string): number => {
  const a = parseInput(dateA)
  const b = parseInput(dateB)
  return compareDesc(a, b)
}

/**
 * Checks if two dates are the same day (ignoring time)
 * @param dateA - First date
 * @param dateB - Second date
 * @returns True if both dates are on the same day
 */
export const areSameDay = (dateA: Date | string, dateB: Date | string): boolean => {
  const a = parseInput(dateA)
  const b = parseInput(dateB)
  return isSameDay(a, b)
}

/**
 * Gets a rolling 7-day window starting today (start-of-day)
 * @returns Object with start (today) and end (7 days from today) dates
 */
export const getRollingWeekRange = (): { start: Date; end: Date } => {
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
  const d = parseInput(date)
  return format(d, formatStr)
}

/**
 * Parses workout date strings with validation for UI components and atoms.
 * This is the shared utility that prevents date parsing duplication and ensures
 * all workout dates are validated before use to prevent NaN errors in sorting.
 *
 * @param dateStr - Date string to parse (can be undefined/null)
 * @returns Parsed Date object or null if invalid/empty
 */
export const parseWorkoutDate = (date?: string | Date | null): Date | null => {
  if (!date) return null
  const parsed = typeof date === 'string' ? parseInput(date) : date
  return isValid(parsed) ? parsed : null
}

/**
 * Get week boundaries (start and end) with configurable week start day.
 * Centralizes week range logic to ensure consistency across the app.
 * @param weekStartsOn - Day of week that starts the week (0 = Sunday, 1 = Monday)
 * @param referenceDate - Date to get week range for (defaults to today)
 * @returns Object with start and end Date objects for the week
 */
export const getWeekRange = (
  weekStartsOn: 0 | 1 = 0,
  referenceDate: Date = new Date()
): { start: Date; end: Date } => {
  const start = startOfWeek(referenceDate, { weekStartsOn })
  const end = endOfWeek(referenceDate, { weekStartsOn })
  return { start, end }
}
