import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only allow with debug token
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      request: {
        headers: Object.fromEntries(req.headers.entries()),
        cookies: req.cookies.getAll(),
        url: req.url,
        method: req.method
      },
      sessionAnalysis: {
        cookieValue: null as string | null,
        hasAuthCookie: false,
        cookieLength: 0,
        cookieFormat: null as string | null,
        tokenParsing: {
          canParseAsHex: false,
          isValidFormat: false,
          error: null as string | null
        }
      },
      betterAuthConfig: {
        baseURL: null as string | null,
        secretLength: process.env.BETTER_AUTH_SECRET?.length || 0,
        hasSecret: !!process.env.BETTER_AUTH_SECRET,
        vercelUrl: process.env.VERCEL_URL || 'not set',
        betterAuthUrl: process.env.BETTER_AUTH_URL || 'not set'
      }
    }

    // Analyze session cookie
    const sessionCookie = req.cookies.get('better-auth.session_token')
    if (sessionCookie) {
      debugInfo.sessionAnalysis.hasAuthCookie = true
      debugInfo.sessionAnalysis.cookieValue = sessionCookie.value
      debugInfo.sessionAnalysis.cookieLength = sessionCookie.value.length
      
      // Analyze cookie format
      if (sessionCookie.value.match(/^[0-9a-fA-F]+$/)) {
        debugInfo.sessionAnalysis.cookieFormat = 'hex'
        debugInfo.sessionAnalysis.tokenParsing.canParseAsHex = true
      } else if (sessionCookie.value.match(/^[A-Za-z0-9+/=]+$/)) {
        debugInfo.sessionAnalysis.cookieFormat = 'base64'
      } else if (sessionCookie.value.includes('.')) {
        debugInfo.sessionAnalysis.cookieFormat = 'jwt-like'
      } else {
        debugInfo.sessionAnalysis.cookieFormat = 'unknown'
      }
      
      // Test hex parsing (what might be causing the error)
      try {
        Buffer.from(sessionCookie.value, 'hex')
        debugInfo.sessionAnalysis.tokenParsing.isValidFormat = true
      } catch (error) {
        debugInfo.sessionAnalysis.tokenParsing.error = error instanceof Error ? error.message : 'Unknown hex parsing error'
      }
    }

    // Try to get Better Auth configuration
    try {
      await import('../../../../lib/better-auth')
      // Try to construct the baseURL the same way Better Auth does
      if (process.env.VERCEL_URL) {
        debugInfo.betterAuthConfig.baseURL = `https://${process.env.VERCEL_URL}/api/auth`
      } else if (process.env.BETTER_AUTH_URL) {
        debugInfo.betterAuthConfig.baseURL = process.env.BETTER_AUTH_URL.endsWith('/api/auth') 
          ? process.env.BETTER_AUTH_URL 
          : `${process.env.BETTER_AUTH_URL}/api/auth`
      } else {
        debugInfo.betterAuthConfig.baseURL = 'http://localhost:3001/api/auth'
      }
    } catch (error) {
      debugInfo.betterAuthConfig.baseURL = `Error loading Better Auth: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Session token debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Test endpoint to simulate a login attempt and capture token handling
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      testCredentials: {
        email,
        passwordLength: password.length,
        passwordPreview: password.substring(0, 3) + '...'
      },
      loginAttempt: {
        success: false,
        error: null as string | null,
        tokenGenerated: false,
        tokenDetails: null as { setCookieHeader: string; hasSessionToken: boolean } | null
      }
    }

    // Try to perform the login
    try {
      const { auth } = await import('../../../../lib/better-auth')
      
      // Create a test request to the sign-in endpoint
      const signInUrl = `https://${process.env.VERCEL_URL}/api/auth/sign-in/email`
      const testReq = new Request(signInUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Debug-Test-Client'
        },
        body: JSON.stringify({ email, password })
      })
      
      const response = await auth.handler(testReq)
      debugInfo.loginAttempt.success = response.status === 200
      
      if (response.status === 200) {
        debugInfo.loginAttempt.tokenGenerated = true
        // Try to extract token information from response
        const setCookieHeader = response.headers.get('set-cookie')
        if (setCookieHeader) {
          debugInfo.loginAttempt.tokenDetails = {
            setCookieHeader: setCookieHeader,
            hasSessionToken: setCookieHeader.includes('better-auth.session_token')
          }
        }
      } else {
        const errorText = await response.text()
        debugInfo.loginAttempt.error = `Status ${response.status}: ${errorText}`
      }
      
    } catch (error) {
      debugInfo.loginAttempt.error = error instanceof Error ? error.message : 'Unknown login error'
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Login test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}