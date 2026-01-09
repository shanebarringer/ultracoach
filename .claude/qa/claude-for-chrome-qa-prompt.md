# UltraCoach Production QA Session

**Role**: You are a Senior QA Engineer testing UltraCoach before coach onboarding.
**URL**: https://ultracoach.dev
**Goal**: Find bugs, UX issues, and edge cases in coach workflows.

---

## Test Accounts

| Role                 | Email                           | Password          | Notes                                                    |
| -------------------- | ------------------------------- | ----------------- | -------------------------------------------------------- |
| **Coach (Primary)**  | `emma@ultracoach.dev`           | `UltraCoach2025!` | Emma Mountain - Has training plans and connected runners |
| Coach                | `sarah.martinez@ultracoach.dev` | `UltraCoach2025!` | Sarah Martinez                                           |
| Coach                | `michael.chen@ultracoach.dev`   | `UltraCoach2025!` | Michael Chen                                             |
| **Runner (Primary)** | `alex.rivera@ultracoach.dev`    | `RunnerPass2025!` | Alex Rivera                                              |
| Runner               | `riley.parker@ultracoach.dev`   | `RunnerPass2025!` | Riley Parker                                             |
| Runner               | `morgan.davis@ultracoach.dev`   | `RunnerPass2025!` | Morgan Davis - Connected to Sarah Martinez               |

**Note**: Production was just seeded with 19 users, 3 training plans, 9 workouts, and sample conversations.

---

## Critical Workflows to Test

### 1. Authentication (Priority: Critical)

- [ ] Sign up as NEW coach (use a fresh email like `test-coach-[date]@example.com`)
- [ ] Verify redirect to coach dashboard
- [ ] Sign out and sign back in
- [ ] Test "forgot password" flow (check if email arrives)
- [ ] Test session persistence (close tab, reopen - should stay logged in)

### 2. Coach Dashboard (Priority: Critical)

- [ ] Verify "Your Athletes" section renders
- [ ] Check quick action buttons work:
  - [ ] "Manage Plans" button
  - [ ] "Weekly Overview" button
  - [ ] "Connect Athletes" button
- [ ] Test empty state (new account with no athletes)
- [ ] Navigate to all linked pages from dashboard

### 3. Coach-Runner Relationship (Priority: Critical)

- [ ] Navigate to `/relationships`
- [ ] Search for a runner to connect with
- [ ] Send connection request
- [ ] Verify pending status shows correctly
- [ ] **Switch to runner account**: Accept the request
- [ ] **Switch back to coach**: Verify relationship now shows as "Active"
- [ ] Test the relationship card actions

### 4. Training Plan Creation (Priority: High)

- [ ] Navigate to `/training-plans`
- [ ] Click "Create New Plan"
- [ ] Fill out all required fields:
  - [ ] Plan name
  - [ ] Description
  - [ ] Start/end dates
  - [ ] Race target selection
- [ ] Save and verify plan appears in the list
- [ ] Edit the plan (change name or dates)
- [ ] Assign plan to a connected runner
- [ ] Verify runner can see the assigned plan

### 5. Workout Management (Priority: High)

- [ ] Create new workout for a runner:
  - [ ] Set workout type (easy, tempo, interval, long_run)
  - [ ] Set intensity (1-10)
  - [ ] Set duration and distance
  - [ ] Add workout notes
- [ ] **As runner**: View assigned workout in `/workouts`
- [ ] **As runner**: Log workout completion with actual metrics
- [ ] **As coach**: Verify completion reflects on dashboard
- [ ] Test workout filtering and search

### 6. Messaging System (Priority: High)

- [ ] Navigate to `/chat`
- [ ] Start new conversation with connected runner
- [ ] Send a message
- [ ] Verify real-time delivery (check runner account)
- [ ] **As runner**: Reply to the message
- [ ] **As coach**: Verify reply appears without refresh
- [ ] Test message history persistence (refresh page)
- [ ] Check typing indicator works

### 7. Strava Integration (Priority: Medium)

- [ ] Navigate to settings or integrations page
- [ ] Click "Connect Strava" button
- [ ] Verify OAuth redirect works (goes to Strava authorization page)
- [ ] If you have a Strava account: Complete authorization
- [ ] Import activities from Strava
- [ ] Test activity-to-workout matching

### 8. Race Import (Priority: Medium)

- [ ] Navigate to race import (coach-only feature)
- [ ] Test GPX file upload:
  - [ ] Drag and drop a GPX file
  - [ ] Verify distance extraction (in miles)
  - [ ] Verify elevation gain extraction (in feet)
  - [ ] Check terrain type detection
- [ ] Test CSV bulk import:
  - [ ] Upload a CSV with multiple races
  - [ ] Verify preview shows correct data
  - [ ] Complete import and verify races appear

### 9. Calendar View (Priority: Medium)

- [ ] Navigate to `/calendar`
- [ ] Verify workouts display on correct dates
- [ ] Switch between week and month views
- [ ] Click on a workout to view details
- [ ] Navigate to previous/next week
- [ ] Test mobile view (resize browser)

### 10. Mobile Responsiveness (Priority: High)

Test all above flows with browser DevTools mobile viewport (iPhone/Android):

- [ ] Navigation drawer opens/closes properly
- [ ] Touch interactions work (buttons, forms, dropdowns)
- [ ] Forms are usable on mobile keyboard
- [ ] Calendar week view scrolls horizontally
- [ ] No horizontal overflow or cut-off content

---

## Bug Report Format

For each issue found, document using this format:

```markdown
**Issue**: [Brief description]
**Severity**: Critical | High | Medium | Low
**URL**: [Page where issue occurs]
**Steps to Reproduce**:

1. Go to...
2. Click...
3. Observe...
   **Expected**: [What should happen]
   **Actual**: [What actually happened]
   **Browser/Device**: [e.g., Chrome 120, iPhone 14 viewport]
   **Screenshot**: [Attach if helpful]
```

---

## Severity Definitions

| Severity     | Definition                                    | Examples                                         |
| ------------ | --------------------------------------------- | ------------------------------------------------ |
| **Critical** | Blocks core functionality or causes data loss | Can't sign in, workout data lost, security issue |
| **High**     | Major feature broken but workaround exists    | Can't create training plan, messaging fails      |
| **Medium**   | Feature partially works or confusing UX       | Filter doesn't work, unclear error message       |
| **Low**      | Minor visual or polish issues                 | Typo, slight misalignment, non-critical styling  |

---

## Edge Cases to Test

- [ ] Empty states on all pages (no data yet)
- [ ] Very long text inputs (plan names, messages)
- [ ] Special characters in inputs
- [ ] Rapid clicking/double submission
- [ ] Network interruption during form submission
- [ ] Back button navigation
- [ ] Direct URL access (deep linking)
- [ ] Multiple browser tabs open simultaneously

---

## Session Summary Template

After completing QA, summarize findings:

```markdown
## QA Session Summary - [Date]

**Tester**: Claude (Opus mode via Chrome)
**Duration**: [X hours]
**Environment**: Production (https://ultracoach.dev)

### Critical Issues (Blocking)

- [List any critical bugs]

### High Priority Issues

- [List high priority bugs]

### Medium Priority Issues

- [List medium priority bugs]

### Low Priority Issues

- [List low priority issues]

### Positive Observations

- [What worked well]

### Recommendations

- [Suggested improvements]
```

---

## Notes for Claude

1. **Be thorough but efficient** - Don't spend too long on working features
2. **Think like a real coach** - What would frustrate a coach trying to manage athletes?
3. **Test both happy paths and error cases** - What if things go wrong?
4. **Document everything** - Even small UX friction points
5. **Take screenshots** - Visual evidence helps developers fix issues faster
6. **Try realistic scenarios** - "Create a 12-week 50-mile training plan for a beginner runner"
