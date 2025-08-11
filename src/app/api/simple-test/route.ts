import { NextResponse } from 'next/server'

// Simple test endpoint with no dependencies
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Simple endpoint works',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasVercelUrl: !!process.env.VERCEL_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
