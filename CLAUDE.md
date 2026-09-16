# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

A **Playwright end-to-end test suite** built for the Agnos Health "Candidate Assignment — Software Tester" brief (see `Candidate Assignment Agnos - Software tester(1).md`). It is a test project only — there is no application source here. The system under test is the **Agnos AI Dashboard**, a hosted web app used by hospital staff to review AI symptom-check records.

Current state: fresh `npm init playwright@latest` scaffold. `tests/example.spec.ts` is the generated demo against `playwright.dev` and should be replaced by real Agnos dashboard specs.

## System under test

| | |
|---|---|
| Dashboard / login | `https://dev.app.agnoshealth.com/ai_dashboard` |
| Sign up | `https://dev.app.agnoshealth.com/ai_dashboard/agnos/sign_up` |
| Record generator (creates new AI records to test against) | `https://dev.app.agnoshealth.com` |

Shared test credentials are in the assignment markdown file. This is a **dev environment** — never point tests at a production Agnos host.

## Commands

```bash
npx playwright test                      # run all tests, all browsers
npx playwright test --project=chromium   # single browser
npx playwright test tests/login.spec.ts  # single file
npx playwright test --ui                 # interactive UI mode
npx playwright test --debug              # step debugger
npx playwright show-report               # open the HTML report
npx playwright codegen https://dev.app.agnoshealth.com/ai_dashboard  # record a flow
```

`package.json` has no `scripts` — invoke Playwright via `npx` directly.

## Configuration notes (`playwright.config.ts`)

- `testDir: ./tests`, `fullyParallel: true`, reporter `html`.
- Three projects enabled: chromium, firefox, webkit. Mobile and branded-browser projects are commented out.
- `baseURL` is **commented out**. Either uncomment it and use relative `page.goto('/...')`, or keep absolute URLs — do not mix styles within the suite.
- CI behaviour is env-driven: `CI=1` turns on `forbidOnly`, 2 retries, and single-worker runs.
- No `webServer` block — the target is a remote host, so nothing is started locally.

## Conventions for new tests

- One spec file per scenario area from the brief: registration, login/logout, tab navigation, record search, filtering (triage / date / channel), record download.
- Prefer user-facing locators (`getByRole`, `getByLabel`, `getByPlaceholder`) over CSS/XPath selectors.
- Use web-first assertions (`await expect(locator).toBeVisible()`) rather than manual waits or `waitForTimeout`.
- For flows needing an authenticated session, use Playwright's storage-state pattern — `.gitignore` already reserves `/playwright/.auth/` for the saved state file.
- Keep credentials and environment URLs out of spec bodies; the config already sketches a `dotenv` setup (commented at the top of `playwright.config.ts`) if secrets are needed.
- Tests hit a live shared dev environment: make them independent and tolerant of pre-existing data, and generate fresh records via the generator link rather than assuming fixed rows exist.

## Deliverables the assignment expects

Automated test scripts, a README with setup/run instructions, and a test report (manual + automated results, with screenshots for failures). Failure artefacts land in `test-results/` and `playwright-report/`, both gitignored.
