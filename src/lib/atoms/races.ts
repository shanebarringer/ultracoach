// Race management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { createLogger } from '@/lib/logger'
import type { Race } from '@/lib/supabase'

// Module-level logger for better performance
const logger = createLogger('RacesAtom')

// Core race atoms
export const racesAtom = atom<Race[]>([])
export const racesLoadingAtom = atom(false)
export const racesErrorAtom = atom<string | null>(null)

// Async race fetching atom with refresh trigger
export const racesRefreshTriggerAtom = atom(0)

export const asyncRacesAtom = atom(
  async get => {
    get(racesRefreshTriggerAtom) // Subscribe to refresh trigger

    try {
      logger.debug('Fetching races...')
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/races`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorMessage = `Failed to fetch races: ${response.status} ${response.statusText}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      logger.info('Races fetched successfully', { count: data.length || 0 })
      return data || []
    } catch (error) {
      // Re-throw to let Suspense boundary handle it
      logger.error('Error fetching races:', error)
      throw error
    }
  },
  (_, set, newValue: Race[]) => {
    set(racesAtom, newValue)
    set(racesErrorAtom, null) // Clear any existing errors when data is set
  }
)

// Refresh action atom
export const refreshRacesAtom = atom(null, (get, set) => {
  set(racesRefreshTriggerAtom, get(racesRefreshTriggerAtom) + 1)
})

// Selected race atoms
export const selectedRaceAtom = atom<Race | null>(null)
export const selectedRaceIdAtom = atom<string | null>(null)

// Race filtering atoms
export const raceSearchTermAtom = atomWithStorage('raceSearchTerm', '')
export const raceDistanceFilterAtom = atomWithStorage('raceDistanceFilter', 'all')
export const raceTerrainFilterAtom = atomWithStorage('raceTerrainFilter', 'all')
export const raceSortByAtom = atomWithStorage<'date' | 'distance' | 'name'>('raceSortBy', 'date')

// Race import atoms
export const raceImportProgressAtom = atom({
  current: 0,
  total: 0,
  message: '',
})
export const raceImportErrorsAtom = atom<string[]>([])
