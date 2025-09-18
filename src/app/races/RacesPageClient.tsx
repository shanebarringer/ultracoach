'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  useDisclosure,
} from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  CalendarIcon,
  EditIcon,
  FilterIcon,
  FlagIcon,
  GlobeIcon,
  MapPinIcon,
  MountainSnowIcon,
  PlusIcon,
  RouteIcon,
  SearchIcon,
  TrashIcon,
  TrendingUpIcon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import Layout from '@/components/layout/Layout'
import RaceImportModal from '@/components/races/RaceImportModal'
import RaceTrainingPlansModal from '@/components/races/RaceTrainingPlansModal'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { RacesPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { asyncRacesAtom, racesAtom, refreshRacesAtom, selectedRaceAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Race } from '@/lib/supabase'

const DISTANCE_TYPES = [
  { key: '50K', label: '50K (31.07 miles)' },
  { key: '50M', label: '50 Mile' },
  { key: '100K', label: '100K (62.14 miles)' },
  { key: '100M', label: '100 Mile' },
  { key: 'Marathon', label: 'Marathon (26.2 miles)' },
  { key: 'Custom', label: 'Custom Distance' },
]

const TERRAIN_TYPES = [
  { key: 'trail', label: 'Trail/Single Track' },
  { key: 'mountain', label: 'Mountain/Technical' },
  { key: 'road', label: 'Road/Paved' },
  { key: 'mixed', label: 'Mixed Terrain' },
]

// Inner component that uses the async atom
function RacesContent() {
  const races = useAtomValue(asyncRacesAtom) // This will trigger the async fetch
  const [localRaces, setLocalRaces] = useAtom(racesAtom)
  const refresh = useSetAtom(refreshRacesAtom)
  const [selectedRace, setSelectedRace] = useAtom(selectedRaceAtom)
  const logger = useMemo(() => createLogger('RacesContent'), [])

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [distanceFilter, setDistanceFilter] = useState('all')
  const [terrainFilter, setTerrainFilter] = useState('all')

  // Update local races when async races are fetched
  useEffect(() => {
    // Always set races, even if empty, to clear stale data
    setLocalRaces(races || [])
  }, [races, setLocalRaces])

  // Filter and search races
  const filteredRaces = useMemo(() => {
    const racesArray = Array.isArray(localRaces) ? localRaces : []

    return racesArray.filter((race: Race) => {
      const matchesSearch =
        !searchQuery ||
        race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        race.location.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDistance = distanceFilter === 'all' || race.distance_type === distanceFilter
      const matchesTerrain = terrainFilter === 'all' || race.terrain_type === terrainFilter

      return matchesSearch && matchesDistance && matchesTerrain
    })
  }, [localRaces, searchQuery, distanceFilter, terrainFilter])

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    distance_miles: '',
    distance_type: '50K',
    location: '',
    elevation_gain_feet: '',
    terrain_type: 'trail',
    website_url: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [trainingPlanCounts, setTrainingPlanCounts] = useState<Record<string, number>>({})
  const [selectedRaceForPlans, setSelectedRaceForPlans] = useState<Race | null>(null)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isTrainingPlansOpen,
    onOpen: onTrainingPlansOpen,
    onClose: onTrainingPlansClose,
  } = useDisclosure()
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure()

  // Fetch training plan counts for all races
  const fetchTrainingPlanCounts = useCallback(async () => {
    const racesArray = Array.isArray(localRaces) ? localRaces : []
    if (racesArray.length === 0) return

    try {
      const counts: Record<string, number> = {}

      // Fetch counts for each race in parallel
      const countPromises = racesArray.map(async (race: Race) => {
        try {
          const response = await fetch(`/api/races/${race.id}/training-plans`, {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            counts[race.id] = data.count || 0
          }
        } catch (error) {
          logger.warn(`Failed to fetch training plan count for race ${race.id}:`, error)
          counts[race.id] = 0
        }
      })

      await Promise.all(countPromises)
      setTrainingPlanCounts(counts)
      logger.debug('Training plan counts fetched', { counts })
    } catch (error) {
      logger.error('Error fetching training plan counts:', error)
    }
  }, [localRaces, logger])

  const handleViewTrainingPlans = (race: Race) => {
    setSelectedRaceForPlans(race)
    onTrainingPlansOpen()
  }

  // Fetch training plan counts when races are loaded
  useEffect(() => {
    const racesArray = Array.isArray(localRaces) ? localRaces : []
    if (racesArray.length > 0) {
      fetchTrainingPlanCounts()
    }
  }, [localRaces, fetchTrainingPlanCounts])

  const handleOpenModal = (race?: Race) => {
    if (race) {
      setSelectedRace(race)
      setFormData({
        name: race.name,
        date: race.date,
        distance_miles: race.distance_miles.toString(),
        distance_type: race.distance_type,
        location: race.location,
        elevation_gain_feet: race.elevation_gain_feet.toString(),
        terrain_type: race.terrain_type,
        website_url: race.website_url || '',
        notes: race.notes || '',
      })
    } else {
      setSelectedRace(null)
      setFormData({
        name: '',
        date: '',
        distance_miles: '',
        distance_type: '50K',
        location: '',
        elevation_gain_feet: '',
        terrain_type: 'trail',
        website_url: '',
        notes: '',
      })
    }
    onOpen()
  }

  const handleCloseModal = () => {
    setSelectedRace(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = selectedRace ? `/api/races/${selectedRace.id}` : '/api/races'
      const method = selectedRace ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          distance_miles: parseFloat(formData.distance_miles),
          elevation_gain_feet: parseInt(formData.elevation_gain_feet) || 0,
        }),
      })

      if (response.ok) {
        refresh() // Trigger refresh of races
        handleCloseModal()
        logger.info(`Race ${selectedRace ? 'updated' : 'created'} successfully`)
      } else {
        logger.error('Failed to save race:', response.statusText)
      }
    } catch (error) {
      logger.error('Error saving race:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (raceId: string) => {
    if (!confirm('Are you sure you want to delete this race?')) return

    try {
      const response = await fetch(`/api/races/${raceId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        refresh() // Trigger refresh of races
        logger.info('Race deleted successfully', { raceId })
      } else {
        logger.error('Failed to delete race:', response.statusText)
      }
    } catch (error) {
      logger.error('Error deleting race:', error)
    }
  }

  const getDistanceTypeColor = (type: string) => {
    switch (type) {
      case '50K':
        return 'primary'
      case '50M':
        return 'secondary'
      case '100K':
        return 'success'
      case '100M':
        return 'warning'
      case 'Marathon':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getTerrainIcon = (terrain: string) => {
    switch (terrain) {
      case 'trail':
        return <MountainSnowIcon className="w-4 h-4" />
      case 'road':
        return <RouteIcon className="w-4 h-4" />
      case 'mixed':
        return <MapPinIcon className="w-4 h-4" />
      default:
        return <MountainSnowIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <Card className="mb-8 bg-primary/5 border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <FlagIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">🏔️ Race Expeditions</h1>
                  <p className="text-foreground-600 text-lg mt-1">
                    Manage target races and summit challenges for your athletes
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onPress={onImportOpen}
                  color="secondary"
                  size="lg"
                  variant="flat"
                  startContent={<UploadIcon className="w-5 h-5" />}
                  aria-label="Import races from GPX or CSV files"
                  data-testid="import-races-modal-trigger"
                >
                  Import Races
                </Button>
                <Button
                  onPress={() => handleOpenModal()}
                  color="primary"
                  size="lg"
                  startContent={<PlusIcon className="w-5 h-5" />}
                  aria-label="Add a new race manually"
                >
                  Add New Race
                </Button>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Input
                placeholder="Search races by name or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                startContent={<SearchIcon className="w-4 h-4 text-foreground-400" />}
                className="flex-1"
                variant="bordered"
              />
              <div className="flex gap-3">
                <Select
                  placeholder="Distance"
                  selectedKeys={[distanceFilter]}
                  onSelectionChange={keys => setDistanceFilter(Array.from(keys).join(''))}
                  className="w-32"
                  variant="bordered"
                  aria-label="Filter races by distance"
                  startContent={<FilterIcon className="w-4 h-4 text-foreground-400" />}
                  items={[{ key: 'all', label: 'All Distances' }, ...DISTANCE_TYPES]}
                >
                  {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
                <Select
                  placeholder="Terrain"
                  selectedKeys={[terrainFilter]}
                  onSelectionChange={keys => setTerrainFilter(Array.from(keys).join(''))}
                  className="w-32"
                  variant="bordered"
                  aria-label="Filter races by terrain type"
                  startContent={<MountainSnowIcon className="w-4 h-4 text-foreground-400" />}
                  items={[{ key: 'all', label: 'All Terrain' }, ...TERRAIN_TYPES]}
                >
                  {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Race Management Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex items-center gap-2">
              <FlagIcon className="w-5 h-5 text-primary" />
              <span>{selectedRace ? 'Edit Race Expedition' : 'Add New Race Expedition'}</span>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Race Name"
                    placeholder="Enter race name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    variant="bordered"
                    startContent={<MountainSnowIcon className="w-4 h-4 text-foreground-400" />}
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    variant="bordered"
                    startContent={<CalendarIcon className="w-4 h-4 text-foreground-400" />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Distance Type"
                    selectedKeys={[formData.distance_type]}
                    onSelectionChange={keys => {
                      const selected = Array.from(keys).join('')
                      setFormData(prev => ({ ...prev, distance_type: selected }))
                    }}
                    variant="bordered"
                    startContent={<RouteIcon className="w-4 h-4 text-foreground-400" />}
                    items={DISTANCE_TYPES}
                  >
                    {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
                  </Select>
                  <Input
                    label="Distance (Miles)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter distance"
                    value={formData.distance_miles}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, distance_miles: e.target.value }))
                    }
                    required
                    variant="bordered"
                    startContent={<TrendingUpIcon className="w-4 h-4 text-foreground-400" />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Location"
                    placeholder="Enter race location"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    required
                    variant="bordered"
                    startContent={<MapPinIcon className="w-4 h-4 text-foreground-400" />}
                  />
                  <Input
                    label="Elevation Gain (feet)"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter elevation gain"
                    value={formData.elevation_gain_feet}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, elevation_gain_feet: e.target.value }))
                    }
                    variant="bordered"
                    startContent={<MountainSnowIcon className="w-4 h-4 text-foreground-400" />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Terrain Type"
                    selectedKeys={[formData.terrain_type]}
                    onSelectionChange={keys => {
                      const selected = Array.from(keys).join('')
                      setFormData(prev => ({ ...prev, terrain_type: selected }))
                    }}
                    variant="bordered"
                    startContent={getTerrainIcon(formData.terrain_type)}
                    items={TERRAIN_TYPES}
                  >
                    {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
                  </Select>
                  <Input
                    label="Website URL"
                    placeholder="Enter race website"
                    value={formData.website_url}
                    onChange={e => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    variant="bordered"
                    startContent={<GlobeIcon className="w-4 h-4 text-foreground-400" />}
                  />
                </div>

                <Textarea
                  label="Notes"
                  placeholder="Enter race notes and details"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  variant="bordered"
                  rows={3}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                isLoading={isSubmitting}
                startContent={!isSubmitting ? <FlagIcon className="w-4 h-4" /> : null}
              >
                {isSubmitting ? 'Saving...' : selectedRace ? 'Update Race' : 'Add Race'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Results Summary */}
      {localRaces.length > 0 && (
        <div className="mb-6 text-center">
          <p className="text-foreground-600">
            Showing {filteredRaces.length} of {localRaces.length} race expeditions
            {(searchQuery || distanceFilter !== 'all' || terrainFilter !== 'all') && (
              <Button
                variant="light"
                size="sm"
                onPress={() => {
                  setSearchQuery('')
                  setDistanceFilter('all')
                  setTerrainFilter('all')
                }}
                className="ml-2 text-primary"
                aria-label="Clear all search filters"
              >
                Clear filters
              </Button>
            )}
          </p>
        </div>
      )}

      {/* Races Grid */}
      {localRaces.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-6">
              <div className="bg-primary/10 rounded-full p-6">
                <FlagIcon className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No race expeditions yet</h3>
            <p className="text-foreground-600 mb-6">
              Create your first race to start planning summit challenges
            </p>
            <Button
              onPress={() => handleOpenModal()}
              color="primary"
              size="lg"
              startContent={<PlusIcon className="w-5 h-5" />}
              aria-label="Add your first race to get started"
            >
              Add Your First Race
            </Button>
          </CardBody>
        </Card>
      ) : filteredRaces.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center py-12">
            <div className="flex justify-center mb-6">
              <div className="bg-warning/10 rounded-full p-6">
                <SearchIcon className="h-12 w-12 text-warning" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No races match your search
            </h3>
            <p className="text-foreground-600 mb-6">
              Try adjusting your search terms or filters to find more races
            </p>
            <Button
              variant="flat"
              color="warning"
              onPress={() => {
                setSearchQuery('')
                setDistanceFilter('all')
                setTerrainFilter('all')
              }}
              startContent={<FilterIcon className="w-4 h-4" />}
            >
              Clear All Filters
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaces.map((race: Race) => (
            <Card
              key={race.id}
              className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-primary/60"
            >
              <CardBody className="p-6">
                {/* Race Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{race.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Chip
                        size="sm"
                        color={getDistanceTypeColor(race.distance_type)}
                        variant="flat"
                        startContent={<TrendingUpIcon className="w-3 h-3" />}
                      >
                        {race.distance_type}
                      </Chip>
                      <Chip
                        size="sm"
                        color="default"
                        variant="flat"
                        startContent={getTerrainIcon(race.terrain_type)}
                      >
                        {race.terrain_type}
                      </Chip>
                      <Chip
                        size="sm"
                        color="secondary"
                        variant="flat"
                        startContent={<UsersIcon className="w-3 h-3" />}
                      >
                        {trainingPlanCounts[race.id] || 0} athletes
                      </Chip>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => handleOpenModal(race)}
                      aria-label={`Edit ${race.name} race details`}
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => handleDelete(race.id)}
                      className="text-danger"
                      aria-label={`Delete ${race.name} race`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Race Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-foreground-600" />
                    <span className="text-sm text-foreground-600">
                      {new Date(race.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-foreground-600" />
                    <span className="text-sm text-foreground-600">{race.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-foreground-600" />
                    <span className="text-sm text-foreground-600">{race.distance_miles} miles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MountainSnowIcon className="w-4 h-4 text-foreground-600" />
                    <span className="text-sm text-foreground-600">
                      {race.elevation_gain_feet.toLocaleString()} ft gain
                    </span>
                  </div>
                </div>

                {/* Race Notes */}
                {race.notes && (
                  <>
                    <Divider className="my-4" />
                    <p className="text-sm text-foreground-600 italic">{race.notes}</p>
                  </>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  {race.website_url && (
                    <Button
                      as="a"
                      href={race.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="bordered"
                      size="sm"
                      startContent={<GlobeIcon className="w-4 h-4" />}
                      className="w-full"
                    >
                      Race Website
                    </Button>
                  )}

                  <Button
                    variant="flat"
                    size="sm"
                    color="secondary"
                    startContent={<UsersIcon className="w-4 h-4" />}
                    onPress={() => handleViewTrainingPlans(race)}
                    className="w-full"
                  >
                    View Training Plans ({trainingPlanCounts[race.id] || 0})
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Training Plans Modal */}
      <RaceTrainingPlansModal
        isOpen={isTrainingPlansOpen}
        onClose={onTrainingPlansClose}
        race={selectedRaceForPlans}
      />

      {/* Race Import Modal */}
      <RaceImportModal
        isOpen={isImportOpen}
        onClose={onImportClose}
        onSuccess={() => {
          // Refresh races after successful import - counts will be fetched via useEffect
          refresh()
        }}
      />
    </div>
  )
}

export default function RacesPageClient() {
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<RacesPageSkeleton />}>
          <RacesContent />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  )
}
