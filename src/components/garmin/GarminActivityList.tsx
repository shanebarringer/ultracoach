'use client'

import { Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from '@heroui/react'
import { Calendar, MapPin, Timer, TrendingUp, Watch } from 'lucide-react'

import { useEffect, useState } from 'react'

import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import type { GarminActivity } from '@/types/garmin'

const logger = createLogger('GarminActivityList')

interface GarminActivitiesData {
  activities: GarminActivity[]
  connection: {
    garmin_user_id: string
    connected_since: string
    device_models?: string[]
  }
}

interface ImportedActivity {
  [key: string]: {
    importing: boolean
    imported: boolean
    workout_id?: string
    error?: string
  }
}

export default function GarminActivityList() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<GarminActivitiesData | null>(null)
  const [importedActivities, setImportedActivities] = useState<ImportedActivity>({})
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/garmin/activities', {
        credentials: 'same-origin',
      })

      if (response.ok) {
        const activitiesData = await response.json()
        setData(activitiesData)
        logger.info('Fetched Garmin activities', {
          count: activitiesData.activities?.length || 0,
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load activities')
        logger.error('Failed to fetch Garmin activities:', errorData)
      }
    } catch (error) {
      logger.error('Error fetching Garmin activities:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const importActivity = async (activity: GarminActivity) => {
    const activityKey = activity.activityId.toString()

    setImportedActivities(prev => ({
      ...prev,
      [activityKey]: { ...prev[activityKey], importing: true, error: undefined },
    }))

    try {
      const response = await fetch('/api/garmin/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activity.activityId,
          // Auto-match will be used if workout_id is not provided
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setImportedActivities(prev => ({
          ...prev,
          [activityKey]: {
            importing: false,
            imported: true,
            workout_id: result.workout_id,
          },
        }))
        toast.success(
          'Activity imported!',
          `${activity.activityName} has been added to your workouts`
        )
        logger.info('Successfully imported activity', {
          activityId: activity.activityId,
          workoutId: result.workout_id,
        })
      } else {
        const errorData = await response.json()
        setImportedActivities(prev => ({
          ...prev,
          [activityKey]: {
            importing: false,
            imported: false,
            error: errorData.error,
          },
        }))
        toast.error('Import failed', errorData.error || 'Could not import activity')
        logger.error('Failed to import activity:', errorData)
      }
    } catch (error) {
      setImportedActivities(prev => ({
        ...prev,
        [activityKey]: {
          importing: false,
          imported: false,
          error: 'Network error',
        },
      }))
      toast.error('Network error', 'Please try again')
      logger.error('Error importing activity:', error)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardBody className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button color="primary" onPress={fetchActivities}>
            Try Again
          </Button>
        </CardBody>
      </Card>
    )
  }

  if (!data || !data.activities || data.activities.length === 0) {
    return (
      <Card className="w-full">
        <CardBody className="text-center">
          <Watch className="w-12 h-12 mx-auto mb-4 text-default-400" />
          <p className="text-default-500 mb-4">No recent activities found</p>
          <p className="text-small text-default-400">
            Activities from your Garmin device will appear here
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Activities</h3>
        <Chip size="sm" variant="flat">
          {data.activities.length} activities
        </Chip>
      </div>

      {data.activities.map(activity => {
        const activityKey = activity.activityId.toString()
        const importState = importedActivities[activityKey]
        const distanceMiles = activity.distance ? (activity.distance / 1609.34).toFixed(2) : '0.00'
        const durationSeconds = activity.duration || 0
        const movingTimeHours = Math.floor(durationSeconds / 3600)
        const movingTimeMinutes = Math.floor((durationSeconds % 3600) / 60)
        const movingTimeSecondsRem = durationSeconds % 60
        const avgPaceMinutes =
          activity.distance && activity.distance > 0
            ? Math.floor(durationSeconds / (activity.distance / 1609.34) / 60)
            : 0
        const avgPaceSeconds =
          activity.distance && activity.distance > 0
            ? Math.round((durationSeconds / (activity.distance / 1609.34)) % 60)
            : 0
        const elevationFeet = activity.elevationGain
          ? Math.round(activity.elevationGain * 3.28084)
          : 0

        return (
          <Card key={activity.activityId} className="w-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start w-full">
                <div className="flex-1">
                  <h4 className="text-medium font-semibold">{activity.activityName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip size="sm" color="primary" variant="flat">
                      {activity.activityType || 'Running'}
                    </Chip>
                    {activity.locationName && (
                      <div className="flex items-center gap-1 text-small text-default-500">
                        <MapPin className="w-3 h-3" />
                        {activity.locationName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-small text-default-500">
                  {activity.startTimeLocal
                    ? new Date(activity.startTimeLocal).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </CardHeader>

            <CardBody className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Watch className="w-4 h-4 text-primary" />
                  <div className="text-small">
                    <div className="font-medium">{distanceMiles} mi</div>
                    <div className="text-default-400">Distance</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  <div className="text-small">
                    <div className="font-medium">
                      {movingTimeHours > 0 && `${movingTimeHours}:`}
                      {String(movingTimeMinutes).padStart(movingTimeHours > 0 ? 2 : 1, '0')}:
                      {String(movingTimeSecondsRem).padStart(2, '0')}
                    </div>
                    <div className="text-default-400">Time</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <div className="text-small">
                    <div className="font-medium">
                      {avgPaceMinutes}:{String(avgPaceSeconds).padStart(2, '0')}/mi
                    </div>
                    <div className="text-default-400">Avg Pace</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div className="text-small">
                    <div className="font-medium">{elevationFeet} ft</div>
                    <div className="text-default-400">Elevation</div>
                  </div>
                </div>
              </div>

              {(activity.averageHR || activity.maxHR || activity.calories) && (
                <div className="flex items-center gap-4 mb-4 text-small">
                  {activity.averageHR && (
                    <span>
                      Avg HR:{' '}
                      <span className="font-medium">
                        {Math.round(activity.averageHR)} bpm
                      </span>
                    </span>
                  )}
                  {activity.maxHR && (
                    <span>
                      Max HR:{' '}
                      <span className="font-medium">{Math.round(activity.maxHR)} bpm</span>
                    </span>
                  )}
                  {activity.calories && (
                    <span>
                      Calories: <span className="font-medium">{activity.calories}</span>
                    </span>
                  )}
                </div>
              )}

              <Divider className="my-3" />

              <div className="flex justify-between items-center">
                {importState?.imported ? (
                  <div className="flex items-center gap-2">
                    <Chip color="success" size="sm">
                      Imported
                    </Chip>
                    <span className="text-small text-default-500">Added to your workouts</span>
                  </div>
                ) : (
                  <Button
                    color="primary"
                    size="sm"
                    onPress={() => importActivity(activity)}
                    isLoading={importState?.importing}
                    isDisabled={importState?.importing}
                  >
                    {importState?.importing ? 'Importing...' : 'Import to UltraCoach'}
                  </Button>
                )}

                {importState?.error && (
                  <span className="text-small text-danger">{importState.error}</span>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
