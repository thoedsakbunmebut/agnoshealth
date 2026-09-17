# Test Plan — Agnos AI Screening Dashboard

| | |
|---|---|
| Document | Test Plan v1.0 |
| System under test | Agnos AI Screening Dashboard (dev) |
| Date | 2026-09-16 |

## 1. Introduction

Agnos AI lets patients check their symptoms and receive a preliminary diagnosis. Those records
are surfaced to hospital staff in the AI Screening Dashboard, where staff follow up cases, monitor
statistics and contact patients when necessary.

This plan covers functional verification of the dashboard: registration, authentication,
navigation, record search, filtering and CSV export.

## 2. Objectives

1. Verify User registration 
2. Verify User login/logout
3. Verify Navigate through different tabs/pages of the website
4. Verify Search for an record
5. Filter records by triages , dates or channels
6. Download records
7. Identify defects that would affect patient follow-up, and report them with reproducible evidence.
8. Automated regression suite that can be re-run on every build.

## 3. Scope

### In scope
| Area | What is covered |
|---|---|
| User registration | Field validation, password policy, duplicate handling, approval flow |
| Login / logout | Valid and invalid credentials, empty fields, session persistence, session teardown |
| Navigation | Status tabs, triage chips, toolbar controls, table columns, pagination |
| Record search | Positive search, no-results, clearing, injection-style input |
| Filtering | Triage, date range, channel, and combinations |
| Download | Confirmation modal, CSV contents, filter-aware export |
| Cross-browser | Chromium, Firefox, WebKit |

### Out of scope
- The consumer symptom-check app, except as a tool to generate test records.
- Load, stress and performance testing.
- Penetration testing. Security issues are reported when they surface during functional testing
  (see BUG-002), but no dedicated security assessment was performed.
- Mobile and tablet layouts — the dashboard is a desktop staff tool.
- The AI diagnosis model's clinical accuracy.

## 4. Test environment

| Item | Value |
|---|---|
| Dashboard | `https://dev.app.agnoshealth.com/ai_dashboard` |
| Sign up | `https://dev.app.agnoshealth.com/ai_dashboard/agnos/sign_up` |
| Record generator | `https://dev.app.agnoshealth.com` |
| API | `https://dev.api.agnoshealth.com` |
| Account | `test@gmail.com` / `12345` (hospital `12345`) |
| Browsers | Chromium 153, Firefox, WebKit via Playwright 1.63.0 |
| OS | macOS 26.6 |
| Automation | Playwright Test, TypeScript, Node 22 |

This is a **shared dev environment**. Other people's data can appear and change at any time, so
tests are written to be independent, to create their own data, and never to assume a fixed row
exists. No test is ever pointed at a production Agnos host.

## 5. Test approach

**Manual testing** covers exploratory work, validation messages, visual defects, and anything
needing human judgement. Executed against Chromium with evidence captured for every failure.

**Automated testing** covers the regression-worthy paths in Playwright, using the Page Object
Model so that locator changes are absorbed in one place. Specs use user-facing locators wherever
the markup allows; where the application exposes no accessible name (see BUG-006), DOM ids are
used and the reason is documented in the page object.

**Data strategy.** Registration tests generate a unique e-mail per run. Search tests mint a fresh
diagnosis record through the consumer app rather than relying on existing rows.

## 6. Entry criteria

- The dev environment is reachable and the shared account can sign in.
- The record generator can produce a new AI record.
- Playwright and its browsers are installed.

## 7. Exit criteria

- Every designed test case has been executed and has a recorded result.
- Every failure has a defect report with reproduction steps and evidence.
- No Blocker or Critical defect is left unreported.
- The automated suite runs end to end and its results are published.

## 8. Defect classification

| Severity | Meaning |
|---|---|
| Blocker | A core feature cannot be used at all; testing of dependent areas cannot proceed |
| High | Major function broken or data/security at risk; no reasonable workaround |
| Medium | A function misbehaves but a workaround exists, or error handling misleads the user |
| Low | Cosmetic, copy, or minor inconsistency with no functional impact |

| Priority | Meaning |
|---|---|
| P1 | Fix before release |
| P2 | Fix in the current cycle |
| P3 | Fix when convenient |

## 9. Risks and assumptions

| Risk | Impact | Mitigation |
|---|---|---|
| **The record-listing API returns 500 for every request (BUG-001)** | Search, filter, pagination and download cannot be verified end to end | Reported as a Blocker; affected cases are recorded as Failed/Blocked with API evidence rather than silently skipped |
| The shared account has no records | Table-dependent assertions have nothing to act on | Tests generate their own records and tolerate empty results |
| Other testers mutate shared data mid-run | Flaky counts | Assertions check that visible rows satisfy the filter rather than pinning exact counts |
| The SPA needs 25–30 s to become interactive | Default timeouts fail spuriously | Timeouts raised deliberately in `playwright.config.ts`; no `waitForTimeout` in specs |
| New accounts require approval | A registered account cannot be used to log in | Registration tests stop at the confirmation message |

## 10. Deliverables

1. This test plan.
2. Manual and automation test cases (`reports/02-manual-test-cases.csv`, `reports/03-automation-test-cases.csv`).
3. Execution results (`reports/04-execution-summary.csv`).
4. Defect reports with screenshots (`docs/bug-reports.md`, `docs/screenshots/`).
5. The automated regression suite and its README.
