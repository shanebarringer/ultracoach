'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Progress,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from '@heroui/react'
import { useAtom } from 'jotai'
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Target,
  Zap,
} from 'lucide-react'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { stravaActivitiesRefreshableAtom, stravaStateAtom, workoutsAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { StravaActivity } from '@/types/strava'
import {
  type WorkoutMatch,
  batchMatchActivities,
  generateMatchingSummary,
} from '@/utils/workout-matching'

const logger = createLogger('StravaActivityBrowser')

interface StravaActivityBrowserProps {
  isOpen: boolean
  onClose: () => void
  onActivitySelected?: (activity: StravaActivity) => void
  onBulkSync?: (activities: StravaActivity[], matches: WorkoutMatch[]) => void
}

interface ActivityFilters {
  search: string
  type: string
  dateRange: string
  syncStatus: string
  hasMatches: boolean | null
}

interface BulkOperationState {
  isProcessing: boolean
  operation: 'match' | 'sync' | null
  progress: number
  currentActivity?: string
  results: {
    matched: number
    synced: number
    errors: string[]
  }
}

/**
 * Comprehensive Strava Activity Browser with intelligent matching and bulk operations
 *
 * Features:
 * - Paginated activity browsing with advanced filtering and search
 * - Real-time workout matching with confidence indicators
 * - Bulk selection and batch operations (match, sync, download)
 * - Activity type filtering and date range selection
 * - Conflict detection and resolution workflow
 * - Progress tracking for bulk operations
 * - Mountain Peak design integration with comprehensive UX
 */
const StravaActivityBrowser = memo(
  ({ isOpen, onClose, onActivitySelected, onBulkSync }: StravaActivityBrowserProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [stravaState] = useAtom(stravaStateAtom)
    const [activities, refreshActivities] = useAtom(stravaActivitiesRefreshableAtom)
    const [workouts] = useAtom(workoutsAtom)

    // State management
    const [filters, setFilters] = useState<ActivityFilters>({
      search: '',
      type: 'all',
      dateRange: 'last_30_days',
      syncStatus: 'all',
      hasMatches: null,
    })

    const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [sortBy] = useState<'date' | 'name' | 'distance'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [bulkOperation, setBulkOperation] = useState<BulkOperationState>({
      isProcessing: false,
      operation: null,
      progress: 0,
      results: { matched: 0, synced: 0, errors: [] },
    })

    const activitiesPerPage = 20

    // Calculate workout matches for activities
    const activityMatches = useMemo(() => {
      if (!activities || activities.length === 0 || workouts.length === 0) {
        return new Map()
      }

      logger.debug('Calculating workout matches for activities', {
        activitiesCount: activities.length,
        workoutsCount: workouts.length,
      })

      return batchMatchActivities(activities, workouts)
    }, [activities, workouts])

    // Generate matching summary
    const matchingSummary = useMemo(() => {
      if (!activities || activities.length === 0 || workouts.length === 0) {
        return null
      }

      return generateMatchingSummary(activities, workouts, activityMatches)
    }, [activities, workouts, activityMatches])

    // Filter and sort activities
    const filteredActivities = useMemo(() => {
      let filtered = activities || []

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (activity: StravaActivity) =>
            activity.name.toLowerCase().includes(searchLower) ||
            activity.type.toLowerCase().includes(searchLower)
        )
      }

      // Type filter
      if (filters.type !== 'all') {
        filtered = filtered.filter(
          (activity: StravaActivity) => activity.type.toLowerCase() === filters.type
        )
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date()
        let cutoffDate: Date

        switch (filters.dateRange) {
          case 'last_7_days':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'last_30_days':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case 'last_90_days':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            cutoffDate = new Date(0)
        }

        filtered = filtered.filter(
          (activity: StravaActivity) => new Date(activity.start_date) >= cutoffDate
        )
      }

      // Sync status filter
      if (filters.syncStatus !== 'all') {
        filtered = filtered.filter((activity: StravaActivity) => {
          const matches = activityMatches.get(activity.id)
          const hasHighConfidenceMatch =
            matches && matches.some((m: WorkoutMatch) => m.confidence > 0.6)

          switch (filters.syncStatus) {
            case 'synced':
              return hasHighConfidenceMatch
            case 'unsynced':
              return !hasHighConfidenceMatch
            case 'conflicts':
              return matches && matches.some((m: WorkoutMatch) => m.matchType === 'conflict')
            default:
              return true
          }
        })
      }

      // Has matches filter
      if (filters.hasMatches !== null) {
        filtered = filtered.filter((activity: StravaActivity) => {
          const hasMatches = activityMatches.has(activity.id)
          return filters.hasMatches ? hasMatches : !hasMatches
        })
      }

      // Sort activities
      filtered.sort((a: StravaActivity, b: StravaActivity) => {
        let compareValue = 0

        switch (sortBy) {
          case 'date':
            compareValue = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
            break
          case 'name':
            compareValue = a.name.localeCompare(b.name)
            break
          case 'distance':
            compareValue = (a.distance || 0) - (b.distance || 0)
            break
        }

        return sortOrder === 'desc' ? -compareValue : compareValue
      })

      return filtered
    }, [activities, filters, activityMatches, sortBy, sortOrder])

    // Paginated activities
    const paginatedActivities = useMemo(() => {
      const startIndex = (currentPage - 1) * activitiesPerPage
      return filteredActivities.slice(startIndex, startIndex + activitiesPerPage)
    }, [filteredActivities, currentPage])

    const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage)

    // Load activities on modal open
    useEffect(() => {
      if (isOpen && (!activities || activities.length === 0)) {
        logger.info('Loading Strava activities for browser')
        refreshActivities()
      }
    }, [isOpen, activities, refreshActivities])

    // Reset pagination when filters change
    useEffect(() => {
      setCurrentPage(1)
    }, [filters])

    // Handle bulk selection
    const handleSelectAll = useCallback(() => {
      if (selectedActivities.size === paginatedActivities.length) {
        // Deselect all on current page
        const newSelected = new Set(selectedActivities)
        paginatedActivities.forEach((activity: StravaActivity) => newSelected.delete(activity.id))
        setSelectedActivities(newSelected)
      } else {
        // Select all on current page
        const newSelected = new Set(selectedActivities)
        paginatedActivities.forEach((activity: StravaActivity) => newSelected.add(activity.id))
        setSelectedActivities(newSelected)
      }
    }, [selectedActivities, paginatedActivities])

    const handleActivitySelect = useCallback(
      (activityId: number, selected: boolean) => {
        const newSelected = new Set(selectedActivities)
        if (selected) {
          newSelected.add(activityId)
        } else {
          newSelected.delete(activityId)
        }
        setSelectedActivities(newSelected)
      },
      [selectedActivities]
    )

    // Handle bulk operations
    const handleBulkMatch = useCallback(async () => {
      const selectedActivityList =
        activities?.filter((a: StravaActivity) => selectedActivities.has(a.id)) || []
      if (selectedActivityList.length === 0) return

      setBulkOperation({
        isProcessing: true,
        operation: 'match',
        progress: 0,
        results: { matched: 0, synced: 0, errors: [] },
      })

      try {
        logger.info(`Starting bulk match for ${selectedActivityList.length} activities`)

        // Simulate progress for matching (it's fast but we want to show progress)
        for (let i = 0; i <= selectedActivityList.length; i++) {
          setBulkOperation(prev => ({
            ...prev,
            progress: (i / selectedActivityList.length) * 100,
            currentActivity:
              i < selectedActivityList.length ? selectedActivityList[i].name : undefined,
          }))

          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const matches = batchMatchActivities(selectedActivityList, workouts)
        const matchedCount = Array.from(matches.values())
          .flat()
          .filter(m => m.confidence > 0.5).length

        setBulkOperation(prev => ({
          ...prev,
          isProcessing: false,
          results: { ...prev.results, matched: matchedCount },
        }))

        logger.info(`Bulk match completed: ${matchedCount} matches found`)
      } catch (error) {
        logger.error('Bulk match failed:', error)
        setBulkOperation(prev => ({
          ...prev,
          isProcessing: false,
          results: { ...prev.results, errors: [...prev.results.errors, 'Matching failed'] },
        }))
      }
    }, [activities, selectedActivities, workouts])

    const handleBulkSync = useCallback(async () => {
      const selectedActivityList =
        activities?.filter((a: StravaActivity) => selectedActivities.has(a.id)) || []
      if (selectedActivityList.length === 0 || !onBulkSync) return

      setBulkOperation({
        isProcessing: true,
        operation: 'sync',
        progress: 0,
        results: { matched: 0, synced: 0, errors: [] },
      })

      try {
        // Get matches for selected activities
        const selectedMatches: WorkoutMatch[] = []
        selectedActivityList.forEach((activity: StravaActivity) => {
          const matches = activityMatches.get(activity.id)
          if (matches && matches.length > 0) {
            selectedMatches.push(matches[0]) // Take best match
          }
        })

        logger.info(`Starting bulk sync for ${selectedMatches.length} matched activities`)

        // Call parent's bulk sync handler
        await onBulkSync(selectedActivityList, selectedMatches)

        setBulkOperation(prev => ({
          ...prev,
          isProcessing: false,
          results: { ...prev.results, synced: selectedMatches.length },
        }))
      } catch (error) {
        logger.error('Bulk sync failed:', error)
        setBulkOperation(prev => ({
          ...prev,
          isProcessing: false,
          results: { ...prev.results, errors: [...prev.results.errors, 'Sync failed'] },
        }))
      }
    }, [activities, selectedActivities, activityMatches, onBulkSync])

    // Get match info for activity
    const getActivityMatchInfo = useCallback(
      (activity: StravaActivity) => {
        const matches = activityMatches.get(activity.id)
        if (!matches || matches.length === 0) {
          return { hasMatch: false, confidence: 0, matchType: null, bestMatch: null }
        }

        const bestMatch = matches[0] // Sorted by confidence
        return {
          hasMatch: true,
          confidence: bestMatch.confidence,
          matchType: bestMatch.matchType,
          bestMatch,
        }
      },
      [activityMatches]
    )

    // Format activity data for display
    const formatDistance = useCallback((meters: number) => {
      const miles = meters / 1609.34
      return `${miles.toFixed(1)} mi`
    }, [])

    const formatDuration = useCallback((seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`
      }
      return `${minutes} min`
    }, [])

    const formatPace = useCallback((distance: number, time: number) => {
      const miles = distance / 1609.34
      const paceSeconds = time / miles
      const paceMinutes = Math.floor(paceSeconds / 60)
      const remainingSeconds = Math.floor(paceSeconds % 60)
      return `${paceMinutes}:${remainingSeconds.toString().padStart(2, '0')}/mi`
    }, [])

    if (!isOpen) return null

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        scrollBehavior="inside"
        isDismissable={!bulkOperation.isProcessing}
        hideCloseButton={bulkOperation.isProcessing}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-3 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-divider">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 shadow-lg">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  Strava Activity Browser
                  <Chip size="sm" variant="flat" color="primary" className="font-medium">
                    Alpine
                  </Chip>
                </h2>
                <p className="text-sm text-foreground-600 mt-1">
                  🏔️ Browse, match, and sync your Strava activities with planned workouts
                </p>
              </div>
            </div>

            {/* Enhanced Alpine Summary Stats */}
            {matchingSummary && (
              <Card className="border-t-4 border-t-primary/60 bg-gradient-to-br from-background to-default/30 shadow-lg hover:shadow-xl transition-shadow">
                <CardBody className="py-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="text-center group hover:scale-105 transition-transform">
                      <div className="text-2xl font-bold text-foreground mb-1">
                        {matchingSummary.total.activities}
                      </div>
                      <div className="text-xs text-foreground-600 uppercase tracking-wider font-medium">
                        Activities
                      </div>
                    </div>
                    <div className="text-center group hover:scale-105 transition-transform">
                      <div className="text-2xl font-bold text-success mb-1 flex items-center justify-center gap-1">
                        {matchingSummary.by_confidence.exact}
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-foreground-600 uppercase tracking-wider font-medium">
                        Perfect Match
                      </div>
                    </div>
                    <div className="text-center group hover:scale-105 transition-transform">
                      <div className="text-2xl font-bold text-primary mb-1 flex items-center justify-center gap-1">
                        {matchingSummary.by_confidence.probable}
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-foreground-600 uppercase tracking-wider font-medium">
                        Good Match
                      </div>
                    </div>
                    <div className="text-center group hover:scale-105 transition-transform">
                      <div className="text-2xl font-bold text-warning mb-1 flex items-center justify-center gap-1">
                        {matchingSummary.by_confidence.possible}
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-foreground-600 uppercase tracking-wider font-medium">
                        Possible
                      </div>
                    </div>
                    <div className="text-center group hover:scale-105 transition-transform">
                      <div className="text-2xl font-bold text-danger mb-1 flex items-center justify-center gap-1">
                        {matchingSummary.by_confidence.conflicts}
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-foreground-600 uppercase tracking-wider font-medium">
                        Conflicts
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </ModalHeader>

          <ModalBody className="space-y-6">
            {/* Enhanced Alpine Filters and Controls */}
            <Card className="border-l-4 border-l-secondary/60 bg-gradient-to-r from-secondary/5 to-transparent shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 bg-gradient-to-r from-secondary/10 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <div className="p-2 rounded-lg bg-secondary/20">
                    <Filter className="h-5 w-5 text-secondary" />
                  </div>
                  Filters & Search
                  <Chip size="sm" variant="flat" color="secondary" className="ml-auto">
                    Alpine Control
                  </Chip>
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    placeholder="Search activities..."
                    value={filters.search}
                    onValueChange={value => setFilters(prev => ({ ...prev, search: value }))}
                    startContent={<Search className="h-4 w-4 text-default-500" />}
                    isClearable
                  />

                  <Select
                    label="Activity Type"
                    selectedKeys={[filters.type]}
                    onSelectionChange={keys => {
                      const type = Array.from(keys)[0] as string
                      setFilters(prev => ({ ...prev, type }))
                    }}
                  >
                    <SelectItem key="all">All Types</SelectItem>
                    <SelectItem key="run">Run</SelectItem>
                    <SelectItem key="ride">Ride</SelectItem>
                    <SelectItem key="swim">Swim</SelectItem>
                    <SelectItem key="hike">Hike</SelectItem>
                  </Select>

                  <Select
                    label="Date Range"
                    selectedKeys={[filters.dateRange]}
                    onSelectionChange={keys => {
                      const dateRange = Array.from(keys)[0] as string
                      setFilters(prev => ({ ...prev, dateRange }))
                    }}
                  >
                    <SelectItem key="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem key="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem key="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem key="all">All Time</SelectItem>
                  </Select>

                  <Select
                    label="Sync Status"
                    selectedKeys={[filters.syncStatus]}
                    onSelectionChange={keys => {
                      const syncStatus = Array.from(keys)[0] as string
                      setFilters(prev => ({ ...prev, syncStatus }))
                    }}
                  >
                    <SelectItem key="all">All Activities</SelectItem>
                    <SelectItem key="synced">Has Matches</SelectItem>
                    <SelectItem key="unsynced">Unmatched</SelectItem>
                    <SelectItem key="conflicts">Has Conflicts</SelectItem>
                  </Select>
                </div>

                <Divider />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      isSelected={
                        selectedActivities.size === paginatedActivities.length &&
                        paginatedActivities.length > 0
                      }
                      isIndeterminate={
                        selectedActivities.size > 0 &&
                        selectedActivities.size < paginatedActivities.length
                      }
                      onValueChange={handleSelectAll}
                    >
                      Select All ({selectedActivities.size} selected)
                    </Checkbox>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        startContent={<ArrowUpDown className="h-4 w-4" />}
                        onPress={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      >
                        {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      color="primary"
                      variant="bordered"
                      isDisabled={selectedActivities.size === 0 || bulkOperation.isProcessing}
                      onPress={handleBulkMatch}
                      startContent={<Target className="h-4 w-4" />}
                    >
                      Match Selected ({selectedActivities.size})
                    </Button>

                    <Button
                      size="sm"
                      color="primary"
                      isDisabled={selectedActivities.size === 0 || bulkOperation.isProcessing}
                      onPress={handleBulkSync}
                      startContent={<RefreshCw className="h-4 w-4" />}
                    >
                      Sync Selected ({selectedActivities.size})
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Bulk Operation Progress */}
            {bulkOperation.isProcessing && (
              <Card className="border-primary/20 bg-primary/5">
                <CardBody className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className="font-medium">
                          {bulkOperation.operation === 'match'
                            ? 'Matching Activities...'
                            : 'Syncing Activities...'}
                        </span>
                      </div>
                      <span className="text-sm text-foreground-600">
                        {Math.round(bulkOperation.progress)}%
                      </span>
                    </div>

                    <Progress
                      value={bulkOperation.progress}
                      color="primary"
                      size="sm"
                      className="w-full"
                    />

                    {bulkOperation.currentActivity && (
                      <p className="text-sm text-foreground-600">
                        Processing: {bulkOperation.currentActivity}
                      </p>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Activities Table */}
            {filteredActivities.length === 0 ? (
              <Card>
                <CardBody className="py-8 text-center">
                  <div className="space-y-3">
                    <Activity className="h-12 w-12 text-default-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">No Activities Found</h3>
                      <p className="text-sm text-foreground-600">
                        Try adjusting your filters or refresh your Strava activities
                      </p>
                    </div>
                    <Button
                      color="primary"
                      variant="bordered"
                      onPress={() => refreshActivities()}
                      startContent={<Download className="h-4 w-4" />}
                    >
                      Refresh Activities
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card className="border-default/20">
                <Table
                  aria-label="Strava activities table"
                  selectionMode="none"
                  className="min-h-[400px]"
                >
                  <TableHeader>
                    <TableColumn width={50}>SELECT</TableColumn>
                    <TableColumn>ACTIVITY</TableColumn>
                    <TableColumn>DATE</TableColumn>
                    <TableColumn>DISTANCE</TableColumn>
                    <TableColumn>TIME</TableColumn>
                    <TableColumn>PACE</TableColumn>
                    <TableColumn>MATCH</TableColumn>
                    <TableColumn>ACTIONS</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivities.map((activity: StravaActivity) => {
                      const matchInfo = getActivityMatchInfo(activity)

                      return (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <Checkbox
                              isSelected={selectedActivities.has(activity.id)}
                              onValueChange={selected =>
                                handleActivitySelect(activity.id, selected)
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">{activity.name}</div>
                              <div className="flex items-center gap-2">
                                <Chip size="sm" variant="flat" color="default">
                                  {activity.type}
                                </Chip>
                                {activity.trainer && (
                                  <Chip size="sm" variant="flat" color="warning">
                                    Indoor
                                  </Chip>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-default-500" />
                              <span className="text-sm">
                                {new Date(activity.start_date).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-default-500" />
                              <span className="text-sm">{formatDistance(activity.distance)}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-default-500" />
                              <span className="text-sm">
                                {formatDuration(activity.moving_time)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm">
                              {formatPace(activity.distance, activity.moving_time)}
                            </span>
                          </TableCell>

                          <TableCell>
                            {matchInfo.hasMatch ? (
                              <Tooltip
                                content={`${(matchInfo.confidence * 100).toFixed(0)}% confidence`}
                              >
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={
                                    matchInfo.confidence > 0.8
                                      ? 'success'
                                      : matchInfo.confidence > 0.6
                                        ? 'primary'
                                        : matchInfo.confidence > 0.3
                                          ? 'warning'
                                          : 'danger'
                                  }
                                  startContent={
                                    matchInfo.matchType === 'exact' ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : matchInfo.matchType === 'conflict' ? (
                                      <AlertTriangle className="h-3 w-3" />
                                    ) : (
                                      <Zap className="h-3 w-3" />
                                    )
                                  }
                                >
                                  {matchInfo.matchType}
                                </Chip>
                              </Tooltip>
                            ) : (
                              <Chip size="sm" variant="flat" color="default">
                                No Match
                              </Chip>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex gap-1">
                              {onActivitySelected && (
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="primary"
                                  onPress={() => onActivitySelected(activity)}
                                >
                                  Select
                                </Button>
                              )}
                              {matchInfo.hasMatch && (
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="success"
                                  startContent={<RefreshCw className="h-3 w-3" />}
                                >
                                  Sync
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  showShadow
                />
              </div>
            )}
          </ModalBody>

          <ModalFooter className="gap-3">
            <Button variant="light" onPress={onClose} isDisabled={bulkOperation.isProcessing}>
              Close
            </Button>

            <Button
              color="primary"
              variant="bordered"
              onPress={() => refreshActivities()}
              startContent={<Download className="h-4 w-4" />}
              isDisabled={bulkOperation.isProcessing}
            >
              Refresh Activities
            </Button>

            {selectedActivities.size > 0 && (
              <Button
                color="primary"
                onPress={handleBulkSync}
                startContent={<RefreshCw className="h-4 w-4" />}
                isDisabled={bulkOperation.isProcessing}
              >
                Sync Selected ({selectedActivities.size})
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
)

StravaActivityBrowser.displayName = 'StravaActivityBrowser'

export default StravaActivityBrowser
