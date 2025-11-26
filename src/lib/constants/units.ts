/**
 * Unit conversion constants for UltraCoach
 *
 * Centralized constants for distance, elevation, and pace conversions.
 * Using named constants improves code readability and prevents magic numbers.
 */

// Distance conversions
export const METERS_PER_MILE = 1609.34
export const METERS_PER_KILOMETER = 1000
export const MILES_PER_KILOMETER = 0.621371
export const KILOMETERS_PER_MILE = 1.60934

// Elevation conversions
export const FEET_PER_METER = 3.28084
export const METERS_PER_FOOT = 0.3048

// Time conversions
export const SECONDS_PER_MINUTE = 60
export const SECONDS_PER_HOUR = 3600
export const MINUTES_PER_HOUR = 60

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE
}

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / METERS_PER_KILOMETER
}

/**
 * Convert kilometers to meters
 */
export function kilometersToMeters(kilometers: number): number {
  return kilometers * METERS_PER_KILOMETER
}

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet * METERS_PER_FOOT
}

/**
 * Format distance for display with appropriate units
 * @param meters - Distance in meters
 * @param useImperial - Whether to use miles (true) or kilometers (false)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatDistance(
  meters: number,
  useImperial: boolean = true,
  decimals: number = 2
): string {
  if (useImperial) {
    const miles = metersToMiles(meters)
    return `${miles.toFixed(decimals)} mi`
  } else {
    const km = metersToKilometers(meters)
    return `${km.toFixed(decimals)} km`
  }
}

/**
 * Format elevation for display with appropriate units
 * @param meters - Elevation in meters
 * @param useImperial - Whether to use feet (true) or meters (false)
 * @param decimals - Number of decimal places (default: 0)
 */
export function formatElevation(
  meters: number,
  useImperial: boolean = true,
  decimals: number = 0
): string {
  if (useImperial) {
    const feet = metersToFeet(meters)
    return `${feet.toFixed(decimals)} ft`
  } else {
    return `${meters.toFixed(decimals)} m`
  }
}
