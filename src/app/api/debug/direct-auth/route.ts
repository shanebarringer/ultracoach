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
      directAuthTest: {
        baseURL: null as string | null,
        requestDetails: null as any,
        responseDetails: null as any,
        error: null as string | null,
        success: false
      }
    }

    // Get the Better Auth base URL
    if (process.env.VERCEL_URL) {
      debugInfo.directAuthTest.baseURL = `https://${process.env.VERCEL_URL}/api/auth`
    } else {
      debugInfo.directAuthTest.baseURL = 'http://localhost:3001/api/auth'
    }

    // Try to directly call the Better Auth sign-in endpoint
    try {
      const signInUrl = `${debugInfo.directAuthTest.baseURL}/sign-in/email`
      
      debugInfo.directAuthTest.requestDetails = {
        url: signInUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Debug/1.0'
        },
        body: { email, password: '***masked***' }
      }

      const response = await fetch(signInUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Debug/1.0'
        },
        body: JSON.stringify({ email, password })
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      debugInfo.directAuthTest.responseDetails = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData
      }

      debugInfo.directAuthTest.success = response.status === 200

    } catch (error) {
      debugInfo.directAuthTest.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(debugInfo, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Direct auth test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}