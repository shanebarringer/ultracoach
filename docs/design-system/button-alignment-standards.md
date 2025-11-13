# Button Alignment Standards - Mountain Peak Design System

## Overview

This document defines the standardized button alignment patterns used across
all UltraCoach pages. Consistent button placement improves usability, visual
consistency, and follows Mountain Peak design system principles.

## Standard Page Header Pattern

### Structure

```tsx
<Card className="mb-4 lg:mb-6 bg-content1 border-l-4 border-l-primary">
  <CardHeader>
    <div className="flex flex-col lg:flex-row lg:items-center
         justify-between w-full gap-4">
      {/* Left: Title and Description */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IconComponent className="w-6 lg:w-8 h-6 lg:h-8 text-primary
                                 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg lg:text-2xl font-bold text-foreground">
            Page Title
          </h1>
          <p className="text-foreground/70 text-xs lg:text-sm">
            Page description
          </p>
        </div>
      </div>

      {/* Right: Action Buttons - Right-aligned */}
      <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto
                     flex-shrink-0">
        <Button>Secondary Action</Button>
        <Button color="primary">Primary Action</Button>
      </div>
    </div>
  </CardHeader>
</Card>
```

### Key Classes Explained

#### Left Content Area

- `flex-1 min-w-0` - Allows content to grow and text to truncate properly
- `flex-shrink-0` on icon - Prevents icon from shrinking
- `min-w-0` on text container - Enables proper text truncation

#### Right Action Buttons

- `sm:ml-auto` - Auto-margin pushes buttons to the right on larger screens
- `flex-shrink-0` - Prevents button container from shrinking
- `flex-col sm:flex-row` - Stack vertically on mobile, horizontal on tablet+
- `gap-3` - Consistent spacing between buttons

### Responsive Behavior

#### Mobile (< 640px)

- Title and buttons stack vertically
- Buttons left-aligned and full-width if needed
- Maintains proper touch targets

#### Tablet (640px - 1024px)

- Buttons arranged horizontally
- Right-aligned using auto-margin
- Text truncates if needed

#### Desktop (> 1024px)

- Full horizontal layout
- Buttons firmly right-aligned
- Optimal spacing and proportions

## Examples Across Pages

### Training Plans Page

```tsx
// Header with checkbox filter and action buttons
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3
               sm:ml-auto flex-shrink-0">
  <Checkbox>Show archived</Checkbox>
  <Button variant="bordered" isIconOnly>
    <RefreshCw />
  </Button>
  <Button color="primary">Create Plan</Button>
</div>
```

### Races Page

```tsx
// Multiple action buttons with responsive text
<div className="flex flex-col sm:flex-row gap-3 sm:ml-auto flex-shrink-0">
  <Button color="secondary" variant="flat">
    <span className="hidden sm:inline">Import Races</span>
    <span className="sm:hidden">Import</span>
  </Button>
  <Button color="primary">
    <span className="hidden sm:inline">Add New Race</span>
    <span className="sm:hidden">Add Race</span>
  </Button>
</div>
```

### Weekly Planner Page

```tsx
// Simple right-aligned info badge
<div className="flex items-center gap-2 flex-shrink-0">
  <UsersIcon />
  <span>{count} Partners</span>
</div>
```

## Modal Action Buttons

### Standard Modal Footer Pattern

```tsx
<ModalFooter>
  <div className="flex justify-end gap-3 w-full">
    <Button variant="flat" onPress={onClose}>
      Cancel
    </Button>
    <Button color="primary" onPress={onSubmit}>
      Confirm
    </Button>
  </div>
</ModalFooter>
```

#### Key Points

- Use `justify-end` for right-alignment
- Cancel/secondary actions on the left
- Primary action on the right (last in visual flow)
- Consistent `gap-3` spacing

## Common Patterns

### Icon-Only Buttons

```tsx
<Button
  isIconOnly
  variant="bordered"
  size="sm"
  aria-label="Descriptive label"
  className="border-primary/20 hover:border-primary/40"
>
  <IconComponent className="h-4 w-4" />
</Button>
```

### Responsive Button Text

```tsx
<Button>
  <span className="hidden sm:inline">Full Text</span>
  <span className="sm:hidden">Short</span>
</Button>
```

### Button Groups

```tsx
<div className="flex items-center gap-3">
  <Button variant={mode === 'a' ? 'solid' : 'flat'}>
    Option A
  </Button>
  <Button variant={mode === 'b' ? 'solid' : 'flat'}>
    Option B
  </Button>
</div>
```

## Anti-Patterns to Avoid

### ❌ Don't: Center-align action buttons in headers

```tsx
// Bad - buttons not aligned consistently
<div className="flex items-center gap-3">
  <Button>Action</Button>
</div>
```

### ❌ Don't: Use absolute positioning

```tsx
// Bad - breaks responsive behavior
<Button className="absolute right-0">Action</Button>
```

### ❌ Don't: Mix alignment styles

```tsx
// Bad - inconsistent across pages
// Page A: justify-end
// Page B: ml-auto
// Page C: absolute positioning
```

### ✅ Do: Use standardized pattern

```tsx
// Good - consistent across all pages
<div className="flex flex-col sm:flex-row gap-3 sm:ml-auto flex-shrink-0">
  <Button>Action</Button>
</div>
```

## Accessibility Considerations

### Required Attributes

- `aria-label` on icon-only buttons
- Proper focus order (left to right)
- Sufficient color contrast
- Touch targets minimum 44x44px on mobile

### Focus Management

```tsx
<Button
  aria-label="Clear description of action"
  autoFocus={isFirstAction}
>
  Action
</Button>
```

## Testing Checklist

- [ ] Desktop (1920x1080): Buttons right-aligned
- [ ] Tablet (768x1024): Buttons right-aligned, text readable
- [ ] Mobile (375x667): Buttons stack properly, touch targets adequate
- [ ] Text truncation works when title is long
- [ ] Focus order is logical (left to right, top to bottom)
- [ ] Buttons don't overflow or get cut off
- [ ] Responsive text shows/hides at correct breakpoints

## Related Documentation

- Mountain Peak Design System overview
- HeroUI Button component documentation
- Responsive design breakpoints
- Accessibility guidelines

---

**Last Updated**: 2025-11-12

**Issue**: ULT-33

**Status**: ✅ Implemented across Training Plans, Races, and Weekly Planner
pages
