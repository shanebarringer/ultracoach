/**
 * User name utility functions
 * Provides consistent name derivation logic across the application
 */

export interface UserNameFields {
  name: string | null
  fullName: string | null
}

export interface NameUpdateResult {
  name: string
  fullName: string
  needsUpdate: boolean
}

/**
 * Extracts a display name from an email address with robust validation
 * @param email - The email address to parse (must be a string)
 * @returns A formatted display name, or the original email if invalid
 * @example
 * getDisplayNameFromEmail('alex.rivera@ultracoach.dev')
 * // Returns: 'Alex Rivera'
 *
 * getDisplayNameFromEmail('john..doe@example.com')
 * // Returns: 'John Doe' (handles consecutive dots)
 *
 * getDisplayNameFromEmail('invalid-email')
 * // Returns: 'invalid-email' (fallback for malformed email)
 */
export function getDisplayNameFromEmail(email: string): string {
  // Handle non-string inputs by returning empty string
  if (typeof email !== 'string') {
    return ''
  }

  // Trim whitespace
  const trimmedEmail = email.trim()

  // Return empty if input is empty/whitespace
  if (!trimmedEmail) {
    return trimmedEmail
  }

  // Validate email has at least one @ character
  const atIndex = trimmedEmail.indexOf('@')
  if (atIndex === -1) {
    // No @ found - return original trimmed email as fallback
    return trimmedEmail
  }

  // Extract name portion (before first @)
  const emailName = trimmedEmail.substring(0, atIndex)

  // Split on dots, filter out empty segments (handles consecutive dots)
  const nameParts = emailName
    .split('.')
    .filter(part => part.length > 0)
    .map(part => {
      // Capitalize first character and keep the rest
      return part.charAt(0).toUpperCase() + part.slice(1)
    })

  // Join with spaces, or return original trimmed email if no valid parts
  return nameParts.length > 0 ? nameParts.join(' ') : trimmedEmail
}

/**
 * Determines what name updates are needed for a user
 * Derives missing names from existing fields or email
 * @param user - User with name, fullName, and email fields
 * @returns Object containing resolved names and whether update is needed
 */
export function getNameUpdates(user: {
  name: string | null
  fullName: string | null
  email: string
}): NameUpdateResult {
  let needsUpdate = false
  let resolvedName = user.name || ''
  let resolvedFullName = user.fullName || ''

  // Derive fullName if missing or blank
  if (!user.fullName || user.fullName.trim() === '') {
    if (user.name && user.name.trim() !== '') {
      resolvedFullName = user.name
    } else {
      resolvedFullName = getDisplayNameFromEmail(user.email)
    }
    needsUpdate = true
  } else {
    resolvedFullName = user.fullName
  }

  // Derive name if missing or blank
  // resolvedFullName already reflects any valid user.fullName from above
  if (!user.name || user.name.trim() === '') {
    // Use resolvedFullName if it's non-blank, otherwise derive from email
    if (resolvedFullName && resolvedFullName.trim() !== '') {
      resolvedName = resolvedFullName
    } else {
      resolvedName = getDisplayNameFromEmail(user.email)
    }
    needsUpdate = true
  } else {
    resolvedName = user.name
  }

  return {
    name: resolvedName,
    fullName: resolvedFullName,
    needsUpdate,
  }
}
