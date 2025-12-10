export interface StravaAthleteData {
  username?: string
  firstname?: string
  lastname?: string
  city?: string
  state?: string
  country?: string
  sex?: string
  premium?: boolean
  summit?: boolean
  created_at?: string
  updated_at?: string
  badge_type_id?: number
  profile_medium?: string
  profile?: string
  friend?: string | null
  follower?: string | null
}

export interface UserProfile {
  id: string
  user_id: string
  bio?: string | null
  location?: string | null
  website?: string | null
  avatar_url?: string | null
  years_experience?: number | null
  specialties?: string[] | null
  achievements?: string[] | null
  availability_status?: 'available' | 'limited' | 'unavailable'
  hourly_rate?: string | null
  consultation_enabled?: boolean
  created_at: Date
  updated_at: Date
}

export interface SocialProfile {
  id: string
  user_id: string
  platform: 'instagram' | 'strava' | 'youtube' | 'twitter' | 'facebook' | 'linkedin'
  profile_url: string
  username?: string
  display_name?: string
  is_verified: boolean
  is_public: boolean
  created_at: Date
  updated_at: Date
}

export interface Certification {
  id: string
  user_id: string
  name: string // alias for title
  title: string
  issuing_organization: string
  issue_date?: string
  expiration_date?: string
  credential_id?: string
  credential_url?: string
  verification_url?: string
  status: 'active' | 'expired' | 'pending' | 'revoked'
  is_featured: boolean
  created_at: Date
  updated_at: Date
}

export interface CoachStatistics {
  id: string
  user_id: string
  total_athletes: number
  active_athletes: number
  average_rating: number
  total_reviews: number
  years_coaching: number
  success_stories: number
  created_at: Date
  updated_at: Date
}

export interface ProfileData {
  profile: UserProfile | null
  social_profiles: SocialProfile[]
  certifications: Certification[]
  coach_statistics: CoachStatistics | null
  strava_connected: boolean
  strava_username: string | null
}

export interface ProfileUpdateData {
  bio?: string
  location?: string
  website?: string
  years_experience?: number
  specialties?: string[]
  achievements?: string[]
  availability_status?: 'available' | 'limited' | 'unavailable'
  hourly_rate?: string
  consultation_enabled?: boolean
}
