import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return NextResponse.json({
      hasSession: !!session,
      user: session?.user || null,
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}