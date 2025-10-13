import { Logger } from 'tslog'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'

const logger = new Logger()

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    return NextResponse.json({ session }, { status: 200 })
  } catch (error: unknown) {
    logger.error('Error getting session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}
