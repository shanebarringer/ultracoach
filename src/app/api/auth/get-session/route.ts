import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/better-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    return NextResponse.json({ session }, { status: 200 })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}
