# UltraCoach Roadmap & PDCA Planning

**Created**: 2026-01-05
**Last Updated**: 2026-01-05

---

## Executive Summary

This document provides a comprehensive analysis of all open PRs and Linear issues, establishing a prioritized roadmap and two PDCA improvement cycles to address:

1. **Code Review Turnaround** - Reduce PR aging and feedback cycles
2. **Backlog Reduction** - Systematic approach to clearing work items

---

## Current State Analysis

### Open Pull Requests (6 total)

| PR   | Title                                    | Age     | Status           | Priority                  |
| ---- | ---------------------------------------- | ------- | ---------------- | ------------------------- |
| #299 | feat(cron): keep-alive endpoint          | 0 days  | Ready for review | **P0** - Merge today      |
| #293 | feat(dashboard): coach dashboard layout  | 17 days | Stale            | **P1** - Review this week |
| #291 | fix(weekly-planner): standardize isToday | 25 days | Bot PR (CTO)     | **P2** - Evaluate/close   |
| #281 | Enhance Coach Profile (ULT-125)          | 26 days | Bot PR (Codegen) | **P1** - Review this week |
| #225 | Claude/garmin-sync-setup                 | 41 days | Stale            | **P3** - Evaluate/close   |
| #202 | feat(settings): notification filtering   | 47 days | Stale            | **P3** - Evaluate/close   |

**Key Insight**: 4 of 6 PRs are over 2 weeks old. Bot-generated PRs need human evaluation.

### Linear Issues by Status

| Status          | Count | Key Items                                                            |
| --------------- | ----- | -------------------------------------------------------------------- |
| **In Progress** | 4     | Garmin Integration (ULT-65, ULT-80, ULT-16), Coach Profile (ULT-125) |
| **Todo**        | 6     | Security Audit, Test Re-enablement, Workout Buttons, Docs            |
| **Backlog**     | 25+   | Billing (Flowglad), AI Coaching, Infrastructure improvements         |

### Active Projects

1. **Testing & Quality Assurance** (In Progress) - CI stabilization, test coverage
2. **Post-Refactor Critical Fixes** (In Progress) - Core functionality bugs
3. **Advanced Features & Integrations** (Planned) - Garmin, AI coaching
4. **Production Hardening & Security** (Planned) - Security audit, monitoring
5. **Flowglad Billing Integration** (Planned) - Payment processing
6. **Mobile UX Enhancements** (Backlog) - Mobile improvements

---

## PDCA Cycle 1: Code Review Turnaround

### PLAN

**Problem**: PRs are aging significantly (average 26 days for open PRs), causing:

- Merge conflicts accumulating
- Context loss for reviewers
- Blocked downstream work
- Developer frustration

**Current State (Baseline)**:

- 6 open PRs
- Average age: 26 days
- Oldest PR: 47 days (#202)
- 3 PRs over 25 days old

**Root Cause Analysis**:

1. No clear PR review SLA
2. Bot-generated PRs lack human oversight
3. Stale PRs not being closed/rebased
4. No automated reminders for aging PRs

**Hypothesis**: Implementing a PR triage process and weekly review cadence will reduce average PR age to <7 days.

**Success Criteria**:

- Average PR age < 7 days
- No PR older than 14 days
- All PRs reviewed within 48 hours of creation

### DO (Immediate Actions)

**Week 1 Actions**:

1. **Triage existing PRs today**:
   - [ ] Merge #299 (keep-alive cron) - ready
   - [ ] Review #293 (coach dashboard) - decide: merge/close/request changes
   - [ ] Review #281 (coach profile) - evaluate bot work quality
   - [ ] Close #291, #225, #202 if stale beyond recovery

2. **Establish PR hygiene rules**:
   - PRs > 14 days: Must be rebased or closed
   - Bot PRs: Require human review within 72 hours
   - Draft PRs: Auto-close after 30 days

3. **Set up tracking**:
   - Weekly PR age report (gh pr list with age calculation)
   - GitHub notification settings for timely review

### CHECK (After 2 weeks)

Measure:

- [ ] Number of open PRs
- [ ] Average PR age
- [ ] Time from PR creation to first review
- [ ] Time from PR creation to merge/close

### ACT

If successful:

- Document PR hygiene process in CONTRIBUTING.md
- Consider GitHub Actions for automated PR age alerts

If unsuccessful:

- Analyze which PRs are still aging
- Adjust SLAs or process

---

## PDCA Cycle 2: Backlog Reduction & Roadmap

### PLAN

**Problem**: Large backlog (25+ items) with unclear prioritization creates:

- Decision paralysis on what to work on next
- Critical items buried among nice-to-haves
- No clear path to production readiness

**Current State (Baseline)**:

- 4 items In Progress
- 6 items in Todo
- 25+ items in Backlog
- Multiple overlapping priorities

**Hypothesis**: Prioritizing work into 4-week sprints with clear goals will reduce backlog by 50% and ship key features.

**Success Criteria**:

- Clear 4-week roadmap established
- In Progress items reduced to max 3 at a time (WIP limit)
- 50% of Todo items completed in 4 weeks

### DO (Prioritized Roadmap)

#### Sprint 1: Foundation (Week 1-2)

**Theme**: Clear the decks - merge/close PRs, complete in-progress work

| Priority | Item                                      | Type  | Effort |
| -------- | ----------------------------------------- | ----- | ------ |
| P0       | Merge PR #299 (keep-alive cron)           | PR    | XS     |
| P0       | Review/close stale PRs (#291, #225, #202) | PR    | S      |
| P1       | Review PR #293 (coach dashboard)          | PR    | M      |
| P1       | Review PR #281 (coach profile - ULT-125)  | PR    | M      |
| P1       | ULT-130: Run profile system migrations    | Infra | XS     |

**Goal**: Reduce open PRs from 6 to ≤2

#### Sprint 2: Testing & Stability (Week 2-3)

**Theme**: Re-enable tests, improve CI reliability

| Priority | Item                                        | Effort |
| -------- | ------------------------------------------- | ------ |
| P1       | ULT-8: Re-enable messaging-flow.spec.ts     | M      |
| P1       | ULT-9: Re-enable workout-completion.spec.ts | M      |
| P2       | ULT-115: Update race-import test docs       | XS     |
| P2       | ULT-55: Jotai debug label conventions       | S      |

**Goal**: Increase stable test count from 20 to 35+

#### Sprint 3: Core Features (Week 3-4)

**Theme**: Complete user-facing functionality

| Priority | Item                                            | Effort |
| -------- | ----------------------------------------------- | ------ |
| P1       | ULT-13: Wire up Mark Complete/Log Details       | M      |
| P1       | ULT-125: Complete Coach Profile (if not merged) | L      |
| P2       | ULT-128: Beta invitation emails                 | S      |

**Goal**: Complete 3 user-facing features

#### Sprint 4: Security & Production (Week 4+)

**Theme**: Production hardening

| Priority | Item                                | Effort |
| -------- | ----------------------------------- | ------ |
| P1       | ULT-14: Complete Security Audit     | L      |
| P2       | ULT-96: CSP Violation Reporting     | S      |
| P2       | ULT-95: Redis Health Check Endpoint | S      |
| P3       | ULT-97: Rate Limiting Telemetry     | M      |

**Goal**: Pass security audit, implement monitoring

### Deferred/Backlog (Post-Sprint 4)

**Garmin Integration** (ULT-65, ULT-80, ULT-16):

- Complex, requires dedicated focus
- Defer until core platform is stable
- Estimated: 3-4 week dedicated sprint

**Flowglad Billing** (ULT-104-110):

- Block on beta user feedback (ULT-110)
- Defer until pricing model validated
- Estimated: 2 week sprint

**AI Coaching** (ULT-111-114):

- Research phase items
- Low priority, future roadmap
- Defer indefinitely

### CHECK (After 4 weeks)

Measure:

- [ ] Open PRs count
- [ ] In Progress items count
- [ ] Completed items count
- [ ] Test suite size (stable tests)
- [ ] User-facing features shipped

### ACT

If successful:

- Continue sprint cadence
- Start Garmin integration sprint

If unsuccessful:

- Analyze blockers
- Adjust WIP limits
- Consider scope reduction

---

## Immediate Actions (Today)

### PR Triage

```bash
# Merge ready PR
gh pr merge 299 --squash

# Review stale PRs
gh pr view 293  # Coach dashboard - 17 days
gh pr view 281  # Coach profile - 26 days

# Close very stale PRs (or request updates)
gh pr close 225 --comment "Closing stale PR. Please reopen with rebased branch if still needed."
gh pr close 202 --comment "Closing stale PR. Please reopen with rebased branch if still needed."
gh pr close 291 --comment "Closing bot-generated PR. Will address manually if needed."
```

### Linear Board Cleanup

1. Move ULT-125 to "In Review" (PR #281 exists)
2. Close/archive completed items
3. Add sprint labels to prioritized items

---

## Success Metrics Dashboard

| Metric               | Current | Target (4 weeks) |
| -------------------- | ------- | ---------------- |
| Open PRs             | 6       | ≤2               |
| Average PR age       | 26 days | <7 days          |
| In Progress items    | 4       | ≤3               |
| Stable E2E tests     | 20      | 35+              |
| Todo items completed | 0/6     | 4/6              |

---

## Appendix: Full Issue List

### High Priority (P1-P2)

- ULT-125: Enhance Coach Profile
- ULT-130: Run profile system migrations
- ULT-115: Update race-import test doc
- ULT-14: Complete Security Audit
- ULT-13: Wire up Mark Complete/Log Details
- ULT-8: Re-enable messaging tests
- ULT-9: Re-enable workout-completion tests
- ULT-131: Multi-Source Activity Deduplication

### Medium Priority (P3)

- ULT-55: Jotai debug label conventions
- ULT-128: Beta invitation emails
- ULT-96: CSP Violation Reporting
- ULT-97: Rate Limiting Telemetry
- ULT-98: PostHog Reverse Proxy
- ULT-95: Redis Health Check

### Low Priority / Deferred

- ULT-60: Audit loadable + Suspense patterns
- ULT-102: Type assertions cleanup
- ULT-99: Email template enhancement
- ULT-92-94: Admin route improvements
- ULT-104-110: Flowglad billing (blocked)
- ULT-111-114: AI coaching research

---

_This document will be updated as sprints progress._
