/**
 * Shared types for relationship data across the application
 */

export interface RelationshipData {
  id: string
  status: 'pending' | 'active' | 'inactive'
  relationship_type: 'standard' | 'invited'
  invited_by: 'coach' | 'runner'
  created_at: string
  notes: string | null
  is_coach: boolean
  is_runner: boolean
  other_party: {
    id: string
    name: string
    full_name: string | null
    email: string
    role: 'coach' | 'runner' // This contains the userType value from the database
  }
}

// Alias for backward compatibility
export type Relationship = RelationshipData
