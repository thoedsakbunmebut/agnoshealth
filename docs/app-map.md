# Agnos AI Dashboard — Application Map (recon notes)

Captured **2026-09-16** against the dev environment by driving a real Chromium session.
Every locator, enum value and behaviour below was observed, not assumed. Specs and test cases
read from this file rather than guessing at the UI.

## 1. Environments & endpoints

| Purpose | URL |
|---|---|
| Dashboard (SPA) | `https://dev.app.agnoshealth.com/ai_dashboard` |
| Login route | `https://dev.app.agnoshealth.com/ai_dashboard/login` |
| Sign up | `https://dev.app.agnoshealth.com/ai_dashboard/agnos/sign_up` |
| Record generator (consumer app) | `https://dev.app.agnoshealth.com` |
| Backend API | `https://dev.api.agnoshealth.com` |

### Backend calls used by the dashboard

| Endpoint | Method | Notes |
|---|---|---|
| `/api/ai_dashboard/login` | POST | Body `{"username": "<email>", "password": "<pw>"}` |
| `/api/ai_dashboard/sign_up` | POST | Returns 200 + tokens; account then awaits approval |
| `/api/ai_dashboard/dashboard` | POST | Record listing/search/filter. **Currently 500 for every request — see BUG-001** |
| `/api/token/refresh` | POST | JWT refresh; fires automatically on 401 |

Login response shape:

```json
{ "username": "ai_dashboard_test@gmail.com", "title": "นางสาว", "first_name": "Natt",
  "last_name": "Test", "hospital": "12345", "access_token": "...", "refresh_token": "..." }
```

The API prefixes `ai_dashboard_` to the submitted e-mail to form the stored username, and the
dashboard user is scoped to a hospital (`"12345"` for the shared test account).

### Record-listing request contract

`POST /api/ai_dashboard/dashboard`, auth header `Authorization: JWT <access_token>`:

```json
{ "triage": ["SELF_CARE","SEEK_MEDICAL","VISIT_PSYCO","VISIT_DEP_MENTAL_HEALTH",
             "VISIT_DOCTOR","URGENT","EMERGENCY"],
  "start_date": null, "end_date": null,
  "channel": ["agnos","vimut","vimut_telemed","siam_smile"],
  "page_size": 10, "page_number": 1, "search_text": "", "status": "COMPLETE" }
```

`status` takes `OPEN` / `IN_PROGRESS` / `COMPLETE`, matching the three UI tabs.

## 2. Login page (`/ai_dashboard/login`)

| Element | Locator | Notes |
|---|---|---|
| E-mail input | `#Email` | `type="email"`; **no `<label for>` / `aria-label`**, so `getByLabel('E-mail')` does not work |
| Password input | `#password` | `type="password"` |
| Password reveal toggle | `img[alt="password_visible"]` | |
| Sign in button | `getByRole('button', { name: 'Sign in' })` | **Disabled until both fields are non-empty** |

Behaviour:
- `/ai_dashboard` redirects to `/ai_dashboard/login` when unauthenticated, and the login card is
  rendered as an overlay **on top of a fully-rendered dashboard shell** (the sidebar, filters, table
  headers and "Total cases : 0" are all in the DOM before authentication).
- Successful login lands on `/ai_dashboard` and the sidebar shows the user's display name
  (`นางสาว Natt Test` for the shared account).
- The SPA takes **~25–30 s** to first paint on a cold load. Default 30 s Playwright timeouts are
  not enough — the config raises navigation/action timeouts accordingly.

## 3. Sign up page (`/ai_dashboard/agnos/sign_up`)

| Element | Locator | Notes |
|---|---|---|
| E-mail | `#Email` | `type="text"` here, but `type="email"` on login — inconsistent |
| Password | `input[type=password]` nth(0) | `id="password"` |
| Confirm Password | `input[type=password]` nth(1) | **also `id="password"` — duplicate DOM id** |
| Confirm button | `getByRole('button', { name: 'Confirm' })` | Disabled only while fields are empty |

Behaviour:
- Validation runs **on submit only** — no inline errors on blur or change.
- Password policy message: *"The password must be at least 8 characters long and include at least
  one uppercase letter, one digit, and one special character."*
- Mismatch message: *"Confirm password does not match the password."*
- On success the app shows *"Your account has been created"* / *"Please wait or account approval"*
  and redirects to `/ai_dashboard/login`. **A new account cannot log in until it is approved.**

Observed password-policy results (all other rules satisfied):

| Password | Result |
|---|---|
| `Passw0rd!` | rejected — policy error |
| `Password1!` | rejected — policy error |
| `Passw0rd@` | accepted, account created (HTTP 200) |

`!` is rejected while `@` is accepted, so the implemented special-character set is narrower than
the message states — see BUG-006.

## 4. Dashboard (`/ai_dashboard`)

### Sidebar
| Element | Locator |
|---|---|
| User display name | text, e.g. `นางสาว Natt Test` |
| Diagnosis List nav | `link` with `/url: /ai_dashboard` wrapping `button "home_icon Diagnosis List"` |
| Log Out | `getByRole('button', { name: /Log Out/ })` |

There is exactly **one** navigation destination. "Navigate through different tabs/pages" therefore
maps to the status tabs, the triage chips, pagination and the record detail view — not to a
multi-page menu.

### Toolbar
| Control | Locator | Values |
|---|---|---|
| Download | `getByRole('button', { name: /Download/ })` | opens a confirm modal, exports CSV |
| Date range | `text=Select date` | presets: Today, This week, This month, This year, Last week, Last 14 days, Last month, Last 60 days, Last 90 days, Last year |
| Channel | `getByRole('button', { name: /Channel/ })` | All, Agnos application, Vimut hospital, Vimut telemed, Siam smile |
| Search box | `getByPlaceholder('Patient name, Patient contact, Record ID, Record code')` | |
| Search button | `getByRole('button', { name: 'Search' })` | |
| Total counter | `text=/Total cases : \d+/` | |

### Status tabs
`Open` · `In progress` · `Completed` — plain `div`s with `cursor: pointer`, **not** `role="tab"`,
so `getByRole('tab')` does not work. The URL does **not** change when switching tabs, so tab state
is not deep-linkable or restorable by refresh/back.

### Triage filter chips
`All` · `Self care` · `Seek Medical` · `Urgent` · `Emergency` — rendered as checkboxes, all checked
by default. The API enum carries three further values the UI never exposes
(`VISIT_PSYCO`, `VISIT_DEP_MENTAL_HEALTH`, `VISIT_DOCTOR`).

### Records table
Columns: `Date-time` · `Name` · `Diagnosis` · `Channel`, plus `Completed by` on the Completed tab only.
Empty state renders the Thai string `ยังไม่มีข้อมูลการวินิจฉัย`.
Pagination shows `1 - 10` with page-number and prev/next controls.

### Download flow
Download → confirm modal titled `ยินยันการดาวน์โหลด` (sic) with `ยืนยัน` / `ยกเลิก`.
A success toast `Download CSV file successfully` exists in the DOM at `opacity: 0` until fired.
With zero records, confirming fires **no API request and produces no file** — see BUG-004.

## 5. Record generator (consumer app)

Flow observed end to end:

`/` → onboarding (`เข้าใช้งานแอพพลิเคชั่น`) → `/home` → `ตรวจโรคด้วยตัวเองโดยระบบ AI`
→ `/user_selection` (`ตัวเอง` / `คนอื่น`) → `/main` (pick symptoms, e.g. `คอแดง`, then `ต่อไป`)
→ `/question` (adaptive Q&A, 4 % → 100 %) → `/summary` (`เสร็จสิ้น`)
→ `/nurse-ai` (skippable via `ข้าม` → `ยืนยัน`) → `/results`

Interstitials that block the flow and must be dismissed defensively:
- a promo modal on `/home` (close via the `×` glyph)
- a "where did you hear about us" survey (`ไว้คราวหลัง`)
- a medical disclaimer on `/main` (`รับทราบ`)

The questionnaire is AI-driven and branches differently on each run, so the generator utility
answers **generically**: read every visible option button wider than 500 px below the header,
prefer a negative answer (`ไม่มีอาการใดในนี้` / `ไม่มี` / `ไม่ใช่` / `ไม่ทราบ ไม่แน่ใจ`),
otherwise take the last option, and click `ต่อไป` when the question is multi-select.
A run reached `/results` in 5 questions this way, producing `คอหอยอักเสบ` (pharyngitis, 40 %)
with a self-care triage.

**The generated record did not appear in the dashboard** — but the listing endpoint is returning 500
for every request, so that is currently unverifiable (see BUG-001). The generator account is also a
consumer account on channel `agnos`, while the dashboard user is scoped to hospital `12345`, so the
two may simply not be linked.
