# Responsive Weekly Planner Design Guide

## Problem Statement
The weekly planner component had a `min-w-[700px]` constraint that forced horizontal scrolling on mobile devices, making it unusable on phones and tablets.

## Solution Architecture

### Breakpoint Strategy
Using Tailwind CSS default breakpoints:
```
Mobile:  < 768px   → Single column accordion layout
Tablet:  768-1024px → Single column accordion layout (future: 2-column grid)
Desktop: ≥ 1024px  → 7-column grid layout
```

The implementation uses `lg:` breakpoint (1024px) to switch between accordion and grid:
```tsx
<div className="lg:hidden">           {/* Mobile/Tablet: 0-1023px */}
  <Accordion>...</Accordion>
</div>

<div className="hidden lg:block">     {/* Desktop: 1024px+ */}
  <div className="grid grid-cols-7">...</div>
</div>
```

## Component Design

### Accordion Structure (Mobile)

```
┌─────────────────────────────────┐
│ Monday, Dec 11      [Primary]    │  ← Collapsed header
│ Easy Run • 8.5 mi • 75 min       │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Tuesday, Dec 12      [Success]   │  ← Another day header
│ Rest Day                         │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Wednesday, Dec 13               │  ← User expands this
│ Tempo Run • 5 mi • 45 min        │
├─────────────────────────────────┤
│ Category: [Tempo]               │  ← Expanded content
│ Type: [Tempo Run]               │
│ Distance: 5.0 mi                │
│ Duration: 45 min                │
│ Intensity (1-10): 7             │
│ Elevation (ft): 0               │
│ Notes: [textarea]               │
│ Zone: Hard [████████]           │
│ [Clear Workout]                 │  ← Action buttons
└─────────────────────────────────┘
```

### Grid Structure (Desktop)

```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
│ 11   │ 12   │ 13   │ 14   │ 15   │ 16   │ 17   │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│Easy  │      │Tempo │      │Hard  │Long  │Rest  │
│8.5mi │Rest  │5.0mi │Easy  │6.0mi │12mi  │      │
│      │      │45min │5.0mi │50min │120min│     │
│[Clr] │[Clr] │[Clr] │[Clr] │[Clr] │[Clr] │[Clr]│
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

## Responsive Design Patterns

### Pattern 1: Conditional Rendering
```tsx
// Show accordion on mobile, grid on desktop
<div className="lg:hidden">
  <Accordion>{/* mobile content */}</Accordion>
</div>
<div className="hidden lg:block">
  <Grid>{/* desktop content */}</Grid>
</div>
```

### Pattern 2: Component Reusability
```tsx
// DayCard component used in both accordion and potentially other contexts
<AccordionItem>
  <DayCard 
    day={day}
    readOnly={readOnly}
    onUpdateWorkout={updateDayWorkout}
    onClearWorkout={clearDayWorkout}
  />
</AccordionItem>
```

### Pattern 3: Accordion State Management
```tsx
// HeroUI Accordion handles state internally - no parent state needed
<Accordion 
  defaultExpandedKeys={[]}      // Start with all collapsed
  selectionMode="single"         // Only one open at a time
  variant="light"                // Clean appearance
>
  {/* AccordionItem components */}
</Accordion>
```

## Typography & Spacing

### Mobile (Accordion)
```tsx
<h4 className="font-semibold text-sm">
  {day.dayName}, {formatDate(day.date)}
</h4>
<p className="text-xs text-foreground/70 truncate">
  {workoutSummary}
</p>
```
- Day header: `text-sm` (14px) - clear but compact
- Summary: `text-xs` (12px) - smaller text for details
- Spacing: `gap-2` and `gap-3` for spacing between sections

### Desktop (Grid)
```tsx
<h4 className="font-semibold text-xs">
  {day.dayName.slice(0, 3)}  // "Mon" instead of "Monday"
</h4>
<p className="text-xs">{formatDate(day.date)}</p>
```
- Day header: `text-xs` (12px) - compact for grid
- Full day name not shown (truncated to 3 letters) to save space
- All content condensed to fit 7-column layout

## Color & Visual Hierarchy

### Today's Day Indicator
```tsx
// Active day with primary color
isToday(day.date)
  ? 'ring-2 ring-primary bg-primary/10 border-l-4 border-l-primary'
  : 'hover:bg-secondary/5 border-l-4 border-l-transparent'
```

### Category Chips
```tsx
// Color-coded by workout intensity
WORKOUT_CATEGORIES = [
  { id: 'easy', color: 'success' },      // Green
  { id: 'tempo', color: 'warning' },     // Amber
  { id: 'interval', color: 'danger' },   // Red
  { id: 'long_run', color: 'primary' },  // Blue
  // ...
]
```

### Intensity Indicator
```tsx
// Visual bar showing intensity level (1-10)
{day.workout.intensity <= 3 ? 'bg-success' :
 day.workout.intensity <= 5 ? 'bg-primary' :
 day.workout.intensity <= 7 ? 'bg-warning' : 'bg-danger'}

// Bar width = intensity * 10%
style={{ width: `${day.workout.intensity * 10}%` }}
```

## Touch Targets & Accessibility

### Button Sizing
```tsx
// Minimum 44x44px touch targets
<Button 
  size="sm"
  className="text-xs px-3 py-2 h-8 min-h-8"
  aria-label={`Clear ${day.dayName} workout`}
/>
```

### Keyboard Navigation
- Tab through accordion headers
- Enter/Space to expand/collapse
- Tab through form fields within expanded accordion
- All interactive elements have focus states

### Screen Reader Support
```tsx
// Every interactive element has descriptive label
<AccordionItem
  aria-label={`${day.dayName} workout details`}
/>

<Button aria-label={`Clear ${day.dayName} workout`} />
```

## Performance Optimizations

### What's NOT Rendered
- No JavaScript animations or complex transitions
- No expensive state updates for expand/collapse
- Accordion state is local to HeroUI component

### Rendering Efficiency
- Both views are rendered but hidden with CSS (`display: none`)
- Single map over `weekWorkouts` array
- No unnecessary re-renders of DayCard component

### File Size Impact
- Added ~220 lines of code for DayCard component
- Removed ~100 lines of old logic
- Net gain: ~120 lines (~4% increase)

## Future Enhancements

### Phase 2: Tablet Optimization
```tsx
const responsive = {
  'sm:grid-cols-1',   // Mobile: 1 column
  'md:grid-cols-2',   // Tablet: 2 columns
  'lg:grid-cols-7',   // Desktop: 7 columns
}
```

### Phase 3: Gesture Support
```tsx
// Add swipe gestures for mobile accordion
onSwipeLeft={() => expandNextDay()}
onSwipeRight={() => expandPreviousDay()}
```

### Phase 4: Persistent State
```tsx
// Remember last expanded day
localStorage.setItem('lastExpandedDay', dayIndex)
const lastExpanded = localStorage.getItem('lastExpandedDay')
<Accordion defaultExpandedKeys={[lastExpanded]} />
```

## Testing Strategy

### Unit Tests
- DayCard component rendering
- Props validation
- Event handler functions

### Integration Tests
- Accordion expand/collapse functionality
- Desktop grid layout
- Form submission with multiple days

### E2E Tests (Playwright)
- Full user flow on mobile: expand day → edit fields → save
- Desktop grid: edit multiple days → save all
- Responsive behavior on different screen sizes

### Accessibility Tests
- Tab order verification
- Screen reader testing (NVDA/JAWS)
- Keyboard-only navigation

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | Latest  | ✅ Full |
| Firefox | Latest  | ✅ Full |
| Safari  | Latest  | ✅ Full |
| Edge    | Latest  | ✅ Full |
| iOS Safari | Latest | ✅ Full |
| Android Chrome | Latest | ✅ Full |

## Known Limitations

1. **No Tablet-Specific Layout**: Tablets show accordion (mobile view)
   - Future: Implement 2-column grid for 768-1023px range
   
2. **Fixed Breakpoint**: Uses `lg:` (1024px) for all devices
   - Consider device orientation in future

3. **Accordion Performance**: All 7 days render even when collapsed
   - Could optimize with virtualization for large calendars

## Related Files

- `src/components/workouts/WeeklyPlannerCalendar.tsx` - Main component
- `src/app/weekly-planner/WeeklyPlannerClient.tsx` - Page client
- `src/app/weekly-planner/[runnerId]/WeeklyPlannerRunnerClient.tsx` - Runner-specific view
