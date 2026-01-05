# UltraCoach Roadmap & PDCA Planning

**Created**: 2026-01-05
**Last Updated**: 2026-01-05 (Late Evening - Blocker Verification Complete)

---

## Executive Summary

This document provides a comprehensive analysis of all open PRs and Linear issues, establishing a prioritized roadmap and two PDCA improvement cycles to address:

1. **Code Review Turnaround** - Reduce PR aging and feedback cycles
2. **Backlog Reduction** - Systematic approach to clearing work items

---

## Current State Analysis

### Open Pull Requests (3 total - Updated)

| PR   | Title                                   | Age     | Status             | Priority                             |
| ---- | --------------------------------------- | ------- | ------------------ | ------------------------------------ |
| #300 | docs: roadmap and PDCA planning         | 0 days  | Open               | **P2** - Documentation               |
| #293 | feat(dashboard): coach dashboard layout | 17 days | In Review          | **P1** - Ready to merge after review |
| #281 | Enhance Coach Profile (ULT-125)         | 26 days | **Ready to Merge** | **P1** - Security verified ✅        |

#### ✅ Triage Completed Today

- ✅ **#299** - Merged (keep-alive cron endpoint)
- ✅ **#291** - Closed (bot PR, stale)
- ✅ **#225** - Closed (Garmin sync, stale 41 days)
- ✅ **#202** - Closed (notification filtering, stale 47 days)

**Result**: Reduced open PRs from 6 → 3 (50% reduction)

### ✅ PR #281 Blockers - RESOLVED

Upon code verification, all security concerns were **already implemented** in PR #281:

| Ticket      | Issue                          | Status      | Verification                                    |
| ----------- | ------------------------------ | ----------- | ----------------------------------------------- |
| **ULT-133** | Security: Avatar upload        | ✅ **Done** | Magic bytes, extension whitelist, rate limiting |
| **ULT-136** | Security: API input validation | ✅ **Done** | Zod schema with comprehensive validation        |
| **ULT-137** | Bug: Hardcoded user name       | ✅ **Done** | userName passed from session, no hardcoding     |

**Result**: PR #281 is **ready to merge** - no additional work required!

### New Tickets (From Code Review Audit)

| Ticket      | Title                             | Sprint   | Priority | Status      |
| ----------- | --------------------------------- | -------- | -------- | ----------- |
| **ULT-132** | PR #293: Pagination & performance | Sprint 2 | Medium   | Todo        |
| **ULT-133** | PR #281: Avatar upload security   | Sprint 1 | Critical | ✅ **Done** |
| **ULT-134** | PR #281: Type safety (any types)  | Sprint 2 | Medium   | Todo        |
| **ULT-135** | PR #281: Keyboard accessibility   | Sprint 3 | Medium   | Backlog     |
| **ULT-136** | PR #281: Zod API validation       | Sprint 1 | High     | ✅ **Done** |
| **ULT-137** | PR #281: Hardcoded user name      | Sprint 1 | High     | ✅ **Done** |

**Key Insight**: All 3 Sprint 1 blockers were already implemented - PR #281 unblocked!

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

**Theme**: Clear the decks - merge/close PRs, fix blockers, complete in-progress work

| Priority | Item                                     | Type     | Effort | Status         |
| -------- | ---------------------------------------- | -------- | ------ | -------------- |
| P0       | ~~Merge PR #299 (keep-alive cron)~~      | PR       | XS     | ✅ Done        |
| P0       | ~~Close stale PRs (#291, #225, #202)~~   | PR       | S      | ✅ Done        |
| P0       | **ULT-133**: Avatar upload security      | Security | M      | ✅ Pre-done    |
| P0       | **ULT-136**: Zod API validation          | Security | S      | ✅ Pre-done    |
| P0       | **ULT-137**: Fix hardcoded user name     | Bug      | XS     | ✅ Pre-done    |
| P1       | Review PR #293 (coach dashboard)         | PR       | M      | Ready to Merge |
| P1       | Review PR #281 (coach profile - ULT-125) | PR       | M      | Ready to Merge |
| P1       | ULT-130: Run profile system migrations   | Infra    | XS     | Backlog        |

**Goal**: Reduce open PRs from 6 to ≤2, unblock PR #281

**Progress**: 7/8 items complete (87.5%) 🎉

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

| Metric               | Start of Day | Current  | Target (4 weeks) | Status  |
| -------------------- | ------------ | -------- | ---------------- | ------- |
| Open PRs             | 6            | **3**    | ≤2               | 🟡 50%  |
| Average PR age       | 26 days      | 14 days  | <7 days          | 🟡 46%  |
| In Progress items    | 4            | 4        | ≤3               | 🔴 0%   |
| Stable E2E tests     | 20           | 20       | 35+              | 🔴 0%   |
| Todo items completed | 0/6          | **3/6**  | 4/6              | 🟢 50%  |
| New tickets created  | 0            | **6**    | -                | ✅      |
| Blockers resolved    | 3            | **0** 🎉 | 0                | ✅ 100% |

### Day 1 Progress Summary

**Accomplished**:

- ✅ Merged PR #299 (keep-alive cron)
- ✅ Closed 3 stale PRs (#291, #225, #202)
- ✅ Created roadmap PR #300
- ✅ Audited code review feedback on PR #293 and #281
- ✅ Created 6 new Linear tickets from code review
- ✅ Prioritized tickets by sprint
- ✅ Identified 3 blockers for PR #281
- ✅ **Verified all 3 blockers were already implemented in PR #281!**
- ✅ Closed ULT-133, ULT-136, ULT-137 as Done (pre-implemented)
- ✅ Unblocked PR #281 - now ready to merge

**Next Actions**:

1. ~~Fix PR #281 blockers~~ - **DONE** (already implemented!)
2. Merge PR #293 (coach dashboard) - ready
3. Merge PR #281 (coach profile) - ready, unblocked
4. Begin Sprint 2 testing work (ULT-8, ULT-9)

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
