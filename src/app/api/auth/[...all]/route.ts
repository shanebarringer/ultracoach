import { NextRequest } from 'next/server'

import { auth } from '@/lib/better-auth'

export async function GET(req: NextRequest) {
  return auth.handler(req)
}

export async function POST(req: NextRequest) {
  return auth.handler(req)
}

export async function PUT(req: NextRequest) {
  return auth.handler(req)
}

export async function DELETE(req: NextRequest) {
  return auth.handler(req)
}

export async function PATCH(req: NextRequest) {
  return auth.handler(req)
}

export async function OPTIONS(req: NextRequest) {
  return auth.handler(req)
}
