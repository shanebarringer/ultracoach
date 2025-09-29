// Race management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { createLogger } from '@/lib/logger'
import type { Race } from '@/lib/supabase'

// Module-level logger for better performance
const logger = createLogger('RacesAtom')

// Core race atoms
export const racesAtom = atom<Race[]>([])
racesAtom.debugLabel = 'racesAtom'
export const racesLoadingAtom = atom(false)
racesLoadingAtom.debugLabel = 'racesLoadingAtom'
export const racesErrorAtom = atom<string | null>(null)
racesErrorAtom.debugLabel = 'racesErrorAtom'

// Async race fetching atom with refresh trigger
export const racesRefreshTriggerAtom = atom(0)
racesRefreshTriggerAtom.debugLabel = 'racesRefreshTriggerAtom'

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
        credentials: 'same-origin',
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
asyncRacesAtom.debugLabel = 'asyncRacesAtom'

// Refresh action atom
export const refreshRacesAtom = atom(null, (get, set) => {
  set(racesRefreshTriggerAtom, get(racesRefreshTriggerAtom) + 1)
})
refreshRacesAtom.debugLabel = 'refreshRacesAtom'

// Selected race atoms
export const selectedRaceAtom = atom<Race | null>(null)
selectedRaceAtom.debugLabel = 'selectedRaceAtom'
export const selectedRaceIdAtom = atom<string | null>(null)
selectedRaceIdAtom.debugLabel = 'selectedRaceIdAtom'

// Race filtering atoms
export const raceSearchTermAtom = atomWithStorage('raceSearchTerm', '')
raceSearchTermAtom.debugLabel = 'raceSearchTermAtom'
export const raceDistanceFilterAtom = atomWithStorage('raceDistanceFilter', 'all')
raceDistanceFilterAtom.debugLabel = 'raceDistanceFilterAtom'
export const raceTerrainFilterAtom = atomWithStorage('raceTerrainFilter', 'all')
raceTerrainFilterAtom.debugLabel = 'raceTerrainFilterAtom'
export const raceSortByAtom = atomWithStorage<'date' | 'distance' | 'name'>('raceSortBy', 'date')
raceSortByAtom.debugLabel = 'raceSortByAtom'

// Race import atoms
export const raceImportProgressAtom = atom({
  current: 0,
  total: 0,
  message: '',
})
raceImportProgressAtom.debugLabel = 'raceImportProgressAtom'
export const raceImportErrorsAtom = atom<string[]>([])
raceImportErrorsAtom.debugLabel = 'raceImportErrorsAtom'
