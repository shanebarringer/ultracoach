import { redirect } from 'next/navigation'

import { requireAuth } from '@/utils/auth-server'

import WeeklyOverviewPageClient from './WeeklyOverviewPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Coach Weekly Overview Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function CoachWeeklyOverviewPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Ensure only coaches can access this page
  if (session.user.role !== 'coach') {
    redirect('/dashboard')
  }

  // Pass authenticated user data to Client Component
  return <WeeklyOverviewPageClient user={session.user} />
}
