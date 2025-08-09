import { requireAuth } from '@/utils/auth-server'
import WorkoutsPageClient from './WorkoutsPageClient'

/**
 * Workouts Page (Server Component)
 * 
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function WorkoutsPage() {
  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()
  
  // Pass authenticated user data to Client Component
  return <WorkoutsPageClient user={session.user} />
}