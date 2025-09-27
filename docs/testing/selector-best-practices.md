# Selector Best Practices (Playwright)

Use stable, intention-revealing selectors to minimize flakiness.

- Prefer data-testid attributes for app surfaces under test.
  - Add `data-testid` at stable container boundaries, not on ephemeral children.
  - Add semantic attributes too (e.g., `data-status`, `aria-*`) when useful for assertions.
- Prefer role-based selectors when they are unique and stable: `getByRole('button', { name: 'Save' })`.
- Avoid brittle text-only selectors and wide CSS queries with `:has-text()`.
- For interactions, use `locator.waitFor({ state: 'visible' })` before `click()` or use `clickWhenReady(locator)` from `tests/utils/wait-helpers`.
- Keep selectors co-located with components in code comments when adding new test ids.

Examples

```tsx
// Good: explicit id and state
<Card data-testid="training-plan-card" data-status={plan.archived ? 'archived' : 'active'}>

// Good: role + name
await page.getByRole('button', { name: /Begin Your Expedition/i }).click()

// Better: helper wraps robust waits
await clickWhenReady(page.getByRole('button', { name: /Save/ }))
```
