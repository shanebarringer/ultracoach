import { requireRunner } from '@/utils/auth-server'
import DashboardRouter from '@/components/dashboard/DashboardRouter'

/**
 * Runner Dashboard Page (Server Component)
 * 
 * Forces dynamic rendering and ensures only runners can access this route.
 * Server-side role validation provides better security and UX.
 */
export default async function RunnerDashboardPage() {
  // Server-side authentication and role validation - forces dynamic rendering
  const session = await requireRunner()
  
  // Pass authenticated runner data to Client Component
  return <DashboardRouter user={session.user} />
}
