/**
 * Shared types for invitation-related features
 * Used across invitation accept/decline pages and signup flow
 */

/**
 * Invitation details returned from validation API
 */
export interface InvitationDetails {
  inviterName: string | null
  inviterEmail: string
  invitedRole: 'runner' | 'coach'
  personalMessage: string | null
  expiresAt: string
}

/**
 * Response from invitation validation endpoint (GET)
 */
export interface ValidateInvitationResponse {
  valid: boolean
  error?: string
  message?: string
  invitation?: InvitationDetails
  existingUser?: boolean
}

/**
 * Response from invitation acceptance endpoint (POST)
 */
export interface AcceptInvitationResponse {
  success: boolean
  message?: string
  redirectUrl?: string
  error?: string
}
