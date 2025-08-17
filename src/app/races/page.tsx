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
  Spinner,
  Textarea,
  useDisclosure,
} from '@heroui/react'
import { useAtom } from 'jotai'
import {
  CalendarIcon,
  EditIcon,
  FlagIcon,
  GlobeIcon,
  MapPinIcon,
  MountainSnowIcon,
  PlusIcon,
  RouteIcon,
  TrashIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import { useSession } from '@/hooks/useBetterSession'
import { racesAtom, selectedRaceAtom } from '@/lib/atoms'
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
  { key: 'trail', label: 'Trail' },
  { key: 'road', label: 'Road' },
  { key: 'mixed', label: 'Mixed' },
]

export default function RacesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [races, refreshRaces] = useAtom(racesAtom)
  const [selectedRace, setSelectedRace] = useAtom(selectedRaceAtom)
  const logger = useMemo(() => createLogger('RacesPage'), [])

  // Derive loading state from atom data
  const loading = useMemo(() => races.length === 0, [races.length])
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
  const { isOpen, onOpen, onClose } = useDisclosure()

  const fetchRaces = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      logger.debug('Triggering races refresh')
      await refreshRaces()
    } catch (error) {
      logger.error('Error refreshing races:', error)
    }
  }, [session?.user?.id, refreshRaces, logger])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'coach') {
      router.push('/dashboard')
      return
    }

    // Fetch races data using atom
    fetchRaces()
  }, [status, session, router, fetchRaces])

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
        body: JSON.stringify({
          ...formData,
          distance_miles: parseFloat(formData.distance_miles),
          elevation_gain_feet: parseInt(formData.elevation_gain_feet) || 0,
        }),
      })

      if (response.ok) {
        await fetchRaces()
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
      })

      if (response.ok) {
        await fetchRaces()
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

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" label="Loading race expeditions..." />
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'coach') {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <FlagIcon className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    🏔️ Race Expeditions
                  </h1>
                  <p className="text-foreground-600 text-lg mt-1">
                    Manage target races and summit challenges for your athletes
                  </p>
                </div>
              </div>
              <Button
                onPress={() => handleOpenModal()}
                color="primary"
                size="lg"
                startContent={<PlusIcon className="w-5 h-5" />}
              >
                Add New Race
              </Button>
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
                    >
                      {DISTANCE_TYPES.map(type => (
                        <SelectItem key={type.key}>{type.label}</SelectItem>
                      ))}
                    </Select>
                    <Input
                      label="Distance (Miles)"
                      type="number"
                      step="0.01"
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
                    >
                      {TERRAIN_TYPES.map(type => (
                        <SelectItem key={type.key}>{type.label}</SelectItem>
                      ))}
                    </Select>
                    <Input
                      label="Website URL"
                      placeholder="Enter race website"
                      value={formData.website_url}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, website_url: e.target.value }))
                      }
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

        {/* Races Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="primary" label="Loading race expeditions..." />
          </div>
        ) : races.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardBody className="text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="bg-primary/10 rounded-full p-6">
                  <FlagIcon className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No race expeditions yet
              </h3>
              <p className="text-foreground-600 mb-6">
                Create your first race to start planning summit challenges
              </p>
              <Button
                onPress={() => handleOpenModal()}
                color="primary"
                size="lg"
                startContent={<PlusIcon className="w-5 h-5" />}
              >
                Add Your First Race
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {races.map((race: Race) => (
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
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleOpenModal(race)}
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleDelete(race.id)}
                        className="text-danger"
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
                      <span className="text-sm text-foreground-600">
                        {race.distance_miles} miles
                      </span>
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

                  {/* Race Website */}
                  {race.website_url && (
                    <div className="mt-4">
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
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
