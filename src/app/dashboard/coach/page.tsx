import DashboardRouter from '@/components/dashboard/DashboardRouter'
import { requireCoach } from '@/utils/auth-server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Coach Dashboard Page (Server Component)
 *
 * Forces dynamic rendering and ensures only coaches can access this route.
 * Server-side role validation provides better security and UX.
 */
export default async function CoachDashboardPage() {
  // Server-side authentication and role validation - forces dynamic rendering
  const session = await requireCoach()

  // Pass authenticated coach data to Client Component
  return <DashboardRouter user={session.user} />
}
