// Race management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { api } from '@/lib/api-client'
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

    // SSR-safe: return empty array during server-side rendering
    if (typeof window === 'undefined') {
      return []
    }

    try {
      logger.debug('Fetching races...')
      const response = await api.get<Race[]>('/api/races', {
        suppressGlobalToast: true, // Atom handles its own error handling
      })

      const data = response.data
      logger.info('Races fetched successfully', { count: data?.length || 0 })
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

// Jotai Devtools debug labels
racesAtom.debugLabel = 'races/list'
racesLoadingAtom.debugLabel = 'races/loading'
racesErrorAtom.debugLabel = 'races/error'
racesRefreshTriggerAtom.debugLabel = 'races/refreshTrigger'
asyncRacesAtom.debugLabel = 'races/async'
refreshRacesAtom.debugLabel = 'races/refreshAction'
selectedRaceAtom.debugLabel = 'races/selected'
selectedRaceIdAtom.debugLabel = 'races/selectedId'
raceSearchTermAtom.debugLabel = 'races/searchTerm'
raceDistanceFilterAtom.debugLabel = 'races/distanceFilter'
raceTerrainFilterAtom.debugLabel = 'races/terrainFilter'
raceSortByAtom.debugLabel = 'races/sortBy'
raceImportProgressAtom.debugLabel = 'races/importProgress'
raceImportErrorsAtom.debugLabel = 'races/importErrors'
