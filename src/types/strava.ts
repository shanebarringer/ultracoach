export interface StravaAthlete {
  id: number
  username: string
  resource_state: number
  firstname: string
  lastname: string
  bio: string
  city: string
  state: string
  country: string
  sex: 'M' | 'F'
  premium: boolean
  summit: boolean
  created_at: string
  updated_at: string
  badge_type_id: number
  weight: number
  profile_medium: string
  profile: string
  friend: string | null
  follower: string | null
}

export interface StravaActivity {
  id: number
  resource_state: number
  external_id: string
  upload_id: number
  athlete: {
    id: number
    resource_state: number
  }
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  total_elevation_gain: number // meters
  type: string
  sport_type: string
  workout_type?: number
  id_str: string
  start_date: string
  start_date_local: string
  timezone: string
  utc_offset: number
  location_city?: string
  location_state?: string
  location_country?: string
  achievement_count: number
  kudos_count: number
  comment_count: number
  athlete_count: number
  photo_count: number
  trainer: boolean
  commute: boolean
  manual: boolean
  private: boolean
  visibility: string
  flagged: boolean
  gear_id?: string
  start_latlng: [number, number]
  end_latlng: [number, number]
  average_speed: number // m/s
  max_speed: number // m/s
  average_cadence?: number
  average_watts?: number
  weighted_average_watts?: number
  kilojoules?: number
  device_watts?: boolean
  has_heartrate: boolean
  average_heartrate?: number
  max_heartrate?: number
  heartrate_opt_out: boolean
  display_hide_heartrate_option: boolean
  elev_high?: number
  elev_low?: number
  upload_id_str: string
  pr_count: number
  total_photo_count: number
  has_kudoed: boolean
  suffer_score?: number
}

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: 'Bearer'
}

export interface StravaAuthScope {
  read?: boolean
  read_all?: boolean
  profile_read_all?: boolean
  profile_write?: boolean
  activity_read?: boolean
  activity_read_all?: boolean
  activity_write?: boolean
}

export interface StravaConnection {
  id: string
  user_id: string
  strava_athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: Date
  scope: string[]
  athlete_data: StravaAthlete
  created_at: Date
  updated_at: Date
}

export interface StravaActivitySync {
  id: string
  connection_id: string
  strava_activity_id: number
  ultracoach_workout_id?: string
  activity_data: StravaActivity
  sync_status: 'pending' | 'synced' | 'failed' | 'ignored'
  sync_error?: string
  synced_at?: Date
  created_at: Date
  updated_at: Date
}

// Strava webhook event types
export interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete'
  object_id: number
  aspect_type: 'create' | 'update' | 'delete'
  updates: Record<string, unknown>
  owner_id: number
  subscription_id: number
  event_time: number
}

// Activity type mapping for UltraCoach
export const STRAVA_ACTIVITY_TYPE_MAP: Record<string, string> = {
  Run: 'run',
  TrailRun: 'trail_run',
  VirtualRun: 'virtual_run',
  Hike: 'hike',
  Walk: 'walk',
  WeightTraining: 'strength',
  Crosstraining: 'cross_training',
  Elliptical: 'elliptical',
  StairStepper: 'stairs',
  Rowing: 'rowing',
  Swim: 'swim',
  Bike: 'bike',
  MountainBikeRide: 'mountain_bike',
  VirtualBike: 'virtual_bike',
}
