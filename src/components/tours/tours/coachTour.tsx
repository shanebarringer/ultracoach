/**
 * Coach Onboarding Tour - Step Definitions
 *
 * A guided tour introducing coaches to key UltraCoach features.
 * Uses NextStep.js with page navigation for a multi-page tour experience.
 *
 * Tour Flow:
 * 1. Dashboard overview
 * 2. Athletes section
 * 3. Connect athletes button
 * 4. Training plans section
 * 5. K-bar quick commands
 * 6. Weekly planner (navigates)
 * 7. Calendar view (navigates)
 * 8. Chat/messaging (navigates)
 * 9. Notifications
 * 10. Theme toggle
 * 11. Race management (navigates)
 */
import type { Tour } from 'nextstepjs'

export const coachOnboardingTour: Tour = {
  tour: 'coach-onboarding',
  steps: [
    {
      icon: '🏔️',
      title: 'Welcome to Summit Dashboard',
      content: (
        <>
          <p className="mb-2">
            Welcome to your coaching command center! This is where you&apos;ll manage your athletes,
            training plans, and monitor progress.
          </p>
          <p className="text-sm text-default-500">
            Let&apos;s take a quick tour of the key features.
          </p>
        </>
      ),
      selector: '[data-testid="coach-dashboard-content"]',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '👥',
      title: 'Your Athletes',
      content: (
        <>
          <p className="mb-2">
            This section shows all your connected athletes. You can see their recent activity,
            upcoming workouts, and current training status.
          </p>
          <p className="text-sm text-default-500">
            Click on an athlete to view their detailed training data.
          </p>
        </>
      ),
      selector: '[data-testid="runners-section"]',
      side: 'right',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🔗',
      title: 'Connect New Athletes',
      content: (
        <>
          <p className="mb-2">
            Use this button to find and connect with new athletes. You can also send email
            invitations to runners who aren&apos;t on the platform yet.
          </p>
          <p className="text-sm text-default-500">
            Invitations include a personalized message and auto-create their account.
          </p>
        </>
      ),
      selector: '[data-testid="connect-athletes-button"]',
      side: 'left',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '📋',
      title: 'Training Expeditions',
      content: (
        <>
          <p className="mb-2">
            Create and manage training plans here. Each plan can target specific races with proper
            periodization phases: Base, Build, Peak, Taper, and Recovery.
          </p>
          <p className="text-sm text-default-500">
            Assign plans to athletes to guide their training journey.
          </p>
        </>
      ),
      selector: '[data-testid="training-plans-section"]',
      side: 'right',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '⌨️',
      title: 'Quick Commands (K-bar)',
      content: (
        <>
          <p className="mb-2">
            Press <kbd className="px-2 py-1 bg-default-100 rounded text-sm font-mono">⌘K</kbd> or{' '}
            <kbd className="px-2 py-1 bg-default-100 rounded text-sm font-mono">Ctrl+K</kbd> to open
            the command palette for quick navigation.
          </p>
          <p className="text-sm text-default-500">
            Search for athletes, jump to pages, or create new items instantly.
          </p>
        </>
      ),
      selector: '[data-testid="kbar-search-button"]',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      nextRoute: '/weekly-planner',
    },
    {
      icon: '📅',
      title: 'Weekly Planner',
      content: (
        <>
          <p className="mb-2">
            The weekly planner gives you a bird&apos;s-eye view of your athletes&apos; training
            week. Quickly add, edit, or reschedule workouts using drag-and-drop.
          </p>
          <p className="text-sm text-default-500">
            Perfect for making real-time adjustments to training plans.
          </p>
        </>
      ),
      selector: '[data-testid="weekly-planner-selection"]',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/dashboard/coach',
      nextRoute: '/calendar',
    },
    {
      icon: '🗓️',
      title: 'Training Calendar',
      content: (
        <>
          <p className="mb-2">
            The calendar shows all scheduled workouts across all your athletes. Toggle between
            month, week, and day views to manage training load.
          </p>
          <p className="text-sm text-default-500">
            Click any workout to view details or make edits.
          </p>
        </>
      ),
      selector: '[data-testid="calendar-view"]',
      side: 'top', // 'top' places card visually below target - avoids top-of-viewport cutoff
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/weekly-planner',
      nextRoute: '/chat',
    },
    {
      icon: '💬',
      title: 'Athlete Communication',
      content: (
        <>
          <p className="mb-2">
            Stay connected with your athletes through real-time messaging. Discuss workouts, provide
            feedback, and share encouragement.
          </p>
          <p className="text-sm text-default-500">
            Messages can be linked to specific workouts for context.
          </p>
        </>
      ),
      selector: '[data-testid="chat-section"]',
      side: 'top', // 'top' places card visually below target - avoids top-of-viewport cutoff
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/calendar',
      nextRoute: '/dashboard/coach',
    },
    {
      icon: '🔔',
      title: 'Notifications',
      content: (
        <>
          <p className="mb-2">
            Get notified when athletes complete workouts, send messages, or when it&apos;s time for
            plan reviews.
          </p>
          <p className="text-sm text-default-500">Click the bell to view all your notifications.</p>
        </>
      ),
      selector: '[data-testid="notification-bell"]',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/chat',
    },
    {
      icon: '🌙',
      title: 'Theme Toggle',
      content: (
        <>
          <p className="mb-2">
            Switch between light and dark mode based on your preference. The alpine theme looks
            great in both modes!
          </p>
          <p className="text-sm text-default-500">
            Try it out - your choice is saved automatically.
          </p>
        </>
      ),
      selector: '[data-testid="theme-toggle"]',
      side: 'left', // Theme toggle is near right edge - 'left' prevents right overflow
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      nextRoute: '/races',
    },
    {
      icon: '🏁',
      title: 'Race Management',
      content: (
        <>
          <p className="mb-2">
            Finally, manage target races here. Import race data from GPX files or CSV, and link
            races to training plans for goal-focused periodization.
          </p>
          <p className="text-sm text-default-500 mt-2">
            🎉 <strong>Tour complete!</strong> You&apos;re ready to start coaching on UltraCoach.
          </p>
        </>
      ),
      selector: '[data-testid="import-races-modal-trigger"]',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: false, // No skip on last step
      prevRoute: '/dashboard/coach',
    },
  ],
}
