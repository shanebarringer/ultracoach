import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const allCookies = req.cookies.getAll()
    
    // Parse cookies manually to see what we have
    const parsedCookies: Record<string, string> = {}
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=')
        if (name && rest.length > 0) {
          parsedCookies[name] = rest.join('=')
        }
      })
    }

    // Look for Better Auth related cookies
    const betterAuthCookies = Object.entries(parsedCookies).filter(([name]) => 
      name.includes('better-auth') || name.includes('session') || name.includes('token')
    )

    const analysis = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      cookieAnalysis: {
        rawCookieHeader: cookieHeader,
        cookieCount: allCookies.length,
        allCookieNames: allCookies.map(c => c.name),
        betterAuthCookies: betterAuthCookies.map(([name, value]) => ({
          name,
          valueLength: value.length,
          valuePreview: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
          isHexLike: /^[0-9a-fA-F]+$/.test(value),
          containsHyphen: value.includes('-'),
          containsDot: value.includes('.'),
        })),
        suspiciousValues: Object.entries(parsedCookies)
          .filter(([, value]) => value === 'undefined' || value === 'null' || value === '')
          .map(([name, value]) => ({ name, value }))
      },
      environmentCheck: {
        betterAuthSecret: process.env.BETTER_AUTH_SECRET ? `[SET - ${process.env.BETTER_AUTH_SECRET.length} chars]` : 'MISSING',
        vercelUrl: process.env.VERCEL_URL || 'not set',
        nodeEnv: process.env.NODE_ENV
      }
    }

    return NextResponse.json(analysis, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Cookie analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}