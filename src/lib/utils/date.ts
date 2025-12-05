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
 * Common date formats found in CSV files for race imports.
 * Order matters: most specific/unambiguous formats first.
 */
const CSV_DATE_FORMATS = [
  'yyyy-MM-dd', // ISO date-only (most reliable)
  'MM/dd/yyyy', // US format
  'dd/MM/yyyy', // EU format
  'MMMM d, yyyy', // "January 15, 2024"
  'MMMM do, yyyy', // "January 15th, 2024"
  'MMM d, yyyy', // "Jan 15, 2024"
  'd MMM yyyy', // "15 Jan 2024"
  'MM-dd-yyyy', // US with dashes
]

/**
 * Parses date strings from CSV imports with support for multiple formats.
 * Uses date-fns with explicit format patterns to ensure deterministic behavior
 * across all environments (no engine-dependent Date parsing).
 *
 * @param dateStr - Date string from CSV file
 * @returns Parsed Date object or null if invalid/unparseable
 */
export const parseCSVDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null

  const trimmed = dateStr.trim()
  if (!trimmed) return null

  // Try parseInput first (handles ISO strings with time)
  try {
    const parsed = parseInput(trimmed)
    if (isValid(parsed)) return parsed
  } catch {
    // Continue to explicit format attempts
  }

  // Try explicit CSV formats
  for (const fmt of CSV_DATE_FORMATS) {
    try {
      const parsed = parseFmt(trimmed, fmt, new Date())
      if (isValid(parsed)) return parsed
    } catch {
      // Continue to next format
    }
  }

  return null
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
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0,
  referenceDate: Date = new Date()
): { start: Date; end: Date } => {
  const start = startOfWeek(referenceDate, { weekStartsOn })
  const end = endOfWeek(referenceDate, { weekStartsOn })
  return { start, end }
}

/**
 * Formats a date using consistent locale to prevent hydration mismatches.
 * Uses explicit format string to ensure server and client render identically.
 * @param date - Date to format (Date object or string)
 * @param formatStr - Format string (defaults to 'MM/dd/yyyy')
 * @returns Formatted date string consistent between SSR and client
 */
export const formatDateConsistent = (
  date: Date | string | null | undefined,
  formatStr: string = 'MM/dd/yyyy'
): string => {
  if (!date) return 'No date'
  const parsed = parseWorkoutDate(date)
  if (!parsed) return 'Invalid date'
  return format(parsed, formatStr)
}

/**
 * Formats a time using consistent locale to prevent hydration mismatches.
 * Uses explicit format string to ensure server and client render identically.
 * @param date - Date/time to format (Date object or string)
 * @param formatStr - Format string (defaults to 'h:mm a')
 * @returns Formatted time string consistent between SSR and client
 */
export const formatTimeConsistent = (
  date: Date | string | null | undefined,
  formatStr: string = 'h:mm a'
): string => {
  if (!date) return ''
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return ''
  return format(parsed, formatStr)
}

/**
 * Formats a date with short month name for compact display.
 * @param date - Date to format
 * @returns Formatted string like "Jan 15, 2024"
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  return formatDateConsistent(date, 'MMM d, yyyy')
}

/**
 * Formats a date with full details for detailed display.
 * @param date - Date to format
 * @returns Formatted string like "Monday, January 15, 2024"
 */
export const formatDateLong = (date: Date | string | null | undefined): string => {
  return formatDateConsistent(date, 'EEEE, MMMM d, yyyy')
}

/**
 * Formats a number using consistent locale to prevent hydration mismatches.
 * @param value - Number to format
 * @param options - Formatting options (decimals, thousands separator, etc.)
 * @returns Formatted number string consistent between SSR and client
 */
export const formatNumberConsistent = (
  value: number | null | undefined,
  options: {
    decimals?: number
    includeCommas?: boolean
  } = {}
): string => {
  if (value === null || value === undefined) return '0'

  const { decimals = 0, includeCommas = true } = options

  const rounded = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()

  if (!includeCommas) return rounded

  // Add thousand separators manually to ensure consistency
  const parts = rounded.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/**
 * Formats a date as "Month Year" for better UX (e.g., "November 2024")
 * Uses consistent formatting to prevent hydration mismatches
 *
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted string like "November 2024" or "No date" if invalid
 */
export const formatMonthYear = (date: Date | string | null | undefined): string => {
  if (!date) return 'No date'
  const parsed = parseWorkoutDate(date)
  if (!parsed) return 'Invalid date'
  return format(parsed, 'MMMM yyyy')
}
