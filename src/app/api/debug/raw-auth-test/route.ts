import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/better-auth'

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
      testCredentials: { email, passwordLength: password.length },
      authInternals: {
        hasAuth: !!auth,
        hasHandler: !!auth.handler,
        hasApi: !!auth.api,
        authKeys: Object.keys(auth),
        apiKeys: auth.api ? Object.keys(auth.api) : [],
      }
    }

    // Test 1: Try to call auth.api.signInEmail directly with minimal setup
    try {
      console.log('🔍 Starting raw auth test...')
      
      // Create a minimal body object
      const signInBody = { email, password }
      console.log('📤 Sign-in body:', { email, passwordLength: password.length })

      // Call the API directly
      const response = await auth.api.signInEmail({
        body: signInBody
      })
      
      console.log('✅ Auth API call succeeded')
      console.log('📥 Response keys:', Object.keys(response || {}))
      console.log('📥 Response user:', response?.user ? 'present' : 'missing')
      console.log('📥 Response token:', response?.token ? 'present' : 'missing')

      return NextResponse.json({
        ...debugInfo,
        test: 'SUCCESS',
        response: {
          hasUser: !!response?.user,
          hasToken: !!response?.token,
          userId: response?.user?.id,
          userEmail: response?.user?.email,
          responseKeys: Object.keys(response || {}),
          fullResponse: response
        }
      })

    } catch (apiError) {
      console.error('❌ Auth API call failed:', apiError)
      
      // Detailed error analysis
      const errorAnalysis = {
        errorType: typeof apiError,
        errorMessage: apiError instanceof Error ? apiError.message : 'Unknown error',
        errorStack: apiError instanceof Error ? apiError.stack : null,
        isHexError: apiError instanceof Error && apiError.message.includes('hex string expected'),
        stringified: JSON.stringify(apiError, null, 2)
      }

      return NextResponse.json({
        ...debugInfo,
        test: 'FAILED',
        error: errorAnalysis
      })
    }

  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Raw auth test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}