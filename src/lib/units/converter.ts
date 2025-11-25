/**
 * Unit Converter
 *
 * Converts measurements according to user preferences:
 * - Distance (miles/kilometers)
 * - Elevation (feet/meters)
 * - Pace (min/mile, min/km, mph, km/h)
 * - Temperature (Fahrenheit/Celsius)
 * - Time (12h/24h format)
 * - Date formats
 */
import { format as formatDate, parse } from 'date-fns'

import type { UnitPreferences } from '@/lib/atoms/settings'
import { createLogger } from '@/lib/logger'

const logger = createLogger('UnitConverter')

// Default preferences for fallback
export const DEFAULT_UNIT_PREFS: UnitPreferences = {
  distance: 'miles',
  elevation: 'feet',
  temperature: 'fahrenheit',
  pace_format: 'min_per_mile',
  time_format: '12h',
  date_format: 'MM/dd/yyyy',
}

export class UnitConverter {
  constructor(private preferences: UnitPreferences = DEFAULT_UNIT_PREFS) {
    logger.debug('UnitConverter initialized with preferences:', preferences)
  }

  /**
   * Convert distance with optional source unit
   * Returns formatted string with unit label
   */
  distance(value: number, fromUnit: 'miles' | 'kilometers' = 'miles'): string {
    const targetUnit = this.preferences.distance

    if (fromUnit === targetUnit) {
      return `${value.toFixed(2)} ${targetUnit === 'miles' ? 'mi' : 'km'}`
    }

    const converted =
      fromUnit === 'miles'
        ? value * 1.60934 // miles to km
        : value * 0.621371 // km to miles

    const label = targetUnit === 'miles' ? 'mi' : 'km'
    return `${converted.toFixed(2)} ${label}`
  }

  /**
   * Convert distance and return numeric value only
   */
  distanceValue(value: number, fromUnit: 'miles' | 'kilometers' = 'miles'): number {
    const targetUnit = this.preferences.distance

    if (fromUnit === targetUnit) {
      return value
    }

    return fromUnit === 'miles'
      ? value * 1.60934 // miles to km
      : value * 0.621371 // km to miles
  }

  /**
   * Convert elevation with optional source unit
   * Returns formatted string with unit label
   */
  elevation(value: number, fromUnit: 'feet' | 'meters' = 'feet'): string {
    const targetUnit = this.preferences.elevation

    if (fromUnit === targetUnit) {
      return `${Math.round(value)} ${targetUnit === 'feet' ? 'ft' : 'm'}`
    }

    const converted =
      fromUnit === 'feet'
        ? value * 0.3048 // feet to meters
        : value * 3.28084 // meters to feet

    const label = targetUnit === 'feet' ? 'ft' : 'm'
    return `${Math.round(converted)} ${label}`
  }

  /**
   * Convert elevation and return numeric value only
   */
  elevationValue(value: number, fromUnit: 'feet' | 'meters' = 'feet'): number {
    const targetUnit = this.preferences.elevation

    if (fromUnit === targetUnit) {
      return value
    }

    return fromUnit === 'feet'
      ? value * 0.3048 // feet to meters
      : value * 3.28084 // meters to feet
  }

  /**
   * Convert pace (input is always minutes per mile)
   * Returns formatted string based on user preference
   */
  pace(minPerMile: number): string {
    const format = this.preferences.pace_format

    switch (format) {
      case 'min_per_mile': {
        const minutes = Math.floor(minPerMile)
        const seconds = Math.round((minPerMile % 1) * 60)
        return `${minutes}:${String(seconds).padStart(2, '0')}/mi`
      }

      case 'min_per_km': {
        const minPerKm = minPerMile / 1.60934
        const minutes = Math.floor(minPerKm)
        const seconds = Math.round((minPerKm % 1) * 60)
        return `${minutes}:${String(seconds).padStart(2, '0')}/km`
      }

      case 'mph': {
        const mph = 60 / minPerMile
        return `${mph.toFixed(1)} mph`
      }

      case 'kmh': {
        const kmh = (60 / minPerMile) * 1.60934
        return `${kmh.toFixed(1)} km/h`
      }

      default:
        return `${minPerMile.toFixed(2)} min/mi`
    }
  }

  /**
   * Convert temperature
   * Returns formatted string with degree symbol
   */
  temperature(value: number, fromUnit: 'fahrenheit' | 'celsius' = 'fahrenheit'): string {
    const targetUnit = this.preferences.temperature

    if (fromUnit === targetUnit) {
      return `${Math.round(value)}°${targetUnit === 'fahrenheit' ? 'F' : 'C'}`
    }

    const converted =
      fromUnit === 'fahrenheit'
        ? ((value - 32) * 5) / 9 // F to C
        : (value * 9) / 5 + 32 // C to F

    const label = targetUnit === 'fahrenheit' ? 'F' : 'C'
    return `${Math.round(converted)}°${label}`
  }

  /**
   * Format time according to user preference (12h/24h)
   */
  formatTime(date: Date): string {
    const format = this.preferences.time_format

    if (format === '24h') {
      return formatDate(date, 'HH:mm')
    }

    return formatDate(date, 'h:mm a')
  }

  /**
   * Format date according to user preference
   */
  formatDate(date: Date): string {
    const format = this.preferences.date_format

    switch (format) {
      case 'MM/dd/yyyy':
        return formatDate(date, 'MM/dd/yyyy')
      case 'dd/MM/yyyy':
        return formatDate(date, 'dd/MM/yyyy')
      case 'yyyy-MM-dd':
        return formatDate(date, 'yyyy-MM-dd')
      default:
        return formatDate(date, 'MM/dd/yyyy')
    }
  }

  /**
   * Format datetime according to user preferences
   */
  formatDateTime(date: Date): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`
  }

  /**
   * Parse date string according to user preference
   */
  parseDate(dateString: string): Date {
    const format = this.preferences.date_format
    return parse(dateString, format, new Date())
  }

  /**
   * Get distance unit label
   */
  getDistanceUnit(): string {
    return this.preferences.distance === 'miles' ? 'mi' : 'km'
  }

  /**
   * Get elevation unit label
   */
  getElevationUnit(): string {
    return this.preferences.elevation === 'feet' ? 'ft' : 'm'
  }

  /**
   * Get pace unit label
   */
  getPaceUnit(): string {
    const format = this.preferences.pace_format

    switch (format) {
      case 'min_per_mile':
        return 'min/mi'
      case 'min_per_km':
        return 'min/km'
      case 'mph':
        return 'mph'
      case 'kmh':
        return 'km/h'
      default:
        return 'min/mi'
    }
  }

  /**
   * Get temperature unit label
   */
  getTemperatureUnit(): string {
    return this.preferences.temperature === 'fahrenheit' ? '°F' : '°C'
  }
}
