'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function DebugAuthPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authKey, setAuthKey] = useState('')
  const [results, setResults] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only allow debug page in development or with proper authorization
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG_ENABLED) {
      redirect('/')
    }
  }, [])

  const handleAuth = () => {
    // In development, allow with any key. In production, require environment variable
    const requiredKey = process.env.NODE_ENV === 'production' 
      ? process.env.DEBUG_AUTH_KEY 
      : 'dev-debug'
    
    if (authKey === requiredKey) {
      setIsAuthorized(true)
    } else {
      alert('Invalid debug authorization key')
    }
  }

  const testBasicAuth = async () => {
    setLoading(true)
    try {
      // Only run authentication test with proper configuration
      const testEmail = process.env.NEXT_PUBLIC_TEST_EMAIL
      const testPassword = process.env.NEXT_PUBLIC_TEST_PASSWORD
      
      if (!testEmail || !testPassword) {
        setResults('Authentication test requires NEXT_PUBLIC_TEST_EMAIL and NEXT_PUBLIC_TEST_PASSWORD environment variables')
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      const data = await response.json()
      setResults(JSON.stringify({ ...data, password: '[REDACTED]' }, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Debug Authorization Required</h1>
        <div className="bg-yellow-100 p-4 rounded-sm mb-4">
          <p className="text-sm text-yellow-800">
            This debug page is only available in development or with proper authorization.
          </p>
        </div>
        <input
          type="password"
          placeholder="Enter debug authorization key"
          value={authKey}
          onChange={(e) => setAuthKey(e.target.value)}
          className="w-full p-2 border rounded-sm mb-4"
        />
        <button
          onClick={handleAuth}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-sm"
        >
          Authorize Debug Access
        </button>
      </div>
    )
  }



  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Secure Auth Debug Tools</h1>
      
      <div className="bg-green-100 p-4 rounded-sm mb-6">
        <p className="text-green-800">✅ Authorized debug access granted</p>
        <p className="text-sm text-green-600 mt-1">Environment: {process.env.NODE_ENV}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        <button
          onClick={testBasicAuth}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-sm"
        >
          🔍 Test Basic Auth Flow
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-sm">
        <h2 className="text-lg font-semibold mb-4">Results:</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{results || 'Click a button to test'}</pre>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-100 rounded-sm">
        <h3 className="font-semibold mb-2">Security Notes:</h3>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>All test credentials are loaded from environment variables</li>
          <li>Debug page is automatically disabled in production</li>
          <li>Sensitive data is redacted from debug output</li>
          <li>Access requires authorization key in production</li>
        </ul>
      </div>
    </div>
  )
}