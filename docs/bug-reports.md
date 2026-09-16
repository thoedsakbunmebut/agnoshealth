# Defect Report — Agnos AI Dashboard (dev)

Environment: `https://dev.app.agnoshealth.com/ai_dashboard`, API `https://dev.api.agnoshealth.com`
Browser: Chromium 153 (Playwright 1.63.0), macOS 26.6
Account: `test@gmail.com` (stored username `ai_dashboard_test@gmail.com`, hospital `12345`)
Date found: 2026-09-16

---

## BUG-001 — Record listing API returns HTTP 500 for every request (Blocker)

**Severity:** Blocker **Priority:** P1 **Status:** Open
**Area:** Dashboard / record listing

### Steps to reproduce
1. Log in to `https://dev.app.agnoshealth.com/ai_dashboard` as `test@gmail.com` / `12345`.
2. Open DevTools → Network, or run the API call directly.

```bash
TOKEN=$(curl -s -X POST https://dev.api.agnoshealth.com/api/ai_dashboard/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test@gmail.com","password":"12345"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -i -X POST https://dev.api.agnoshealth.com/api/ai_dashboard/dashboard \
  -H 'Content-Type: application/json' -H "Authorization: JWT $TOKEN" \
  -d '{"triage":["SELF_CARE","SEEK_MEDICAL","VISIT_PSYCO","VISIT_DEP_MENTAL_HEALTH","VISIT_DOCTOR","URGENT","EMERGENCY"],"start_date":null,"end_date":null,"channel":["agnos","vimut","vimut_telemed","siam_smile"],"page_size":10,"page_number":1,"search_text":"","status":"OPEN"}'
```

### Expected
`200 OK` with the record list (or `200` with an empty list if the account genuinely has no records).

### Actual
```
HTTP/1.1 500 Internal Server Error
{"error_message":"internal_server_error"}
```

Reproduced **every** time. Verified with:
- all three `status` values (`OPEN`, `IN_PROGRESS`, `COMPLETE`)
- a single channel, no channel key at all, and all four channels
- `start_date`/`end_date` null and set
- an **empty body `{}`** — which should return a 400 validation error, not a 500
- a freshly issued token, and three consecutive retries 20 minutes apart

### Impact
The dashboard can never display a record. `Total cases : 0` and the empty state
`ยังไม่มีข้อมูลการวินิจฉัย` are shown permanently. This blocks end-to-end verification of
**record search, triage/date/channel filtering, pagination, record detail and CSV download** —
four of the six scenarios in the assignment brief.

**Evidence:** `docs/screenshots/recon-02-dashboard.png`, `docs/screenshots/recon-14-download.png`

---

## BUG-002 — Logout does not clear the session token or patient PII from localStorage (High)

**Severity:** High **Priority:** P1 **Status:** Open
**Area:** Authentication / session management

### Steps to reproduce
1. Log in as `test@gmail.com` / `12345`.
2. Click **Log Out** in the sidebar; confirm the app returns to `/ai_dashboard/login/`.
3. In DevTools → Application → Local Storage, inspect `session`, `user`, `hospital`, `persist:root`.

### Expected
Logout clears every authentication and patient-data key. A subsequent user of the same browser
must not be able to recover the previous user's token or personal data.

### Actual
Only `user_name` is removed. Still present after logout:

| Key | Retained content |
|---|---|
| `session` | a valid JWT `access` token |
| `user` | `email`, `gender`, `date_of_birth`, `height`, `weight`, `age`, `firstname`, `lastname`, `uuid`, `user_id` |
| `hospital` | `"12345"` |
| `persist:root` | a full duplicate of the `user` object |

### Impact
On a shared hospital workstation — the stated deployment context for this dashboard — the next
person at the machine can read the previous user's bearer token and patient PII straight out of
browser storage. The token remains usable until it expires.

---

## BUG-003 — Backend errors are rendered as an empty-data state (Medium)

**Severity:** Medium **Priority:** P2 **Status:** Open
**Area:** Dashboard / error handling

### Steps to reproduce
1. Log in and open the Diagnosis List (the listing API is currently 500 — see BUG-001).

### Expected
An error message such as "Unable to load records, please try again", ideally with a retry action.

### Actual
The UI shows `Total cases : 0` and `ยังไม่มีข้อมูลการวินิจฉัย` — visually identical to a genuinely
empty result set. Nothing indicates that the request failed.

### Impact
Staff cannot distinguish "no patients to follow up" from "the system is down". In a clinical
follow-up workflow that silence is dangerous: a real backlog of urgent cases would look like an
empty queue. It also masked BUG-001 until the network traffic was inspected.

---

## BUG-004 — Failed login returns HTTP 500 instead of 401 (Medium)

**Severity:** Medium **Priority:** P2 **Status:** Open
**Area:** Authentication / API contract

### Steps to reproduce
```bash
curl -i -X POST https://dev.api.agnoshealth.com/api/ai_dashboard/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test@gmail.com","password":"definitely-wrong"}'
```

### Expected
`401 Unauthorized` (or `400`) with a message identifying the failure as bad credentials.

### Actual
`500 Internal Server Error` with `{"error_message":"internal_server_error"}`.
Reproduced with a wrong password, an unknown user, and a malformed e-mail address.

### Impact
The front end maps any login error to "Wrong email or password. Please try again", which happens to
read correctly today but would show the same message during a genuine backend outage — users and
support staff would be misdirected. It also makes automated negative tests unable to distinguish a
rejected credential from a broken service.

---

## BUG-005 — Password policy rejects `!` although the message says a special character is required (Medium)

**Severity:** Medium **Priority:** P2 **Status:** Open
**Area:** Registration / validation

### Steps to reproduce
1. Open `https://dev.app.agnoshealth.com/ai_dashboard/agnos/sign_up`.
2. Enter a unique e-mail, and `Passw0rd!` in both Password and Confirm Password.
3. Click **Confirm**.

### Expected
Accepted. `Passw0rd!` is 9 characters and contains an uppercase letter (`P`), a digit (`0`) and a
special character (`!`) — every rule the on-screen message states.

### Actual
Rejected with *"The password must be at least 8 characters long and include at least one uppercase
letter, one digit, and one special character."*

| Password | Result |
|---|---|
| `Passw0rd!` | rejected |
| `Password1!` | rejected |
| `Passw0rd@` | **accepted** — account created, HTTP 200 |

Only the special character differs between the rejected and accepted cases, so `!` is not in the
implemented allow-list while `@` is.

### Impact
Users are told their password satisfies the stated rules yet are rejected with no explanation of
the real constraint. The undocumented allow-list also weakens the password space.

---

## BUG-006 — Password and Confirm Password share the DOM id `password` (Low)

**Severity:** Low **Priority:** P3 **Status:** Open
**Area:** Registration / HTML validity

### Steps to reproduce
1. Open the sign-up page and inspect the two password inputs.

### Expected
Unique `id` attributes, each associated with its visible label via `<label for>`.

### Actual
Both inputs carry `id="password"`. Neither the sign-up nor the login inputs have an associated
`<label for>` or `aria-label`, so they expose no accessible name.

### Impact
Duplicate ids are invalid HTML and break `document.getElementById`, label-click focus and screen
readers. For automation it means `getByLabel('Password')` cannot be used at all; the suite has to
fall back to positional `input[type=password]` locators, which are more brittle.

---

## BUG-007 — Confirming a download with no records does nothing (Low)

**Severity:** Low **Priority:** P3 **Status:** Open
**Area:** Dashboard / CSV export

### Steps to reproduce
1. Log in and open the Diagnosis List while it shows `Total cases : 0`.
2. Click **Download**, then **ยืนยัน** in the confirmation modal.

### Expected
Either the Download button is disabled when there is nothing to export, or the app reports
"no data to export".

### Actual
No network request is sent, no file is downloaded, and no message is shown. The success toast
`Download CSV file successfully` is present in the DOM at `opacity: 0` and never fires. The modal
stays open. Verified by listening for both the `download` event and any `/api/` request for 20 s.

### Impact
The user cannot tell whether the export failed, is still running, or produced an empty file.

---

## BUG-008 — Typographical errors in Thai and English UI copy (Low)

**Severity:** Low **Priority:** P3 **Status:** Open
**Area:** Content

| Location | Actual | Should be |
|---|---|---|
| Download confirmation modal title | `ยินยันการดาวน์โหลด` | `ยืนยันการดาวน์โหลด` |
| Post-registration message | `Please wait or account approval` | `Please wait for account approval` |

**Evidence:** `docs/screenshots/recon-14-download.png`, `docs/screenshots/recon-17-postsignup.png`

---

## Observation — `/ai_dashboard` responds with HTTP 404 while rendering the app

Every navigation to `/ai_dashboard`, `/ai_dashboard/login` and `/ai_dashboard/agnos/sign_up`
returns an HTTP **404** status even though the SPA renders correctly, and the browser console logs
`Failed to load resource: the server responded with a status of 404`.

This is a static-hosting fallback misconfiguration: the SPA rewrite serves `index.html` but keeps
the 404 status instead of rewriting to 200. It does not break the UI, but it is wrong for crawlers,
uptime monitors and any automated check that asserts on response status. Raised as an observation
rather than a defect because it has no user-visible impact.
