import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help & Support - UltraCoach',
  description: 'Find answers to frequently asked questions and get help with UltraCoach.',
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Help & Support</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-xl text-slate-600 mb-8 text-center">
            Find answers to common questions and get the help you need.
          </p>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Getting Started</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-700">
                    How do I create an account?
                  </h3>
                  <p className="text-slate-600">
                    Click the &quot;Sign Up&quot; button and choose whether you&apos;re a coach or
                    runner. Fill out your profile information to get started.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-700">
                    How do I connect with a coach or runner?
                  </h3>
                  <p className="text-slate-600">
                    Navigate to the &quot;Relationships&quot; page to browse available coaches or
                    runners. You can send connection requests and manage your relationships there.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Training Plans</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-700">
                    How do I create a training plan?
                  </h3>
                  <p className="text-slate-600">
                    Coaches can create training plans from the &quot;Training Plans&quot; page.
                    Select your target race and let our system help you build a periodized plan.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-700">
                    Can I modify my training plan?
                  </h3>
                  <p className="text-slate-600">
                    Yes! Coaches can adjust training plans at any time. Runners can communicate with
                    their coaches about needed modifications through the messaging system.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Need More Help?</h2>
              <p className="text-slate-600 mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <p className="text-slate-600">
                <strong>Email:</strong> support@ultracoach.dev
                <br />
                <strong>Response Time:</strong> Within 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
