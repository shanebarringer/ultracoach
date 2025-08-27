import { requireAuth } from '@/utils/auth-server'

import TrainingPlansPageClient from './TrainingPlansPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Training Plans Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function TrainingPlansPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Pass authenticated user data to Client Component
  return <TrainingPlansPageClient user={session.user} />
}
