/**
 * Tests for date utility functions
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  areSameDay,
  compareDatesAsc,
  compareDatesDesc,
  formatDateForDisplay,
  getRollingWeekRange,
  isWorkoutPast,
  isWorkoutUpcoming,
  isWorkoutWithinDays,
  normalizeToEndOfDay,
  normalizeToStartOfDay,
  toLocalYMD,
} from '../date'

describe('Date Utilities', () => {
  beforeAll(() => vi.setSystemTime(new Date('2024-03-16T10:00:00Z')))
  afterAll(() => vi.useRealTimers())
  describe('toLocalYMD', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(toLocalYMD(date)).toBe('2024-03-15')
    })

    it('should format ISO string to YYYY-MM-DD', () => {
      const dateString = '2024-03-15T14:30:00.000Z'
      expect(toLocalYMD(dateString)).toBe('2024-03-15')
    })

    it('should handle dates at midnight', () => {
      const date = new Date('2024-03-15T00:00:00')
      expect(toLocalYMD(date)).toBe('2024-03-15')
    })
  })

  describe('normalizeToStartOfDay', () => {
    it('should normalize Date to start of day', () => {
      const date = new Date('2024-03-15T14:30:45.123')
      const normalized = normalizeToStartOfDay(date)
      expect(normalized.getHours()).toBe(0)
      expect(normalized.getMinutes()).toBe(0)
      expect(normalized.getSeconds()).toBe(0)
      expect(normalized.getMilliseconds()).toBe(0)
    })

    it('should normalize ISO string to start of day', () => {
      const dateString = '2024-03-15T14:30:45.123Z'
      const normalized = normalizeToStartOfDay(dateString)
      expect(normalized.getHours()).toBe(0)
      expect(normalized.getMinutes()).toBe(0)
      expect(normalized.getSeconds()).toBe(0)
      expect(normalized.getMilliseconds()).toBe(0)
    })
  })

  describe('normalizeToEndOfDay', () => {
    it('should normalize Date to end of day', () => {
      const date = new Date('2024-03-15T14:30:45.123')
      const normalized = normalizeToEndOfDay(date)
      expect(normalized.getHours()).toBe(23)
      expect(normalized.getMinutes()).toBe(59)
      expect(normalized.getSeconds()).toBe(59)
      expect(normalized.getMilliseconds()).toBe(999)
    })

    it('should normalize ISO string to end of day', () => {
      const dateString = '2024-03-15T14:30:45.123Z'
      const normalized = normalizeToEndOfDay(dateString)
      expect(normalized.getHours()).toBe(23)
      expect(normalized.getMinutes()).toBe(59)
      expect(normalized.getSeconds()).toBe(59)
      expect(normalized.getMilliseconds()).toBe(999)
    })
  })

  describe('isWorkoutUpcoming', () => {
    it('should return true for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isWorkoutUpcoming(tomorrow)).toBe(true)
    })

    it('should return true for today', () => {
      const today = new Date()
      expect(isWorkoutUpcoming(today)).toBe(true)
    })

    it('should return false for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isWorkoutPast(yesterday)).toBe(true)
      expect(isWorkoutUpcoming(yesterday)).toBe(false)
    })
  })

  describe('isWorkoutPast', () => {
    it('should return true for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isWorkoutPast(yesterday)).toBe(true)
    })

    it('should return false for today', () => {
      const today = new Date()
      expect(isWorkoutPast(today)).toBe(false)
    })

    it('should return false for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isWorkoutPast(tomorrow)).toBe(false)
    })
  })

  describe('isWorkoutWithinDays', () => {
    it('should return true for dates within range', () => {
      const today = new Date()
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      expect(isWorkoutWithinDays(today, 7)).toBe(true)
      expect(isWorkoutWithinDays(threeDaysFromNow, 7)).toBe(true)
    })

    it('should return false for dates outside range', () => {
      const tenDaysFromNow = new Date()
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)

      expect(isWorkoutWithinDays(tenDaysFromNow, 7)).toBe(false)
    })

    it('should return false for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      expect(isWorkoutWithinDays(yesterday, 7)).toBe(false)
    })

    it('should include exactly N days ahead (inclusive end)', () => {
      const n = 7
      const nDaysFromNow = new Date()
      nDaysFromNow.setDate(nDaysFromNow.getDate() + n)
      expect(isWorkoutWithinDays(nDaysFromNow, n)).toBe(true)
    })
  })

  describe('compareDatesAsc', () => {
    it('should return negative for earlier date first', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-02')
      expect(compareDatesAsc(date1, date2)).toBeLessThan(0)
    })

    it('should return positive for later date first', () => {
      const date1 = new Date('2024-01-02')
      const date2 = new Date('2024-01-01')
      expect(compareDatesAsc(date1, date2)).toBeGreaterThan(0)
    })

    it('should return 0 for equal dates', () => {
      const date1 = new Date('2024-01-01T12:00:00')
      const date2 = new Date('2024-01-01T12:00:00')
      expect(compareDatesAsc(date1, date2)).toBe(0)
    })

    it('should work with ISO strings', () => {
      const date1 = '2024-01-01T00:00:00.000Z'
      const date2 = '2024-01-02T00:00:00.000Z'
      expect(compareDatesAsc(date1, date2)).toBeLessThan(0)
    })
  })

  describe('compareDatesDesc', () => {
    it('should return positive for earlier date first', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-02')
      expect(compareDatesDesc(date1, date2)).toBeGreaterThan(0)
    })

    it('should return negative for later date first', () => {
      const date1 = new Date('2024-01-02')
      const date2 = new Date('2024-01-01')
      expect(compareDatesDesc(date1, date2)).toBeLessThan(0)
    })

    it('should return 0 for equal dates', () => {
      const date1 = new Date('2024-01-01T12:00:00')
      const date2 = new Date('2024-01-01T12:00:00')
      expect(compareDatesDesc(date1, date2)).toBe(0)
    })
  })

  describe('areSameDay', () => {
    it('should return true for same day different times', () => {
      const date1 = new Date('2024-01-01T08:00:00')
      const date2 = new Date('2024-01-01T18:00:00')
      expect(areSameDay(date1, date2)).toBe(true)
    })

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-01T23:59:59')
      const date2 = new Date('2024-01-02T00:00:00')
      expect(areSameDay(date1, date2)).toBe(false)
    })

    it('should work with ISO strings', () => {
      const date1 = '2024-01-01T08:00:00.000Z'
      const date2 = '2024-01-01T18:00:00.000Z'
      expect(areSameDay(date1, date2)).toBe(true)
    })
  })

  describe('getRollingWeekRange', () => {
    it('should return rolling 7-day window starting today', () => {
      const { start, end } = getRollingWeekRange()

      // Start should be today at 00:00:00
      const today = new Date()
      expect(start.getDate()).toBe(today.getDate())
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)

      // End should be 7 days from today at 00:00:00
      const expectedEnd = new Date(today)
      expectedEnd.setDate(expectedEnd.getDate() + 7)
      expect(end.getDate()).toBe(expectedEnd.getDate())
      expect(end.getHours()).toBe(0)
      expect(end.getMinutes()).toBe(0)
      expect(end.getSeconds()).toBe(0)
    })
  })

  describe('formatDateForDisplay', () => {
    it('should use default format when not specified', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(formatDateForDisplay(date)).toBe('Mar 15, 2024')
    })

    it('should use custom format when specified', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(formatDateForDisplay(date, 'yyyy-MM-dd')).toBe('2024-03-15')
      expect(formatDateForDisplay(date, 'dd/MM/yyyy')).toBe('15/03/2024')
    })

    it('should work with ISO strings', () => {
      const dateString = '2024-03-15T14:30:00.000Z'
      expect(formatDateForDisplay(dateString)).toBe('Mar 15, 2024')
    })
  })
})
