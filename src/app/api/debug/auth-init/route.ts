import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only allow with debug token
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try to import and test Better Auth initialization
    const { auth } = await import('../../../../lib/better-auth')
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      betterAuthStatus: {
        initialized: !!auth,
        hasHandler: typeof auth?.handler === 'function',
        // Test if we can get the base URL from auth
        canCallHandler: false,
        error: null as string | null,
        testResponse: null as { status: number; statusText: string } | null
      },
      environment: {
        VERCEL_URL: process.env.VERCEL_URL,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'not set',
        NODE_ENV: process.env.NODE_ENV
      }
    }

    // Try a simple operation to see if Better Auth is working
    try {
      // Create a simple request object to test the handler
      const testReq = new Request(`https://${process.env.VERCEL_URL}/api/auth/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await auth.handler(testReq)
      debugInfo.betterAuthStatus.canCallHandler = true
      debugInfo.betterAuthStatus.testResponse = {
        status: response.status,
        statusText: response.statusText
      }
    } catch (handlerError) {
      debugInfo.betterAuthStatus.error = handlerError instanceof Error ? handlerError.message : 'Unknown handler error'
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Better Auth initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
}