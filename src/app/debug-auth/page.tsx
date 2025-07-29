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

  const testCookieAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/cookie-analysis?token=debug123')
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
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testSessionTokens}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Test Session Analysis (GET)
        </button>
        
        <button
          onClick={testDirectAuth}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Test Direct Auth API
        </button>
        
        <button
          onClick={testAuthHandler}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Test Auth Handler
        </button>
        
        <button
          onClick={testCookieAnalysis}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Test Cookie Analysis
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
        <h3 className="font-semibold mb-2">Test Details:</h3>
        <ul className="text-sm space-y-1">
          <li><strong>Email:</strong> testcoach@ultracoach.dev</li>
          <li><strong>Password:</strong> password123</li>
          <li><strong>Purpose:</strong> Debug why no Better Auth session cookie is being set</li>
          <li><strong>Expected:</strong> Should reveal authentication flow details and cookie setting</li>
        </ul>
      </div>
    </div>
  )
}