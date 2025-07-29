import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only allow in development or with a debug token
  const isDev = process.env.NODE_ENV === 'development'
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (!isDev && debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    environment: {
      // Check for critical environment variables
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? 
        `[SET - ${process.env.BETTER_AUTH_SECRET.length} chars]` : 
        'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : 'MISSING',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'not set',
      // Check if secret is actually usable
      secretUsable: !!(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length > 0)
    },
    warnings: [] as string[]
  }

  // Add warnings for common issues
  if (!process.env.BETTER_AUTH_SECRET) {
    envCheck.warnings.push('BETTER_AUTH_SECRET is missing - this will cause auth errors')
  } else if (process.env.BETTER_AUTH_SECRET.length < 32) {
    envCheck.warnings.push('BETTER_AUTH_SECRET is too short - should be at least 32 characters')
  }

  if (!process.env.DATABASE_URL) {
    envCheck.warnings.push('DATABASE_URL is missing')
  }

  return NextResponse.json(envCheck, { status: 200 })
}