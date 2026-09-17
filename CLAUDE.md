# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

A **Playwright end-to-end test suite** for the **Agnos AI Screening Dashboard**, a hosted web app
used by hospital staff to review AI symptom-check records. There is no application source here —
this repository contains tests, test documentation and test reports only.

## System under test

| | |
|---|---|
| Dashboard / login | `https://dev.app.agnoshealth.com/ai_dashboard` |
| Sign up | `https://dev.app.agnoshealth.com/ai_dashboard/agnos/sign_up` |
| Record generator (consumer app, used to create AI records to test against) | `https://dev.app.agnoshealth.com` |
| Backend API | `https://dev.api.agnoshealth.com` |

Credentials and URLs live in `.env` (gitignored); `.env.example` is the committed template.
This is a **dev environment** — never point tests at a production Agnos host.

**Known blocker:** `POST /api/ai_dashboard/dashboard` currently returns HTTP 500 for every request,
so the dashboard never lists a record. See `docs/bug-reports.md` → BUG-001 before debugging any
test that depends on table data.

## Commands

```bash
npm test                  # all specs, all three browsers
npm run test:chromium     # single browser - fastest feedback
npm run test:headed       # watch it run
npm run test:ui           # interactive UI mode
npm run test:debug        # step debugger
npm run report            # open the HTML report
npm run codegen           # record a flow

npx playwright test tests/login.spec.ts   # one spec
npx playwright test -g "TC-LOGIN-01"      # one test by name
```

Passing `--reporter=...` on the CLI **overrides** the config's reporter list, which suppresses
`reports/results.json`. Run plain `npm test` when you need that file.

## Layout

```
tests/      auth.setup.ts + one spec per scenario area
pages/      Page Object Model - all locators live here
fixtures/   test-fixtures.ts injects page objects; exports the `anonymous` opt-out
utils/      test-data.ts (credentials, generators) and record-generator.ts
docs/       test-plan.md, app-map.md, bug-reports.md, screenshots/
reports/    test plan, test cases, execution results and defects as CSV
```

`docs/app-map.md` records the application's real locators, enum values, API contract and load
timings, captured by driving the live environment. **Read it before writing new locators** rather
than guessing at the markup.

## Conventions

- One spec file per scenario area: registration, login/logout, tab navigation, record search,
  filtering (triage / date / channel), record download.
- Prefer user-facing locators (`getByRole`, `getByLabel`, `getByPlaceholder`). Where the app
  exposes no accessible name, fall back to an id or positional locator **and comment why** — see
  `pages/LoginPage.ts` and `pages/SignUpPage.ts` for the existing precedent.
- Use web-first assertions (`await expect(locator).toBeVisible()`). **Never `waitForTimeout`.**
- Timeouts in `playwright.config.ts` are deliberately high: the SPA needs 25–30 s to become
  interactive on a cold load. Do not lower them to "fix" a flake.
- Authenticated flows inherit the storage state written by `tests/auth.setup.ts`. Specs that must
  start logged out use `test.use(anonymous)`.
- Tests hit a live shared environment: make them independent, tolerant of pre-existing data, and
  have them generate their own records via `utils/record-generator.ts` rather than assuming fixed
  rows exist.
- Tests assert **correct** behaviour even where the application is currently wrong. Such tests
  carry a `known-defect` annotation naming the bug, so the report explains the failure. Do not
  weaken an assertion to make a suite green — fix the app or leave the failure visible.

## Artefacts

`test-results/`, `playwright-report/` and `reports/results.json` are generated and gitignored.
The committed CSVs under `reports/` are maintained deliberately, not overwritten by a run.
