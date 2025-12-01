/**
 * Accept Invitation Page (Server Component)
 * Uses Server/Client hybrid pattern for proper dynamic rendering
 */
import AcceptPageClient from './AcceptPageClient'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitationAcceptPage({ params }: PageProps) {
  const { token } = await params

  return <AcceptPageClient token={token} />
}
