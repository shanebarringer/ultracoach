# Playwright Reliability Guide

This guide documents the reliability standards applied across the E2E suite.

## 1) Selector Strategy

- Prefer `data-testid` with optional semantic attributes like `data-status`.
- Keep role-based selectors where they are unique and stable.
- Avoid broad text queries.
- See `docs/testing/selector-best-practices.md`.

## 2) Wait Strategy

- Use `locator.waitFor({ state: 'visible' })` for readiness; use `clickWhenReady()` for interactions.
- Avoid `networkidle` for apps with websockets/polling.
- Use explicit loading-state checks (`waitUntilHidden()` for spinners, etc.).

## 3) Authentication Reliability

- Global auth setup uses direct API login and storageState per role.
- Pre-flight health checks hit `/api/health` and `/api/health/database` with retries.
- Target end-to-auth time: <5s in CI.

## 4) Test Data Management

- Prefer isolated, deterministic test data with unique identifiers.
- Use idempotent setup and cleanup via API routes or seeds when available.
- Avoid cross-test contamination by scoping mutations and using timestamps.

## 5) Error Reporting

- `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` in config.
- Reporter generates HTML report locally and dot + HTML on CI.
- Per-test annotations via `tests/utils/reporting.ts` add a `category` to failures.

## Mapping to Success Criteria

- Reliable selectors: added test ids and documentation.
- <5s auth setup: direct API auth + health checks.
- 90% flakiness reduction: robust waits, retry clicks, and deterministic data patterns.
- Clear error reporting: traces/screenshots/videos on failure, HTML report.
- Docs: this guide and selector best practices.
