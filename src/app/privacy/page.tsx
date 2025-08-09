import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - UltraCoach',
  description: 'Learn how UltraCoach protects your privacy and handles your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Privacy Policy</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-slate-600 mb-8">
            <strong>Last updated:</strong> August 2025
          </p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Privacy Matters</h2>
            <p className="text-slate-600 mb-6">
              At UltraCoach, we take your privacy seriously. This policy explains how we collect,
              use, and protect your personal information when you use our platform.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Information We Collect</h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Account information (email, name, role)</li>
              <li>Training data (workouts, plans, progress)</li>
              <li>Communication data (messages between coaches and athletes)</li>
              <li>Usage analytics (how you interact with our platform)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Provide and improve our coaching platform</li>
              <li>Enable communication between coaches and athletes</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Send important updates about your account or our service</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Data Security</h2>
            <p className="text-slate-600 mb-6">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Encrypted data transmission and storage</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and monitoring</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Rights</h2>
            <p className="text-slate-600 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Export your training data</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Contact Us</h2>
            <p className="text-slate-600">
              If you have questions about this privacy policy or how we handle your data, please
              contact us at privacy@ultracoach.dev.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
