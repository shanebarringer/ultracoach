# Beta Indicator Component

A professional beta program badge for UltraCoach's Mountain Peak design system.

## Component: BetaIndicator

### Features

- **Distinctive Design**: Alpine blue gradient with sparkle icon
- **Informative Tooltip**: Explains beta program benefits
- **Feedback Integration**: Optional link to feedback email/form
- **Compact & Noticeable**: Perfect for header placement
- **Fully Accessible**: WCAG compliant with proper ARIA labels

### Basic Usage

```tsx
import BetaIndicator from '@/components/beta/BetaIndicator'

// Simple usage in header
function Header() {
  return (
    <nav>
      <div className="flex items-center gap-2">
        <h1>UltraCoach</h1>
        <BetaIndicator />
      </div>
    </nav>
  )
}
```

### Advanced Usage

```tsx
// Custom size and message
<BetaIndicator
  size="md"
  tooltip="Thanks for being an early adopter! Your feedback is invaluable."
  feedbackContact="https://forms.ultracoach.app/beta-feedback"
/>

// Without feedback link
<BetaIndicator showFeedbackLink={false} />

// Without icon
<BetaIndicator showIcon={false} size="sm" />

// Custom styling
<BetaIndicator className="ml-2" />
```

### Props

| Prop               | Type                   | Default                     | Description                   |
| ------------------ | ---------------------- | --------------------------- | ----------------------------- |
| `size`             | `'sm' \| 'md' \| 'lg'` | `'sm'`                      | Badge size                    |
| `tooltip`          | `string`               | Default message             | Custom tooltip text           |
| `showFeedbackLink` | `boolean`              | `true`                      | Show feedback link in tooltip |
| `feedbackContact`  | `string`               | `'feedback@ultracoach.app'` | Email or URL for feedback     |
| `className`        | `string`               | `''`                        | Additional CSS classes        |
| `showIcon`         | `boolean`              | `true`                      | Show sparkle icon             |

### Integration Example: Coach Dashboard

```tsx
// src/components/layout/Header.tsx
import BetaIndicator from '@/components/beta/BetaIndicator'

function Header() {
  const { user } = useSession()

  return (
    <Navbar>
      <div className="flex items-center gap-3">
        <NavbarBrand>
          <span>🏔️</span>
          <span className="font-black">UltraCoach</span>
          {user?.role === 'coach' && <BetaIndicator />}
        </NavbarBrand>
      </div>
    </Navbar>
  )
}
```

### Design System Integration

The BetaIndicator follows UltraCoach's Mountain Peak design system:

- **Colors**: Uses HeroUI's `secondary` and `primary` colors with alpine gradient
- **Icons**: Lucide React `Sparkles` icon for special feel
- **Typography**: Semibold font weight for emphasis
- **Animation**: Subtle hover effects and transitions
- **Spacing**: Compact sizing suitable for headers

### Accessibility

- Proper tooltip delay (300ms) for better UX
- Clear visual contrast with gradient border
- Screen reader compatible tooltip content
- Keyboard navigation support via HeroUI Tooltip
- WCAG AA compliant color contrast

### Performance

- Memoized with `React.memo` to prevent unnecessary re-renders
- Lightweight component with minimal dependencies
- Tree-shakeable imports from Lucide icons

---

## Component: BetaBanner

A professional beta announcement banner component for UltraCoach's pricing and landing pages, featuring the Mountain Peak design system with alpine aesthetics.

### Features

- **Mountain Peak Design System**: Alpine gradient background (blue → gold) with decorative mountain pattern overlay
- **Two Display Modes**: Default CTA buttons or email signup form
- **Fully Responsive**: Mobile-first design with optimized layouts for all screen sizes
- **HeroUI Integration**: Built with Card, Button, and Input components for consistency
- **TypeScript**: Full type safety with proper interfaces
- **Accessibility**: ARIA labels, semantic HTML, and keyboard navigation support
- **Professional UX**: Loading states, form validation, and smooth transitions

### Basic Usage (Default)

```tsx
import { BetaBanner } from '@/components/beta'

export default function PricingPage() {
  return (
    <div>
      <BetaBanner />
    </div>
  )
}
```

This displays the banner with two CTA buttons: "Get Started Free" and "Sign In".

### Email Signup Variant

```tsx
import { BetaBanner } from '@/components/beta'

export default function LandingPage() {
  const handleEmailSubmit = async (email: string) => {
    // Send email to your backend API
    await fetch('/api/beta-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  }

  return (
    <div>
      <BetaBanner showEmailSignup onEmailSubmit={handleEmailSubmit} />
    </div>
  )
}
```

### Custom Styling

```tsx
<BetaBanner className="mb-8 shadow-2xl" />
```

### Props

| Prop              | Type                                       | Default     | Description                                   |
| ----------------- | ------------------------------------------ | ----------- | --------------------------------------------- |
| `className`       | `string`                                   | `''`        | Additional CSS classes to apply to the banner |
| `showEmailSignup` | `boolean`                                  | `false`     | Show email input field instead of CTA buttons |
| `onEmailSubmit`   | `(email: string) => void \| Promise<void>` | `undefined` | Handler called when email is submitted        |

### Visual Design

**Color Palette:**

- Background Gradient: Alpine Blue (#0284c7) → Summit Gold (#d97706)
- Text: White with varying opacity for hierarchy
- Accent Badge: Summit Gold (#fbbf24) with dark text
- Feature Cards: White overlay with backdrop blur

**Layout Structure:**

```
┌─────────────────────────────────────────────────┐
│  [Icon]  [BETA ACCESS Badge]                   │
│                                                  │
│         Free During Beta (Heading)              │
│    Help us build the best ultramarathon...     │
│                                                  │
│       [Email Input]  [Join Beta Button]         │
│          or                                      │
│    [Get Started Free]  [Sign In]                │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Full    │ │   No     │ │  Shape   │        │
│  │  Access  │ │Commitment│ │  Future  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

### Implementation Details

**State Management:**

- Email input value tracking
- Form submission loading state
- Optimized re-renders with React.memo

**Error Handling:**

- Structured logging with `tslog`
- Email validation (empty check)
- Success/failure logging

**Performance:**

- Memoized with `React.memo`
- Minimal re-renders
- Can be lazy loaded below the fold

### Demo Page

Visit `/beta-banner-demo` to see both variants in action.

### Integration Example: Pricing Page

```tsx
// src/app/pricing/page.tsx
import { BetaBanner } from '@/components/beta'
import Layout from '@/components/layout/Layout'

export default function PricingPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Banner */}
        <BetaBanner className="mb-16" />

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8">{/* ... pricing content ... */}</div>
      </div>
    </Layout>
  )
}
```

### Accessibility Features

- Proper ARIA labels on form elements
- Semantic HTML structure (h2, p, form tags)
- Keyboard navigation support
- WCAG AA compliant color contrast
- Loading state announcements
- Error message accessibility

### Mountain Peak Design System Compliance

The BetaBanner follows all Mountain Peak guidelines:

1. **Alpine Colors**: Primary blue (#0284c7) and summit gold (#d97706) gradients
2. **Professional Typography**: Clear hierarchy with bold headings (3xl-5xl responsive)
3. **Subtle Depth**: Backdrop blur effects and layered overlays
4. **Responsive Spacing**: Mobile-first padding (py-8 → py-10 → lg:py-12)
5. **Accessible Contrast**: White text on gradient backgrounds with 4.5:1+ ratios

### Files

- `BetaBanner.tsx` - Main component implementation
- `index.ts` - Barrel export (combined with BetaIndicator)
- `README.md` - This documentation

### Related Components

- `BetaIndicator` - Small badge for headers
- `ComingSoonBadge` - Feature status indicator
- `Layout` - Standard page wrapper
- HeroUI components: `Card`, `Button`, `Input`
