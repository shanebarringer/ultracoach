'use client'

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Tab,
  Tabs,
} from '@heroui/react'
import { useAtom } from 'jotai'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Target,
  TrendingUp,
} from 'lucide-react'

import { memo, useCallback, useMemo } from 'react'

import { selectedMatchAtom, showWorkoutDiffModalAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { WorkoutDiscrepancy, WorkoutMatch } from '@/utils/workout-matching'

const logger = createLogger('WorkoutDiffModal')

interface WorkoutDiffModalProps {
  isOpen?: boolean
  onClose?: () => void
  onApproveMatch?: (match: WorkoutMatch) => void
}

/**
 * Advanced workout comparison modal for reviewing Strava activity matches
 *
 * Features:
 * - Side-by-side comparison of planned vs actual workouts
 * - Detailed discrepancy analysis with severity indicators
 * - Selective field updates and merge options
 * - Visual confidence scoring and match recommendations
 * - Integration with Strava for external activity viewing
 */
const WorkoutDiffModal = memo(({ isOpen, onClose, onApproveMatch }: WorkoutDiffModalProps) => {
  const [selectedMatch, setSelectedMatch] = useAtom(selectedMatchAtom)
  const [showModal, setShowModal] = useAtom(showWorkoutDiffModalAtom)

  // Use props if provided, otherwise use atom state
  const modalOpen = isOpen !== undefined ? isOpen : showModal
  const handleCloseDefault = useCallback(() => {
    setShowModal(false)
    setSelectedMatch(null)
  }, [setShowModal, setSelectedMatch])

  const handleClose = onClose || handleCloseDefault

  // Compute comparison data
  const comparisonData = useMemo(() => {
    if (!selectedMatch) return null

    const { workout, activity, confidence, discrepancies, suggestions, matchType } = selectedMatch

    // Convert activity data to comparable format
    const actualDistance = Number((activity.distance / 1609.34).toFixed(2)) // meters to miles
    const actualDuration = Math.round(activity.moving_time / 60) // seconds to minutes
    const actualDate = new Date(activity.start_date).toISOString().split('T')[0]

    return {
      planned: {
        date: workout.date,
        type: workout.planned_type || 'Unknown',
        distance: workout.planned_distance || 0,
        duration: workout.planned_duration || 0,
        intensity: workout.intensity || 0,
        notes: workout.workout_notes || '',
      },
      actual: {
        date: actualDate,
        type: activity.type,
        distance: actualDistance,
        duration: actualDuration,
        elevation: Math.round(activity.total_elevation_gain || 0),
        pace: actualDistance > 0 ? (actualDuration / actualDistance).toFixed(1) : '0',
        location: activity.location_city || activity.location_state || '',
        name: activity.name,
      },
      meta: {
        confidence,
        discrepancies,
        suggestions,
        matchType,
        activityId: activity.id,
      },
    }
  }, [selectedMatch])

  // Categorize discrepancies by severity
  const categorizedDiscrepancies = useMemo(() => {
    if (!comparisonData) return { major: [], moderate: [], minor: [] }

    return comparisonData.meta.discrepancies.reduce(
      (acc: Record<string, WorkoutDiscrepancy[]>, discrepancy: WorkoutDiscrepancy) => {
        acc[discrepancy.severity].push(discrepancy)
        return acc
      },
      {
        major: [] as WorkoutDiscrepancy[],
        moderate: [] as WorkoutDiscrepancy[],
        minor: [] as WorkoutDiscrepancy[],
      }
    )
  }, [comparisonData])

  // Handle match approval
  const handleApproveMatch = useCallback(() => {
    if (selectedMatch && onApproveMatch) {
      logger.info('Approving workout match', {
        workoutId: selectedMatch.workout.id,
        activityId: selectedMatch.activity.id,
        confidence: selectedMatch.confidence,
      })
      onApproveMatch(selectedMatch)
    }
    handleClose()
  }, [selectedMatch, onApproveMatch, handleClose])

  // Handle viewing on Strava
  const handleViewOnStrava = useCallback(() => {
    if (comparisonData) {
      const url = `https://www.strava.com/activities/${comparisonData.meta.activityId}`
      logger.debug('Opening Strava activity', { url })
      window.open(url, '_blank')
    }
  }, [comparisonData])

  if (!selectedMatch || !comparisonData) {
    return null
  }

  const { planned, actual, meta } = comparisonData

  // Get confidence color and label
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'primary'
    if (confidence >= 0.4) return 'warning'
    return 'danger'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Excellent Match'
    if (confidence >= 0.6) return 'Good Match'
    if (confidence >= 0.4) return 'Possible Match'
    return 'Poor Match'
  }

  return (
    <Modal
      isOpen={modalOpen}
      onClose={handleClose}
      size="5xl"
      scrollBehavior="inside"
      className="max-h-[90vh]"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3 bg-primary/5 border-b border-divider">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/20 shadow-lg">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  Workout Comparison
                  <Chip size="sm" variant="flat" color="primary" className="font-medium">
                    Alpine Match
                  </Chip>
                </h2>
                <p className="text-sm text-foreground-600 mt-1">
                  🏔️ Side-by-side comparison of planned vs actual workout data
                </p>
              </div>
            </div>
            <Chip
              color={getConfidenceColor(meta.confidence)}
              variant="shadow"
              size="lg"
              className="font-bold text-white border-white/20"
            >
              {getConfidenceLabel(meta.confidence)} ({Math.round(meta.confidence * 100)}%)
            </Chip>
          </div>
          <Card className="border-l-4 border-l-secondary/60 bg-secondary/10">
            <CardBody className="py-3">
              <div className="flex items-center gap-3 text-foreground-700">
                <Activity className="h-5 w-5 text-secondary" />
                <span className="font-medium">{actual.name}</span>
                <ArrowRight className="h-4 w-4 text-foreground-500" />
                <span className="font-medium">{planned.type}</span>
                <Chip size="sm" variant="flat" color="secondary" className="ml-auto">
                  {meta.matchType}
                </Chip>
              </div>
            </CardBody>
          </Card>
        </ModalHeader>

        <ModalBody className="p-0">
          <Tabs aria-label="Workout comparison tabs" className="px-6 pt-4">
            <Tab
              key="comparison"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Side-by-Side
                </div>
              }
            >
              <div className="space-y-6 py-4">
                {/* Confidence Progress */}
                <Card>
                  <CardHeader className="pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Match Confidence
                    </h3>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <Progress
                      value={meta.confidence * 100}
                      color={getConfidenceColor(meta.confidence)}
                      size="lg"
                      className="mb-3"
                      showValueLabel
                    />
                    <p className="text-sm text-foreground-600">
                      Based on date, distance, duration, and activity type similarity
                    </p>
                  </CardBody>
                </Card>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Planned Workout */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="bg-primary/5">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-primary">Planned Workout</h3>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-foreground-600">Date</p>
                          <p className="font-medium">
                            {new Date(planned.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Type</p>
                          <Badge variant="flat" color="primary" size="sm">
                            {planned.type}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Distance</p>
                          <p className="font-medium">{planned.distance} miles</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Duration</p>
                          <p className="font-medium">{planned.duration} min</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Intensity</p>
                          <p className="font-medium">{planned.intensity}/10</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Status</p>
                          <Badge variant="flat" color="warning" size="sm">
                            Planned
                          </Badge>
                        </div>
                      </div>
                      {planned.notes && (
                        <div>
                          <p className="text-sm text-foreground-600 mb-2">Notes</p>
                          <p className="text-sm bg-content2 p-3 rounded-lg">{planned.notes}</p>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Actual Activity */}
                  <Card className="border-2 border-success/20">
                    <CardHeader className="bg-success/5">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-success" />
                        <h3 className="text-lg font-semibold text-success">Strava Activity</h3>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-foreground-600">Date</p>
                          <p className="font-medium">
                            {new Date(actual.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Type</p>
                          <Badge variant="flat" color="success" size="sm">
                            {actual.type}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Distance</p>
                          <p className="font-medium">{actual.distance} miles</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Duration</p>
                          <p className="font-medium">{actual.duration} min</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Elevation</p>
                          <p className="font-medium">{actual.elevation} ft</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground-600">Pace</p>
                          <p className="font-medium">{actual.pace} min/mi</p>
                        </div>
                      </div>
                      {actual.location && (
                        <div>
                          <p className="text-sm text-foreground-600 mb-1">Location</p>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <p className="text-sm">{actual.location}</p>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="bordered"
                        size="sm"
                        onPress={handleViewOnStrava}
                        startContent={<ExternalLink className="h-4 w-4" />}
                        className="w-full"
                      >
                        View on Strava
                      </Button>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </Tab>

            <Tab
              key="discrepancies"
              title={
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Issues ({meta.discrepancies.length})
                </div>
              }
            >
              <div className="space-y-4 py-4">
                {meta.discrepancies.length === 0 ? (
                  <Card>
                    <CardBody className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-success mb-2">Perfect Match!</h3>
                      <p className="text-foreground-600">
                        No discrepancies found between the planned workout and actual activity.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  <>
                    {/* Major Issues */}
                    {categorizedDiscrepancies.major.length > 0 && (
                      <Card className="border-danger/20">
                        <CardHeader className="bg-danger/5">
                          <h3 className="text-lg font-semibold text-danger flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Major Issues ({categorizedDiscrepancies.major.length})
                          </h3>
                        </CardHeader>
                        <CardBody className="space-y-3">
                          {categorizedDiscrepancies.major.map(
                            (discrepancy: WorkoutDiscrepancy, index: number) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-danger/5 rounded-lg"
                              >
                                <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-foreground capitalize">
                                    {discrepancy.field} Mismatch
                                  </p>
                                  <p className="text-sm text-foreground-600 mb-2">
                                    {discrepancy.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span>
                                      Planned: <strong>{discrepancy.planned}</strong>
                                    </span>
                                    <span>
                                      Actual: <strong>{discrepancy.actual}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </CardBody>
                      </Card>
                    )}

                    {/* Moderate Issues */}
                    {categorizedDiscrepancies.moderate.length > 0 && (
                      <Card className="border-warning/20">
                        <CardHeader className="bg-warning/5">
                          <h3 className="text-lg font-semibold text-warning flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Moderate Issues ({categorizedDiscrepancies.moderate.length})
                          </h3>
                        </CardHeader>
                        <CardBody className="space-y-3">
                          {categorizedDiscrepancies.moderate.map(
                            (discrepancy: WorkoutDiscrepancy, index: number) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg"
                              >
                                <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-foreground capitalize">
                                    {discrepancy.field} Difference
                                  </p>
                                  <p className="text-sm text-foreground-600 mb-2">
                                    {discrepancy.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span>
                                      Planned: <strong>{discrepancy.planned}</strong>
                                    </span>
                                    <span>
                                      Actual: <strong>{discrepancy.actual}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </CardBody>
                      </Card>
                    )}

                    {/* Minor Issues */}
                    {categorizedDiscrepancies.minor.length > 0 && (
                      <Card className="border-primary/20">
                        <CardHeader className="bg-primary/5">
                          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Minor Notes ({categorizedDiscrepancies.minor.length})
                          </h3>
                        </CardHeader>
                        <CardBody className="space-y-3">
                          {categorizedDiscrepancies.minor.map(
                            (discrepancy: WorkoutDiscrepancy, index: number) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg"
                              >
                                <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-foreground capitalize">
                                    {discrepancy.field} Variation
                                  </p>
                                  <p className="text-sm text-foreground-600 mb-2">
                                    {discrepancy.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span>
                                      Planned: <strong>{discrepancy.planned}</strong>
                                    </span>
                                    <span>
                                      Actual: <strong>{discrepancy.actual}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </CardBody>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </Tab>

            <Tab
              key="suggestions"
              title={
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Recommendations
                </div>
              }
            >
              <div className="space-y-4 py-4">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Recommended Actions
                    </h3>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    {meta.suggestions.map((suggestion: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-success/5 rounded-lg"
                      >
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <p className="text-foreground">{suggestion}</p>
                      </div>
                    ))}
                  </CardBody>
                </Card>

                {/* Match Actions */}
                {meta.confidence >= 0.6 && (
                  <Card className="border-success/20">
                    <CardBody className="text-center py-6">
                      <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-success mb-2">Ready to Sync</h4>
                      <p className="text-foreground-600 mb-4">
                        This is a high-confidence match. The activity data will update your planned
                        workout.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          color="success"
                          onPress={handleApproveMatch}
                          startContent={<CheckCircle2 className="h-4 w-4" />}
                        >
                          Approve & Sync
                        </Button>
                        <Button
                          variant="bordered"
                          onPress={handleViewOnStrava}
                          startContent={<ExternalLink className="h-4 w-4" />}
                        >
                          Review on Strava
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>

        <ModalFooter className="gap-3">
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          {meta.confidence >= 0.4 && (
            <Button
              color="primary"
              onPress={handleApproveMatch}
              startContent={<CheckCircle2 className="h-4 w-4" />}
            >
              {meta.confidence >= 0.8 ? 'Approve Match' : 'Force Sync'}
            </Button>
          )}
          <Button
            variant="bordered"
            onPress={handleViewOnStrava}
            startContent={<ExternalLink className="h-4 w-4" />}
          >
            View on Strava
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
})

WorkoutDiffModal.displayName = 'WorkoutDiffModal'

export default WorkoutDiffModal
