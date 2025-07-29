import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Only allow with debug token
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
        passwordLength: password.length
      },
      authHandlerTest: {
        success: false,
        error: null as string | null,
        responseStatus: 0,
        responseHeaders: {} as Record<string, string>,
        responseBody: null as string | object | null,
        cookiesSet: [] as string[]
      }
    }

    try {
      // Import Better Auth directly
      const { auth } = await import('../../../../lib/better-auth')
      
      // Create a request exactly like the frontend would send
      const signInUrl = `https://${process.env.VERCEL_URL}/api/auth/sign-in/email`
      const testRequest = new Request(signInUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': `https://${process.env.VERCEL_URL}`,
          'Referer': `https://${process.env.VERCEL_URL}/auth/signin`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Debug/1.0',
          // Don't include any cookie headers to avoid the hex parsing error
          'Cookie': '' // Explicitly set empty cookie header
        },
        body: JSON.stringify({ email, password })
      })

      // Call the Better Auth handler directly
      const response = await auth.handler(testRequest)
      
      debugInfo.authHandlerTest.responseStatus = response.status
      debugInfo.authHandlerTest.responseHeaders = Object.fromEntries(response.headers.entries())
      
      // Check for Set-Cookie headers
      const setCookieHeaders = response.headers.getSetCookie?.() || []
      debugInfo.authHandlerTest.cookiesSet = setCookieHeaders

      // Try to read the response body
      try {
        const responseText = await response.text()
        try {
          debugInfo.authHandlerTest.responseBody = JSON.parse(responseText)
        } catch {
          debugInfo.authHandlerTest.responseBody = responseText
        }
      } catch (bodyError) {
        debugInfo.authHandlerTest.responseBody = `Error reading body: ${bodyError instanceof Error ? bodyError.message : 'Unknown'}`
      }

      debugInfo.authHandlerTest.success = response.status === 200

    } catch (error) {
      debugInfo.authHandlerTest.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Auth handler test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}