import { requireAuth } from '@/utils/auth-server'

import ProfilePageClient from './ProfilePageClient'

/**
 * Profile Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function ProfilePage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Pass authenticated user data to Client Component
  return <ProfilePageClient user={session.user} />
}
