import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - UltraCoach',
  description: 'Read the terms and conditions for using UltraCoach.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Terms of Service</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-slate-600 mb-8">
            <strong>Last updated:</strong> August 2025
          </p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Acceptance of Terms</h2>
            <p className="text-slate-600 mb-6">
              By using UltraCoach, you agree to these terms of service. If you do not agree, please
              do not use our platform.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Use of Service</h2>
            <p className="text-slate-600 mb-4">UltraCoach provides:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Training plan management tools for coaches and athletes</li>
              <li>Communication platform for coaching relationships</li>
              <li>Workout tracking and progress monitoring</li>
              <li>Educational resources for ultramarathon training</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">User Responsibilities</h2>
            <p className="text-slate-600 mb-4">You agree to:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Provide accurate account information</li>
              <li>Use the platform only for its intended purposes</li>
              <li>Respect other users and maintain professional conduct</li>
              <li>Not share account credentials with others</li>
              <li>Comply with applicable laws and regulations</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Medical Disclaimer</h2>
            <p className="text-slate-600 mb-6">
              UltraCoach is not a medical service. All training advice should be considered general
              information only. Consult with medical professionals before beginning any training
              program, especially if you have health concerns.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Limitation of Liability</h2>
            <p className="text-slate-600 mb-6">
              UltraCoach is provided &quot;as is&quot; without warranties. We are not liable for any
              injuries, damages, or losses resulting from use of our platform or following training
              advice provided through our service.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Account Termination</h2>
            <p className="text-slate-600 mb-6">
              We reserve the right to terminate accounts that violate these terms or engage in
              harmful behavior. You may delete your account at any time through your account
              settings.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Contact Information</h2>
            <p className="text-slate-600">
              Questions about these terms? Contact us at legal@ultracoach.dev.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
