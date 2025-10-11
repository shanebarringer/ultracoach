import { headers } from 'next/headers'

import { requireAuth } from '@/utils/auth-server'

import TrainingPlansPageClient from './TrainingPlansPageClient'

/**
 * Training Plans Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 *
 * ARCHITECTURE NOTE: TrainingPlansPageClient handles its own internal
 * Suspense boundaries for data loading. No outer Suspense needed here
 * because it's a regular import (not dynamic) and won't suspend.
 */
export default async function TrainingPlansPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - this is the real security boundary
  const session = await requireAuth()

  // Pass authenticated user data to Client Component
  // Client Component contains Suspense for async data loading
  return <TrainingPlansPageClient user={session.user} />
}
