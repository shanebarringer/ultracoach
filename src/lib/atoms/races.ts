// Race management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Race } from '@/lib/supabase'

// Core race atoms
export const racesAtom = atom<Race[]>([])
export const racesLoadingAtom = atom(false)
export const racesErrorAtom = atom<string | null>(null)

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
