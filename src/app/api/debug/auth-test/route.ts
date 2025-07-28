import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/better-auth'

export async function GET(_req: NextRequest) {
  try {
    // Simple test to see if Better Auth is working
    const testResult = {
      timestamp: new Date().toISOString(),
      betterAuthReady: !!auth,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL ? '[SET]' : undefined,
      betterAuthUrl: process.env.BETTER_AUTH_URL ? '[SET]' : undefined,
    }

    return NextResponse.json(testResult, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Better Auth initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}