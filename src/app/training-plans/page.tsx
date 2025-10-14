import { headers } from 'next/headers'

import { requireAuth } from '@/utils/auth-server'

import TrainingPlansPageClient from './TrainingPlansPageClient'

/**
 * Training Plans Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 *
 * Note: Suspense boundary is inside TrainingPlansPageClient to keep Layout
 * (header/navigation) always visible while content loads.
 */
export default async function TrainingPlansPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - this is the real security boundary
  const session = await requireAuth()

  // Pass authenticated user data to Client Component
  // Suspense boundary is inside the client component to prevent header flicker
  return <TrainingPlansPageClient user={session.user} />
}
