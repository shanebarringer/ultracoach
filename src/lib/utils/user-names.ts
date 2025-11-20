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
 * Extracts a display name from an email address
 * @param email - The email address to parse
 * @returns A formatted display name
 * @example
 * getDisplayNameFromEmail('alex.rivera@ultracoach.dev')
 * // Returns: 'Alex Rivera'
 */
export function getDisplayNameFromEmail(email: string): string {
  const emailName = email.split('@')[0]
  return emailName
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

  // Derive fullName if missing
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

  // Derive name if missing
  if (!user.name || user.name.trim() === '') {
    if (resolvedFullName && resolvedFullName.trim() !== '') {
      resolvedName = resolvedFullName
    } else if (user.fullName && user.fullName.trim() !== '') {
      resolvedName = user.fullName
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
