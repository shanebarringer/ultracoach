import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Coaches - UltraCoach',
  description: 'Browse and connect with professional ultramarathon coaches on UltraCoach.',
}

export default function CoachesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">
          Find Your Ultramarathon Coach
        </h1>

        <p className="text-xl text-slate-600 mb-12 text-center max-w-2xl mx-auto">
          Connect with experienced coaches who specialize in ultramarathon training. Find the
          perfect match for your goals and training style.
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Coming Soon</h2>
          <p className="text-slate-600 mb-6">
            We&apos;re building an amazing coach directory where you&apos;ll be able to:
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <div className="text-left">
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  Browse coach profiles and specialties
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  Read reviews from other runners
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  Filter by experience and race distances
                </li>
              </ul>
            </div>
            <div className="text-left">
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  View coaching philosophy and methods
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  Compare pricing and availability
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  Connect directly through the platform
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-600">
              In the meantime, you can sign up and browse the relationships page to connect with
              coaches who are already on the platform.
            </p>

            <div className="space-x-4">
              <a
                href="/auth/signup"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign Up as Runner
              </a>
              <a
                href="/relationships"
                className="inline-block border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Browse Relationships
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
