# BetaIndicator - Visual Preview

## Component Appearance

### Default Badge (Small)

```
┌─────────────────────┐
│ ✨ BETA            │  <- Sparkles icon + "BETA" text
└─────────────────────┘
  └─ Alpine blue gradient background with border
  └─ Hover effect: Enhanced shadow and border
```

### With Tooltip (on hover)

```
     ┌────────────────────────────────────────────┐
     │ You're part of our beta program!         │
     │ Your feedback helps shape UltraCoach.    │
     │                                           │
     │ 📧 Send feedback                          │  <- Clickable link
     └────────────────────────────────────────────┘
              ▼  <- Arrow pointing to badge
     ┌─────────────────────┐
     │ ✨ BETA            │
     └─────────────────────┘
```

## Color Scheme (Mountain Peak Design)

### Light Mode

- **Background**: Gradient from `secondary/20` (purple-blue) to `primary/20` (blue)
- **Border**: `secondary/40` (medium purple-blue)
- **Text**: Dark foreground (high contrast)
- **Icon**: Sparkles in theme foreground color

### Dark Mode

- **Background**: Same gradient (adapts to dark theme automatically)
- **Border**: `secondary/40` (slightly brighter in dark mode)
- **Text**: Light foreground (high contrast)
- **Icon**: Sparkles in theme foreground color

## Size Variants

### Small (default - recommended for headers)

```
┌──────────┐
│ ✨ BETA │  Height: ~24px, compact
└──────────┘
```

### Medium (for prominent placement)

```
┌─────────────┐
│  ✨ BETA   │  Height: ~32px, noticeable
└─────────────┘
```

### Large (for hero sections)

```
┌──────────────────┐
│   ✨ BETA       │  Height: ~40px, prominent
└──────────────────┘
```

## Usage Context Examples

### 1. In Header (Recommended)

```
┌────────────────────────────────────────────────────────┐
│ 🏔️ UltraCoach  ✨ BETA     [Search] [🔔] [👤]        │
└────────────────────────────────────────────────────────┘
```

### 2. In Coach Dashboard Title

```
┌────────────────────────────────────────────┐
│ Summit Dashboard  ✨ BETA                 │
│ Track your athletes' ascent to peak perf. │
└────────────────────────────────────────────┘
```

### 3. Role-Based Display (Coach only)

```
Coach View:
┌────────────────────────────┐
│ 🏔️ UltraCoach  ✨ BETA   │  <- Shows for coaches
└────────────────────────────┘

Runner View:
┌────────────────────────────┐
│ 🏔️ UltraCoach             │  <- Hidden for runners
└────────────────────────────┘
```

## Interactive States

### Default State

- Subtle gradient background
- Medium border opacity (40%)
- Sparkle icon visible

### Hover State

```
┌─────────────────────┐
│ ✨ BETA            │  <- Border becomes more prominent (60% opacity)
└─────────────────────┘  <- Shadow appears (md shadow)
     └─ Smooth 200ms transition
```

### Tooltip Active (after 300ms delay)

```
┌────────────────────────────────┐
│ You're part of our beta...    │  <- Tooltip appears below
└────────────────────────────────┘
         ▼
┌─────────────────────┐
│ ✨ BETA            │
└─────────────────────┘
```

## Accessibility Features

✅ **Keyboard Navigation**: Fully accessible via Tab key
✅ **Screen Readers**: Tooltip content is announced
✅ **Color Contrast**: WCAG AA compliant (3.8:1 minimum)
✅ **Focus Indicators**: Clear focus ring via HeroUI
✅ **Touch Targets**: Minimum 24px tap area (WCAG AAA)

## Technical Specs

- **Component Type**: Client Component (`'use client'`)
- **Performance**: Memoized to prevent re-renders
- **Bundle Size**: ~2KB (including icons)
- **Dependencies**: HeroUI Chip/Tooltip, Lucide icons
- **TypeScript**: Fully typed with interface
- **Styling**: Tailwind CSS with HeroUI theme

## Design System Compliance

### Mountain Peak Theme Alignment

- ✅ Uses HeroUI `secondary` and `primary` colors
- ✅ Alpine blue gradient aesthetic
- ✅ Lucide icons (consistent with app)
- ✅ Smooth transitions (200ms standard)
- ✅ Proper spacing and typography
- ✅ Border radius matches theme

### Brand Consistency

- **Feel**: Premium, professional, inviting
- **Message**: "You're part of something special"
- **CTA**: Encourages feedback participation
- **Visual**: Subtle but noticeable

## Responsive Behavior

### Mobile (< 640px)

```
┌──────────────────┐
│ 🏔️ UC  ✨ BETA │  <- Compact, still readable
└──────────────────┘
```

### Tablet (640px - 1024px)

```
┌──────────────────────────┐
│ 🏔️ UltraCoach  ✨ BETA │  <- Full display
└──────────────────────────┘
```

### Desktop (> 1024px)

```
┌─────────────────────────────────┐
│ 🏔️ UltraCoach  ✨ BETA        │  <- Optimal display
└─────────────────────────────────┘
```

## Animation Timeline

```
User hovers badge
    ↓
Wait 300ms (prevents accidental triggers)
    ↓
Tooltip fades in (HeroUI animation)
    ↓
Border color intensifies (200ms transition)
    ↓
Shadow appears (200ms transition)
    ↓
User clicks "Send feedback"
    ↓
Opens email client or feedback form
```

## Implementation Checklist

When adding to your page:

- [ ] Import BetaIndicator component
- [ ] Decide on placement (header vs dashboard)
- [ ] Choose appropriate size (sm for headers)
- [ ] Customize tooltip message (optional)
- [ ] Set feedback contact (email or URL)
- [ ] Test on mobile and desktop
- [ ] Verify tooltip appears on hover
- [ ] Check keyboard navigation works
- [ ] Confirm feedback link functions
- [ ] Test in both light and dark modes
