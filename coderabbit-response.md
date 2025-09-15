@coderabbitai

Thank you for the thorough review! I've addressed all the actionable issues:

## ✅ Fixed Issues

1. **Fixed the `refreshRacesAtom` bug** - Corrected the functional updater pattern to properly access current state
2. **Added aria-labels** - Already present on icon-only buttons (verified in code)
3. **Fixed filter type consistency** - Now using DISTANCE_TYPES and TERRAIN_TYPES constants throughout
4. **Added credentials to API calls** - All POST/PUT/DELETE requests now include `credentials: 'include'`
5. **Added min constraints** - All numeric inputs now have `min="0"` or appropriate constraints
6. **Fixed TypeScript errors** - Resolved Select component issues by using the `items` prop pattern

## 📝 Regarding the Suspense Pattern

We're intentionally using React's Suspense + ErrorBoundary pattern instead of Jotai's `loadable` utility. Here's why:

```typescript
// Our current implementation (CORRECT for our use case)
export default function RacesPageClient() {
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<RacesPageSkeleton />}>
          <RacesContent />  // Uses asyncRacesAtom
        </Suspense>
      </ErrorBoundary>
    </Layout>
  )
}
```

This pattern is preferred because:

1. **We already have Suspense + ErrorBoundary** - Loading state is handled by `<RacesPageSkeleton />`, errors by `ErrorBoundary`
2. **Cleaner component code** - The `RacesContent` component doesn't need to handle loading/error states
3. **Better separation of concerns** - Loading and error handling are at the boundary level
4. **Consistent architecture** - We use this pattern throughout the application

Per the Jotai documentation, `loadable` is primarily for cases where you want to **avoid** Suspense boundaries. Since we're embracing Suspense (the modern React pattern), adding `loadable` would be redundant and add unnecessary complexity.

Thanks again for the detailed review! The fixes have been committed and all tests are passing.
