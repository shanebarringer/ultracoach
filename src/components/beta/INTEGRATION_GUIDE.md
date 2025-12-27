# BetaIndicator Integration Guide

Step-by-step guide to add the beta indicator badge to UltraCoach's coach dashboard.

## Quick Start

### Option 1: Add to Header (Recommended)

Add the beta badge next to the UltraCoach logo in the main header for maximum visibility.

**File**: `/src/components/layout/Header.tsx`

```tsx
// Add import at the top
import BetaIndicator from '@/components/beta/BetaIndicator'

// Inside the Header component, add to NavbarBrand section:

;<NavbarBrand className="flex-grow-0">
  <Link href="/" className="flex items-center gap-2">
    <span className="text-xl">🏔️</span>
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="font-black text-lg text-foreground leading-tight">UltraCoach</span>
        {/* Add beta indicator here */}
        <BetaIndicator size="sm" />
      </div>
      <span className="text-xs text-muted font-medium hidden lg:block leading-none">
        Conquer Your Peaks
      </span>
    </div>
  </Link>
</NavbarBrand>
```

### Option 2: Coach Dashboard Only

Show the beta badge only on the coach dashboard for coach-specific beta features.

**File**: `/src/components/dashboard/CoachDashboard.tsx`

```tsx
// Add import at the top
import BetaIndicator from '@/components/beta/BetaIndicator'

// Inside the CoachDashboard component, add to header section:

;<div className="flex flex-col lg:flex-row justify-between gap-6">
  <div>
    <div className="flex items-center gap-3 mb-2">
      <h1 className="text-3xl font-bold text-foreground">Summit Dashboard</h1>
      <BetaIndicator
        tooltip="You're a founding coach! Your feedback shapes UltraCoach."
        feedbackContact="mailto:coaches@ultracoach.app?subject=Coach Beta Feedback"
      />
    </div>
    <p className="text-foreground-600 text-lg">Track your athletes' ascent to peak performance</p>
  </div>
  {/* ... rest of component */}
</div>
```

### Option 3: Conditional Display (Role-Based)

Show beta indicator only for coaches, not for runners.

```tsx
import BetaIndicator from '@/components/beta/BetaIndicator'
import { useSession } from '@/hooks/useBetterSession'

function Header() {
  const { data: session } = useSession()
  const isCoach = session?.user?.userType === 'coach'

  return (
    <Navbar>
      <NavbarBrand>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🏔️</span>
          <span className="font-black">UltraCoach</span>
          {isCoach && <BetaIndicator size="sm" />}
        </Link>
      </NavbarBrand>
    </Navbar>
  )
}
```

## Customization Examples

### Custom Feedback URL

```tsx
<BetaIndicator
  feedbackContact="https://forms.ultracoach.app/beta-feedback"
  tooltip="Thanks for being an early adopter!"
/>
```

### Different Sizes by Breakpoint

```tsx
<div className="hidden lg:block">
  <BetaIndicator size="md" />
</div>
<div className="block lg:hidden">
  <BetaIndicator size="sm" />
</div>
```

### No Feedback Link

```tsx
<BetaIndicator showFeedbackLink={false} tooltip="Beta feature - more improvements coming soon!" />
```

### Custom Styling

```tsx
<BetaIndicator className="ml-3 hidden sm:flex" size="sm" />
```

## Testing the Component

### Visual Testing with Demo Component

```tsx
// Add to any page temporarily for testing
import { BetaIndicatorDemo } from '@/components/beta/BetaIndicatorDemo'

function TestPage() {
  return (
    <div className="p-8">
      <BetaIndicatorDemo />
    </div>
  )
}
```

### Unit Test Example

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import BetaIndicator from '@/components/beta/BetaIndicator'

test('displays beta badge with tooltip', async () => {
  render(<BetaIndicator />)

  const badge = screen.getByText('BETA')
  expect(badge).toBeInTheDocument()

  // Hover to show tooltip
  await userEvent.hover(badge)
  expect(await screen.findByText(/beta program/i)).toBeInTheDocument()
})
```

## Accessibility Considerations

The BetaIndicator is fully accessible:

- ✅ Keyboard navigable via HeroUI Tooltip
- ✅ Screen reader compatible tooltip content
- ✅ WCAG AA color contrast (3.8:1 on light backgrounds)
- ✅ Proper ARIA labels for assistive technology
- ✅ 300ms tooltip delay prevents accidental triggers

## Performance Notes

- Component is memoized to prevent unnecessary re-renders
- Lightweight bundle size (~2KB including icons)
- No runtime dependencies beyond HeroUI and Lucide
- Tree-shakeable imports for optimal bundle size

## Design System Compliance

The BetaIndicator follows UltraCoach's Mountain Peak design system:

- **Colors**: Uses `secondary` and `primary` from HeroUI theme
- **Gradient**: Alpine blue gradient (`from-secondary/20 to-primary/20`)
- **Typography**: Semibold font weight for emphasis
- **Icons**: Lucide React `Sparkles` for premium feel
- **Border**: Subtle border with hover effects
- **Animation**: Smooth transitions on hover (200ms)

## FAQ

### Q: Should I show the beta badge on all pages?

**A**: Recommended to show in the header for consistent visibility, but only for authenticated coach users during the beta period.

### Q: Can I customize the badge color?

**A**: The component uses the theme's `secondary` and `primary` colors. To customize, override these in your Tailwind/HeroUI theme configuration.

### Q: How do I remove the sparkle icon?

**A**: Set `showIcon={false}` prop.

### Q: Can I change the "BETA" text?

**A**: Currently fixed to "BETA" for consistency. For different text, consider using the general `ComingSoonBadge` component with `variant="beta"`.

### Q: Will this affect mobile performance?

**A**: No - the component is extremely lightweight and uses lazy-loaded icons via Lucide React.

## Migration from ComingSoonBadge

If you're currently using `ComingSoonBadge` with `variant="beta"`:

```tsx
// Before
<ComingSoonBadge variant="beta" size="sm" />

// After (BetaIndicator has better styling and feedback integration)
<BetaIndicator size="sm" />
```

Both components work well together:

- Use `BetaIndicator` for overall platform beta status
- Use `ComingSoonBadge` for individual features in development

## Support

For issues or questions:

- GitHub Issues: https://github.com/ultracoach/ultracoach/issues
- Email: dev@ultracoach.app
- Slack: #frontend-components
