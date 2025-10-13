import type { User } from '@/lib/better-auth-client'
import { requireCoach } from '@/utils/auth-server'

import RunnersPageClient from './RunnersPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Runners Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Requires coach role for access.
 */
export default async function RunnersPage() {
  // Server-side authentication and coach role verification - forces dynamic rendering
  const session = await requireCoach()

  // Pass authenticated coach data to Client Component
  return <RunnersPageClient user={session.user as unknown as User} />
}
