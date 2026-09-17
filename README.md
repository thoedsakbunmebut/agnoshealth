# Agnos AI Screening Dashboard — Playwright Test Suite

End-to-end test suite for the **Agnos AI Screening Dashboard**.

The dashboard is the hospital-staff side of Agnos AI: patients run a symptom check in the consumer
app, and the resulting records land here for staff to review, follow up and export. This repository
covers registration, authentication, navigation, record search, filtering and CSV export.

> ⚠️ **Current environment status.** The record-listing endpoint
> `POST /api/ai_dashboard/dashboard` is returning **HTTP 500 on every request**, so the dashboard
> can never display a record. Four of the six required scenarios cannot be verified end to end
> until it is fixed. See [`docs/bug-reports.md`](docs/bug-reports.md) → BUG-001.

## Prerequisites

- **Node.js 20 or newer** (developed on 22.13.1)
- npm 10 or newer

## Setup

```bash
git clone <this-repository>
cd test_agnoshealth

npm install
npx playwright install        # downloads the Chromium, Firefox and WebKit builds

cp .env.example .env          # then edit .env if you need different credentials
```

`.env` holds the target host and the test account. It is gitignored and must never be committed.

```ini
BASE_URL=https://dev.app.agnoshealth.com
API_URL=https://dev.api.agnoshealth.com
TEST_EMAIL=test@gmail.com
TEST_PASSWORD=12345
```

Always point `BASE_URL` at a dev host. These tests create accounts and generate patient records —
never run them against production.

## Running the tests

```bash
npm test                      # every spec, all three browsers
npm run test:chromium         # a single browser - fastest feedback
npm run test:headed           # watch it run
npm run test:ui               # Playwright's interactive UI mode
npm run test:debug            # step debugger

npx playwright test tests/login.spec.ts          # one spec file
npx playwright test -g "TC-LOGIN-01"             # one test by name

npm run report                # open the HTML report from the last run
```

Artefacts land in `playwright-report/` (HTML report), `test-results/` (screenshots, video, traces
for failures) and `reports/results.json` (machine-readable results). All are gitignored.

## Project structure

```
tests/
  auth.setup.ts          Signs in once per run and caches the session
  registration.spec.ts   TC-REG   - sign-up validation and the approval flow
  login.spec.ts          TC-LOGIN - authentication, session, logout
  navigation.spec.ts     TC-NAV   - tabs, triage chips, toolbar, table columns
  search.spec.ts         TC-SRCH  - record search, including injection-style input
  filter.spec.ts         TC-FLT   - triage, date range, channel and combinations
  download.spec.ts       TC-DL    - the CSV export flow

pages/                   Page Object Model - all locators live here
  BasePage.ts            Shared navigation and readiness handling
  LoginPage.ts  SignUpPage.ts  DashboardPage.ts

fixtures/
  test-fixtures.ts       Injects the page objects; exports the `anonymous` opt-out

utils/
  test-data.ts           Credentials, unique e-mail generator, password and search fixtures
  record-generator.ts    Drives the consumer app to mint a fresh AI record

docs/
  test-plan.md           Scope, approach, risks, entry/exit criteria
  app-map.md             Observed locators, enums, API contract and timings
  bug-reports.md         Defect reports with reproduction steps
  screenshots/           Evidence captured during manual execution

reports/                 Test plan, test cases, execution results and defects as CSV
```

## Design decisions

**Page Object Model.** Every locator lives in `pages/`. The dashboard's markup is CSS-in-JS with
generated class names, so a UI change would otherwise ripple through every spec.

**Storage state for authentication.** `tests/auth.setup.ts` signs in once and writes the session to
`playwright/.auth/user.json`; the browser projects depend on it. The SPA needs 25–30 s to become
interactive, so logging in per test would add minutes to every run. Specs that must start logged out
opt out with `test.use(anonymous)`.

**Generous, deliberate timeouts.** `playwright.config.ts` raises the test timeout to 180 s and
navigation to 120 s because the hosted SPA genuinely is that slow on a cold load. No spec contains
`waitForTimeout` — waits are on real elements and real responses.

**Locators.** User-facing locators (`getByRole`, `getByPlaceholder`, `getByText`) are used wherever
the markup allows. The login and sign-up inputs expose no accessible name and the two password
fields share one DOM id (BUG-006), so those page objects fall back to id and positional locators;
each fallback is commented with the reason.

**Fresh data, not fixed data.** The environment is shared and mutable. Registration tests generate a
unique e-mail per run, and `utils/record-generator.ts` creates a real diagnosis record through the
consumer app instead of assuming a row exists. The symptom questionnaire is AI-driven and branches
differently every run, so the generator answers generically rather than following a fixed path.

**Known defects are asserted, not accommodated.** Tests such as `TC-LOGIN-08` and `TC-DL-03` assert
the *correct* behaviour and therefore fail today. Each carries a `known-defect` annotation naming
the bug, so the HTML report explains the failure rather than leaving it a mystery. They will pass
once the defects are fixed — which is the point of a regression suite.

## Known limitations

- Search, filtering, pagination, record detail and download cannot be verified end to end while
  BUG-001 is open. Those tests currently pass vacuously (empty in, empty out) or fail outright;
  both outcomes are recorded honestly in `reports/04-execution-summary.csv`.
- `TC-SRCH-01` generates a record through the consumer app and takes several minutes. It is marked
  `test.slow()`.
- Newly registered accounts require manual approval, so no test signs in with an account it created.
- The date filter exposes presets only in this build, so an inverted custom range could not be tested.

## Reports

- **Test plan** — [`docs/test-plan.md`](docs/test-plan.md)
- **Defects** — [`docs/bug-reports.md`](docs/bug-reports.md)
- **Application map** — [`docs/app-map.md`](docs/app-map.md)
- **Test cases and results (CSV)** — [`reports/`](reports/)
