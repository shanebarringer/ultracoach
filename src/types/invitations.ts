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
  /** Optional name of the person being invited - used to pre-fill signup form */
  inviteeName: string | null
  /** Email of the person being invited - used to pre-fill signup form */
  inviteeEmail: string
}

/**
 * Response from invitation validation endpoint (GET)
 * Uses discriminated union pattern for type-safe response handling
 */
export type ValidateInvitationResponse =
  | {
      valid: true
      invitation: InvitationDetails
      existingUser: boolean
    }
  | {
      valid: false
      error: string
      message: string
    }

/**
 * Response from invitation acceptance endpoint (POST)
 * Uses discriminated union pattern for type-safe response handling
 */
export type AcceptInvitationResponse =
  | {
      success: true
      redirectUrl: string
      relationship: {
        id: string
        type: 'coach_runner' | 'coach_connection'
        inviterId: string
        inviteeId: string
        status: 'active'
      }
    }
  | {
      success: false
      error: string
      message: string
    }
