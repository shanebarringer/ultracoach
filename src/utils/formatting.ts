/**
 * Formatting utilities for consistent data display across the application
 */

/**
 * Get the user's locale for date and number formatting
 * @returns The browser's language setting or 'en-US' as fallback
 */
export function getUserLocale(): string {
  return typeof navigator !== 'undefined' ? navigator.language : 'en-US'
}

/**
 * Format label by replacing underscores with spaces
 * Handles null/undefined values safely
 * @param label - The label to format (can be string, null, or undefined)
 * @returns Formatted label or empty string if input is null/undefined
 */
export function formatLabel(label: string | null | undefined): string {
  return label?.replace(/_/g, ' ') || ''
}
