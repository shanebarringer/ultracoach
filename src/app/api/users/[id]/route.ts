import { eq } from 'drizzle-orm'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { user as userTable } from '@/lib/schema'
import { getServerSession } from '@/lib/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const rows = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1)

    const found = rows[0]
    if (!found) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: found })
  } catch (error) {
    console.error('API error in GET /users/[id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
