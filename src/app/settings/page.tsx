import { requireAuth } from '@/utils/auth-server'

import SettingsPageClient from './SettingsPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Settings Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function SettingsPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Pass authenticated user data to Client Component
  return <SettingsPageClient user={session.user} />
}
