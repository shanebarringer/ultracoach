import { NextResponse } from 'next/server'

// Test Better Auth import without initialization
export async function GET() {
  try {
    // Step 1: Test environment variables
    const envTest = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : 'missing',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? '[SET]' : 'missing',
    }

    // Step 2: Test Better Auth import (this might be where it crashes)
    let betterAuthImport = 'not-attempted'
    try {
      await import('better-auth')
      betterAuthImport = 'success'
    } catch (error) {
      betterAuthImport = `failed: ${error instanceof Error ? error.message : 'unknown'}`
    }

    // Step 3: Test our Better Auth module (this is likely where it crashes)
    let ourAuthImport = 'not-attempted'
    try {
      await import('@/lib/better-auth')
      ourAuthImport = 'success'
    } catch (error) {
      ourAuthImport = `failed: ${error instanceof Error ? error.message : 'unknown'}`
    }

    return NextResponse.json({
      success: true,
      message: 'Better Auth test endpoint',
      timestamp: new Date().toISOString(),
      tests: {
        environment: envTest,
        betterAuthImport,
        ourAuthImport,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
