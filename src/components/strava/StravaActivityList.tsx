'use client'

import { Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from '@heroui/react'
import { Activity, Calendar, MapPin, Timer, TrendingUp } from 'lucide-react'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import { formatDateConsistent } from '@/lib/utils/date'

const logger = createLogger('StravaActivityList')

interface StravaActivity {
  id: number
  name: string
  sport_type: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  total_elevation_gain: number // meters
  start_date: string
  start_date_local: string
  location_city?: string
  location_state?: string
  achievement_count: number
  kudos_count: number
  average_speed: number // m/s
  max_speed: number // m/s
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
}

interface StravaActivitiesData {
  activities: StravaActivity[]
  connection: {
    athlete_id: number
    connected_since: string
    scope: string[]
  }
}

interface SyncedActivity {
  [key: number]: {
    syncing: boolean
    synced: boolean
    workout_id?: string
    error?: string
  }
}

export default function StravaActivityList() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StravaActivitiesData | null>(null)
  const [syncedActivities, setSyncedActivities] = useState<SyncedActivity>({})
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    try {
      const response = await api.get<StravaActivitiesData>('/api/strava/activities', {
        suppressGlobalToast: true,
      })
      setData(response.data)
      logger.info('Fetched Strava activities', {
        count: response.data.activities.length,
      })
    } catch (error) {
      logger.error('Error fetching Strava activities:', error)
      setError('Failed to load activities. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const syncActivity = async (activity: StravaActivity) => {
    setSyncedActivities(prev => ({
      ...prev,
      [activity.id]: { ...prev[activity.id], syncing: true, error: undefined },
    }))

    try {
      const response = await api.post<{ workout_id: string }>(
        '/api/strava/sync',
        {
          activity_id: activity.id,
          sync_as_workout: true,
        },
        { suppressGlobalToast: true }
      )

      setSyncedActivities(prev => ({
        ...prev,
        [activity.id]: {
          syncing: false,
          synced: true,
          workout_id: response.data.workout_id,
        },
      }))
      toast.success('Activity synced!', `${activity.name} has been added to your workouts`)
      logger.info('Successfully synced activity', {
        activityId: activity.id,
        workoutId: response.data.workout_id,
      })
    } catch (error) {
      setSyncedActivities(prev => ({
        ...prev,
        [activity.id]: {
          syncing: false,
          synced: false,
          error: 'Failed to sync activity',
        },
      }))
      toast.error('Sync failed', 'Could not sync activity')
      logger.error('Error syncing activity:', error)
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

  if (!data || data.activities.length === 0) {
    return (
      <Card className="w-full">
        <CardBody className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-default-400" />
          <p className="text-default-500 mb-4">No recent activities found</p>
          <p className="text-small text-default-400">
            Activities from your Strava account will appear here
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
        const syncState = syncedActivities[activity.id]
        const distanceMiles = (activity.distance / 1609.34).toFixed(2)
        const movingTimeHours = Math.floor(activity.moving_time / 3600)
        const movingTimeMinutes = Math.floor((activity.moving_time % 3600) / 60)
        const movingTimeSeconds = activity.moving_time % 60
        const avgPaceMinutes = Math.floor(
          activity.distance > 0 ? activity.moving_time / (activity.distance / 1609.34) / 60 : 0
        )
        const avgPaceSeconds = Math.round(
          activity.distance > 0 ? (activity.moving_time / (activity.distance / 1609.34)) % 60 : 0
        )
        const elevationFeet = Math.round(activity.total_elevation_gain * 3.28084)

        return (
          <Card key={activity.id} className="w-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start w-full">
                <div className="flex-1">
                  <h4 className="text-medium font-semibold">{activity.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip size="sm" color="primary" variant="flat">
                      {activity.sport_type}
                    </Chip>
                    {activity.location_city && (
                      <div className="flex items-center gap-1 text-small text-default-500">
                        <MapPin className="w-3 h-3" />
                        {activity.location_city}
                        {activity.location_state && `, ${activity.location_state}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-small text-default-500">
                  {formatDateConsistent(activity.start_date_local)}
                </div>
              </div>
            </CardHeader>

            <CardBody className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
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
                      {String(movingTimeSeconds).padStart(2, '0')}
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

              {activity.average_heartrate && (
                <div className="flex items-center gap-4 mb-4 text-small">
                  <span>
                    Avg HR: <span className="font-medium">{activity.average_heartrate} bpm</span>
                  </span>
                  {activity.max_heartrate && (
                    <span>
                      Max HR: <span className="font-medium">{activity.max_heartrate} bpm</span>
                    </span>
                  )}
                  {activity.kudos_count > 0 && (
                    <span>
                      Kudos: <span className="font-medium">{activity.kudos_count}</span>
                    </span>
                  )}
                </div>
              )}

              <Divider className="my-3" />

              <div className="flex justify-between items-center">
                {syncState?.synced ? (
                  <div className="flex items-center gap-2">
                    <Chip color="success" size="sm">
                      Synced
                    </Chip>
                    <span className="text-small text-default-500">Added to your workouts</span>
                  </div>
                ) : (
                  <Button
                    color="primary"
                    size="sm"
                    onPress={() => syncActivity(activity)}
                    isLoading={syncState?.syncing}
                    isDisabled={syncState?.syncing}
                  >
                    {syncState?.syncing ? 'Syncing...' : 'Sync to UltraCoach'}
                  </Button>
                )}

                {syncState?.error && (
                  <span className="text-small text-danger">{syncState.error}</span>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
