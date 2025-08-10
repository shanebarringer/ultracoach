import { redirect } from 'next/navigation'
import { requireAuth } from '@/utils/auth-server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Dashboard Entry Point (Server Component)
 *
 * Universal dashboard route that redirects users to their role-specific dashboard.
 * This fixes the 404 issue when users navigate to /dashboard directly.
 */
export default async function DashboardPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Redirect to role-specific dashboard
  if (session.user.role === 'coach') {
    redirect('/dashboard/coach')
  } else {
    redirect('/dashboard/runner')
  }
}