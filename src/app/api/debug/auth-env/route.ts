import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only allow in development or with a debug token
  const isDev = process.env.NODE_ENV === 'development'
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = process.env.DEBUG_TOKEN || 'debug123'
  
  if (!isDev && debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get Better Auth URL construction logic
  function getBetterAuthBaseUrl(): string {
    // Vercel best practice: Use VERCEL_URL in production (automatically set by Vercel)
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/auth`
    }
    
    // Alternative: Use explicit BETTER_AUTH_URL if provided (takes precedence)
    if (process.env.BETTER_AUTH_URL) {
      const url = process.env.BETTER_AUTH_URL
      // Use endsWith for more accurate detection of /api/auth path
      return url.endsWith('/api/auth') ? url : `${url}/api/auth`
    }
    
    // Development fallback
    return 'http://localhost:3001/api/auth'
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? '[SET]' : undefined,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? '[SET - length: ' + process.env.BETTER_AUTH_SECRET.length + ']' : undefined,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : undefined,
    },
    computed: {
      betterAuthBaseUrl: getBetterAuthBaseUrl(),
    },
    request: {
      host: req.headers.get('host'),
      protocol: req.headers.get('x-forwarded-proto') || 'http',
      url: req.url,
    }
  }

  return NextResponse.json(debugInfo, { status: 200 })
}