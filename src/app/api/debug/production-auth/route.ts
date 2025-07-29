import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/better-auth'

export async function GET(req: NextRequest) {
  const debugToken = req.nextUrl.searchParams.get('token')
  const validToken = 'debug123'
  
  if (debugToken !== validToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const analysis = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Environment analysis
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL ? `[SET] ${process.env.VERCEL_URL}` : 'NOT_SET',
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? '[SET]' : 'NOT_SET',
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? `[SET - ${process.env.BETTER_AUTH_SECRET.length} chars]` : 'NOT_SET',
        DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : 'NOT_SET',
        BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS ? '[SET]' : 'NOT_SET',
      },

      // Better Auth configuration analysis
      betterAuthConfig: {
        configuredProperly: !!auth.handler && !!auth.api,
        hasSecret: !!process.env.BETTER_AUTH_SECRET,
        secretLength: process.env.BETTER_AUTH_SECRET?.length || 0,
        environment: process.env.NODE_ENV,
        baseURLFromEnv: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth` : 'localhost fallback',
        // Note: Better Auth internal config is not directly accessible via $Infer.Options
        // This is by design for security reasons
        configNote: 'Internal configuration access limited for security',
      },

      // Request analysis
      requestAnalysis: {
        url: req.url,
        method: req.method,
        headers: {
          'user-agent': req.headers.get('user-agent'),
          'origin': req.headers.get('origin'),
          'referer': req.headers.get('referer'),
          'host': req.headers.get('host'),
          'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
          'x-forwarded-host': req.headers.get('x-forwarded-host'),
        },
        cookieHeader: req.headers.get('cookie') || 'NO_COOKIES',
        cookieCount: req.cookies.getAll().length,
        cookies: req.cookies.getAll().map(cookie => ({
          name: cookie.name,
          valueLength: cookie.value.length,
          valuePreview: cookie.value.substring(0, 20) + (cookie.value.length > 20 ? '...' : ''),
        })),
      },

      // Better Auth internal state
      internalState: {
        isInitialized: !!auth,
        hasHandler: !!auth.handler,
        hasApi: !!auth.api,
      },
    }

    return NextResponse.json(analysis, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Production auth analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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
      environment: process.env.NODE_ENV,
      testCredentials: {
        email,
        passwordLength: password.length,
        passwordType: typeof password,
      },
      authFlowTest: {
        step1_apiCall: { success: false, error: null as string | null, response: null as unknown },
        step2_sessionCheck: { success: false, error: null as string | null, session: null as unknown },
        step3_cookieAnalysis: { cookiesSet: [] as string[], cookieCount: 0 },
      }
    }

    try {
      // Step 1: Test the API call directly
      debugInfo.authFlowTest.step1_apiCall.success = false
      
      const signInResponse = await auth.api.signInEmail({
        body: { email, password }
      })
      
      debugInfo.authFlowTest.step1_apiCall.success = true
      debugInfo.authFlowTest.step1_apiCall.response = {
        hasUser: !!signInResponse.user,
        hasToken: !!signInResponse.token,
        redirect: signInResponse.redirect || false,
        userId: signInResponse.user?.id,
        token: signInResponse.token ? '[TOKEN_SET]' : 'NO_TOKEN',
      }

      // Step 2: Test session retrieval
      try {
        const session = await auth.api.getSession({
          headers: req.headers
        })
        
        debugInfo.authFlowTest.step2_sessionCheck.success = !!session
        debugInfo.authFlowTest.step2_sessionCheck.session = session ? {
          hasUser: !!session.user,
          hasSession: !!session.session,
          userId: session.user?.id,
          sessionId: session.session?.id,
          expiresAt: session.session?.expiresAt,
        } : null
        
      } catch (sessionError) {
        debugInfo.authFlowTest.step2_sessionCheck.error = sessionError instanceof Error ? sessionError.message : 'Unknown session error'
      }

    } catch (apiError) {
      debugInfo.authFlowTest.step1_apiCall.error = apiError instanceof Error ? apiError.message : 'Unknown API error'
      
      // Check if this is the hex parsing error
      if (apiError instanceof Error && apiError.message.includes('hex string expected')) {
        debugInfo.authFlowTest.step1_apiCall.error += ' [THIS IS THE HEX PARSING ERROR WE\'RE DEBUGGING]'
      }
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Auth flow test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}