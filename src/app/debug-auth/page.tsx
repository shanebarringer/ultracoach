'use client'

import { useState } from 'react'

export default function DebugAuthPage() {
  const [results, setResults] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testDirectAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/direct-auth?token=debug123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testcoach@ultracoach.dev',
          password: 'password123'
        })
      })
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testAuthHandler = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/auth-handler?token=debug123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testcoach@ultracoach.dev',
          password: 'password123'
        })
      })
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testProductionAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/production-auth?token=debug123')
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testAuthFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/production-auth?token=debug123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testcoach@ultracoach.dev',
          password: 'password123'
        })
      })
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testSessionTokens = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/session-tokens?token=debug123')
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testRawAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/raw-auth-test?token=debug123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testcoach@ultracoach.dev',
          password: 'password123'
        })
      })
      const data = await response.json()
      setResults(JSON.stringify(data, null, 2))
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }



  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Better Auth Debug Tools</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={testProductionAuth}
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          🔍 Production Config Analysis
        </button>
        
        <button
          onClick={testAuthFlow}
          disabled={loading}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          🚀 Test Complete Auth Flow
        </button>
        
        <button
          onClick={testSessionTokens}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          📊 Session Token Analysis
        </button>
        
        <button
          onClick={testDirectAuth}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          ⚡ Direct Auth API Test
        </button>
        
        <button
          onClick={testAuthHandler}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          🔧 Auth Handler Test
        </button>
        
        <button
          onClick={testRawAuth}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
        >
          🧪 Raw API Test
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-4">Results:</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{results || 'Click a button to test'}</pre>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">Comprehensive Production Debugging Suite:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-indigo-600 mb-1">🔍 Production Config Analysis</h4>
            <p>Analyzes environment variables, Better Auth configuration, SSL settings, and cookie configuration</p>
          </div>
          <div>
            <h4 className="font-medium text-red-600 mb-1">🚀 Complete Auth Flow Test</h4>
            <p>Tests full authentication flow with detailed error tracking for hex parsing issues</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-600 mb-1">📊 Session Token Analysis</h4>
            <p>Examines session cookies and token parsing in production environment</p>
          </div>
          <div>
            <h4 className="font-medium text-green-600 mb-1">⚡ Direct Auth API Test</h4>
            <p>Tests Better Auth API calls directly to isolate authentication logic</p>
          </div>
          <div>
            <h4 className="font-medium text-yellow-600 mb-1">🧪 Raw API Test</h4>
            <p>Direct auth.api.signInEmail call with detailed error logging to isolate the hex parsing issue</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p><strong>Test Credentials:</strong> testcoach@ultracoach.dev / password123</p>
          <p><strong>Goal:</strong> Identify and fix &quot;hex string expected, got undefined&quot; error in production</p>
          <p><strong>Status:</strong> Post-configuration cleanup with simplified handlers and production-optimized settings</p>
        </div>
      </div>
    </div>
  )
}