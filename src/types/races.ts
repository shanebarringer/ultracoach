// Race types
export interface Race {
  id: string
  name: string
  date: string
  distance: number
  distance_unit: 'miles' | 'km'
  location?: string
  terrain?: 'road' | 'trail' | 'mixed'
  elevation_gain?: number
  website_url?: string
  description?: string
  created_at: string
  updated_at?: string
}
