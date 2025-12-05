/**
 * Coach Onboarding Tour - Step Definitions
 *
 * A guided tour introducing coaches to key UltraCoach features.
 * Uses NextStep.js with page navigation for a multi-page tour experience.
 *
 * Tour Flow (13 Steps):
 * 1. Welcome (centered modal - no spotlight)
 * 2. Navigation Menu (hamburger button)
 * 3. Athletes section
 * 4. Connect athletes button
 * 5. Training plans section
 * 6. K-bar quick commands → /weekly-planner
 * 7. Weekly Planner Selection
 * 8. Weekly Workout Grid (modal) → /calendar
 * 9. Calendar view → /chat
 * 10. Chat/messaging → /dashboard/coach
 * 11. Notifications
 * 12. Theme toggle → /races
 * 13. Race management (final)
 */
import type { Tour } from 'nextstepjs'

export const coachOnboardingTour: Tour = {
  tour: 'coach-onboarding',
  steps: [
    // Step 1: Welcome - Centered modal (no selector = centered overlay)
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
      // No selector = centered modal overlay
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
    },
    // Step 2: Navigation Menu (NEW)
    {
      icon: '☰',
      title: 'Navigation Menu',
      content: (
        <>
          <p className="mb-2">
            Click the menu icon to open the navigation drawer. From there you can quickly access all
            areas of UltraCoach.
          </p>
          <p className="text-sm text-default-500">
            You can pin the drawer open for easier navigation.
          </p>
        </>
      ),
      selector: '[data-testid="nav-menu-button"]',
      side: 'bottom',
      pointerPadding: 10,
      showControls: true,
      showSkip: true,
    },
    // Step 3: Your Athletes
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
    // Step 4: Connect New Athletes
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
    // Step 5: Training Expeditions
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
    // Step 6: K-bar Quick Commands
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
    // Step 7: Weekly Planner Selection
    {
      icon: '📅',
      title: 'Weekly Planner',
      content: (
        <>
          <p className="mb-2">
            The weekly planner gives you a bird&apos;s-eye view of your athletes&apos; training
            week. Select an athlete to view and manage their training schedule.
          </p>
          <p className="text-sm text-default-500">
            Perfect for making real-time adjustments to training plans.
          </p>
        </>
      ),
      // No selector = centered modal overlay
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/dashboard/coach',
    },
    // Step 8: Weekly Workout Grid (NEW - modal overlay)
    {
      icon: '📊',
      title: 'Weekly Workout Grid',
      content: (
        <>
          <p className="mb-2">
            Once you select an athlete, you&apos;ll see their weekly training calendar with a 7-day
            grid. Here you can add, edit, and reschedule workouts for each day.
          </p>
          <p className="text-sm text-default-500">
            Drag and drop workouts to reschedule, or click any day to add new training sessions.
          </p>
        </>
      ),
      // body selector required for nextRoute navigation to work
      selector: 'body',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      nextRoute: '/calendar',
    },
    // Step 9: Training Calendar
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
      // body selector required for nextRoute/prevRoute navigation to work
      selector: 'body',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/weekly-planner',
      nextRoute: '/chat',
    },
    // Step 10: Chat/Messaging
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
      // body selector required for nextRoute/prevRoute navigation to work
      selector: 'body',
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      prevRoute: '/calendar',
      nextRoute: '/dashboard/coach',
    },
    // Step 11: Notifications
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
    // Step 12: Theme Toggle
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
      side: 'bottom',
      pointerPadding: 20,
      showControls: true,
      showSkip: true,
      nextRoute: '/races',
    },
    // Step 13: Race Management (Final)
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
