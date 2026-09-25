# SecureBank

A full-stack demo banking web app built for a security-education project. It's
built in phases: Phase 1 is a fully functional banking application; Phase 2
adds SQL Injection testing; Phase 3 adds input validation, XSS protection, and
object-level authorization; and Phase 4 adds CSRF protection, session security,
rate limiting, and security headers.

Each security control can be switched between Secure Mode and Vulnerable Lab
Mode from the authenticated Security Center, allowing the same application
behavior to be tested before and after the protection is enabled.

No Docker required — this runs against any PostgreSQL instance you already
have (local install or a hosted database), using a connection string you provide.

* * *

## About the project

SecureBank simulates a real online banking app: users register, log in, see
an account dashboard, transfer simulated money between accounts, browse
transaction history, and manage their profile. It's deliberately built like a
normal fintech product first (Phase 1), so that later phases can demonstrate
common web vulnerabilities against real, working features instead of toy
examples — starting with SQL Injection on the login form (Phase 2).

Every vulnerability phase works the same way: the vulnerable and secure
implementations live in the same codebase, and an authenticated "Security
Center" lets you flip between them for a live, repeatable before/after
demonstration, with every attempt logged to an Attack Log.

* * *

## Repo structure

```
securebank/
├── README.md / complete-readme.md
├── backend/                     Express REST API (Node.js + PostgreSQL)
│   ├── server.js                App entrypoint — loads security config, mounts all routes
│   ├── .env.example             Copy to .env; only DATABASE_URL is required
│   ├── package.json
│   ├── db/
│   │   ├── schema.sql           All tables: users, accounts, transactions, session,
│   │   │                        security_settings, security_logs
│   │   ├── run-schema.js        Applies schema.sql to DATABASE_URL (no psql needed)
│   │   └── pool.js              pg.Pool, with SSL auto-detection for hosted DBs
│   ├── middleware/
│   │   └── auth.js              Session auth guard (requireAuth), session_version check
│   ├── routes/
│   │   ├── auth.js              register / login / logout (Phase 2 logic lives in login)
│   │   ├── user.js               profile view/update, change password, logout-all-sessions
│   │   ├── account.js            account summary + detail (ownership-checked)
│   │   ├── transfer.js           transactional money transfer between accounts
│   │   ├── transactions.js       transaction list (search/filter/paginate) + detail
│   │   └── security.js           Phase 2: security control config + attack log events
│   ├── security/
│   │   ├── securityConfig.js     Secure/Vulnerable Lab Mode ON-OFF store (per control)
│   │   ├── sqliDetector.js       Heuristic pattern match used to flag SQLi-shaped input
│   │   └── securityLogger.js     Writes security events to security_logs + console
│   └── utils/
│       └── validate.js           Email/password/amount validation, account number helpers
└── frontend/                    React (Vite) + Tailwind CSS SPA
    ├── .env.example              Copy to .env; only VITE_API_URL needs checking
    ├── package.json
    └── src/
        ├── pages/
        │   ├── Login.jsx / Register.jsx
        │   ├── Dashboard.jsx      Balance card, stat cards, recent transactions, chart
        │   ├── Accounts.jsx       Account card with reveal/copy full account number
        │   ├── Transfer.jsx       Review-then-confirm transfer flow
        │   ├── Transactions.jsx   Search/filter/paginate + detail modal
        │   ├── Profile.jsx        Edit info, change password, logout-all-sessions
        │   └── Security.jsx       Phase 2: Security Center dashboard
        ├── components/
        │   ├── Button, Card, Input, Modal, Navbar, Sidebar, Badge, Table,
        │   │   Dropdown, LoadingSpinner, DashboardLayout, ProtectedRoute
        │   └── Toggle.jsx, SecurityStatus.jsx, SecurityEvent.jsx   (Phase 2)
        ├── context/
        │   ├── AuthContext.jsx    Current user, login/logout, route protection
        │   └── ToastContext.jsx   Toast notifications
        └── api/client.js          Axios instance (withCredentials: true)
```

* * *

## Run steps

### Prerequisites

- Node.js 18\+ and npm
- A PostgreSQL database you can connect to — local install, or a hosted one
  (Neon, Supabase, Railway, RDS, etc.) — and its connection string

### 1\. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to your real connection string:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

If your provider requires SSL (most hosted ones do), add `?sslmode=require`
to the end of the URL — `pool.js` and `run-schema.js` both detect that and
enable SSL automatically. Everything else in `.env.example` (`SESSION_SECRET`,
`PORT`, `CORS_ORIGIN`) has a working default baked into the code, so
`DATABASE_URL` is the only value you must fill in.

### 2\. Install backend dependencies

```bash
npm install
```

(still inside `backend/`)

### 3\. Apply the database schema

```bash
npm run db:setup
```

Runs `backend/db/run-schema.js`, which reads `DATABASE_URL` from `.env` and
applies `schema.sql` directly through the `pg` package — no `psql` CLI
install needed. Safe to re\-run any time `schema.sql` changes (e.g. Phase 2
added `security_settings` and `security_logs`) — every statement is
`IF NOT EXISTS`, so it only adds what's missing and never touches existing
data.

### 4\. Start the backend

```bash
npm run dev     # nodemon server.js, auto-restarts on change
# or: npm start
```

API listens on `http://localhost:4000` by default. Health check:
`GET http://localhost:4000/api/health`.

### 5\. Configure and start the frontend

In a separate terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

`frontend/.env` only needs `VITE_API_URL` (default `http://localhost:4000/api`).

### 6\. Use the app

Open `http://localhost:5173`. Register a new user — a Savings account with a
₹10,000.00 starting balance is created automatically — then log in. To test a
transfer, register a second user in another browser/incognito window, go to
their Accounts page, click "Show full number" to reveal and copy their
account number, then send them money from the first account's Transfer page.

### Default ports

| Service | Port |
| --- | --- |
| Frontend (Vite) | 5173 |
| Backend (Express) | 4000 |

(PostgreSQL port depends on wherever your database is hosted.)

* * *

## Features

### General banking features (Phase 1)

**Authentication**

- Register with name/email/password — password is bcrypt\-hashed (never stored in plaintext)
- A Savings account is auto\-created on registration with a ₹10,000.00 demo balance
- Login/logout with Postgres\-backed `express-session` and an httpOnly cookie
- Session middleware protects every non\-auth route (401 if not logged in)

**Accounts**

- Account summary: masked account number, balance, type, active/inactive status
- Full account number can be revealed and copied on demand, so you can share it
  with someone else to receive a transfer
- Account detail lookup is ownership\-checked (you can only ever see your own account)

**Transfers**

- Transfer to another account by account number, with a review\-then\-confirm step
- Implemented as a single database transaction with row\-level locking, so a
  transfer can't leave balances inconsistent under concurrent requests
- Validates sufficient balance, that the recipient account exists and is
  active, and that you're not transferring to yourself

**Transactions**

- Full transaction history, searchable by description, filterable by
  credit/debit and date range, paginated
- Transaction detail view, ownership\-checked

**Profile**

- View/edit name, phone, address
- Change password (requires current password)
- "Logout all other sessions" — invalidates every other active session immediately

**Frontend**

- Dashboard with balance card, income/expense/savings stat cards, recent
  transactions, and an income\-vs\-expense chart
- Responsive layout (sidebar collapses on mobile), basic dark mode toggle
- Consistent design system: reusable Button, Card, Input, Modal, Table, Badge,
  Toast, Dropdown, Sidebar/Navbar components

### Security features added in Phase 2 (SQL Injection)

- **Security Center dashboard** (`/security`): an authenticated control panel
  showing every security control's live status, a step\-by\-step test guide,
  and a real\-time Attack Log feed.
- **Secure vs. Vulnerable Lab Mode toggle** for `POST /api/auth/login`,
  backed by a `sqlInjection` flag stored in a new `security_settings` table:
  - **Secure Mode (default):** strict email\-format validation, then a
    parameterized query — `WHERE email = $1` with the value passed as a bind
    parameter. User input can never be interpreted as SQL syntax.
  - **Vulnerable Lab Mode:** format validation is skipped and the WHERE
    clause is built by concatenating the raw email string into the SQL text
    — `WHERE email = '${email}'` — reproducing the classic unsafe pattern on
    purpose, gated behind this authenticated toggle only.
- **Authenticated\-only lab control:** the toggle is only reachable via
  `GET/PUT /api/security/config`, both behind `requireAuth` — there is no
  public/unauthenticated way to disable a security control, by design.
- **SQL injection pattern detection:** a lightweight heuristic
  (`sqliDetector.js`) flags SQLi\-shaped input (`' OR '1'='1`, `--`, `UNION SELECT`, stacked statements, etc.) regardless of which mode is active.
- **Persistent Attack Log:** every detected attempt is written to a new
  `security_logs` table via `securityLogger.js`, recording type, severity,
  endpoint, status (`DETECTED` in Vulnerable Mode, `BLOCKED` in Secure Mode),
  which mode was active, and a human\-readable detail message (e.g. "query
  returned 4 row(s) instead of the expected 0 or 1"). Viewable live on the
  Security Center's Attack Logs panel via `GET /api/security/events`.
- **Config\-change auditing:** flipping any control itself logs a
  `CONFIG_CHANGE` security event, so there's a record of who put the app into
  Vulnerable Lab Mode and when.
- **Verified vulnerability \+ fix, side by side:** the same `' OR '1'='1' --`
  request, run once against each mode, produces a confirmed VULNERABLE result
  (query returns unintended rows) and then a confirmed BLOCKED result (query
  returns 0 or 1 rows as expected) — the exact before/after evidence the
  project's checklist calls for.
* * *

### Security features added in Phase 3

- **Input validation:** registration, profile, transfer, transaction search,
  date filters, and account-number inputs have explicit type, length, format,
  and range checks. The `inputValidation` control can disable these checks in
  local Vulnerable Lab Mode.
- **XSS protection:** profile names, phone numbers, addresses, and transfer
  descriptions are stripped of HTML markup and control characters before
  storage, and stored text is sanitized again when returned by the API. The
  `xssProtection` control is enabled by default.
- **IDOR protection:** account detail and transaction detail queries include
  the authenticated user's ownership in the database predicate. With
  `authorization` disabled for a local lab demonstration, those routes
  intentionally reproduce the insecure object lookup behavior.
- **Security Center:** the three Phase 3 controls are now active and no
  longer shown as "Coming soon". The remaining controls are still reserved
  for later phases.

### Testing Phase 3

Start the backend and frontend, open `http://localhost:5173`, and register two
users. Log in as User A. Use the **Security Center** to confirm that
`inputValidation`, `xssProtection`, and `authorization` are ON.

**Input validation:** submit an invalid email, a password shorter than 8
characters, a transfer amount such as `-10` or `10.999`, and an invalid date
range. Each request should be rejected with a `400` response and an error
message.

**XSS protection:** set a profile field or transfer description to
`<script>alert(1)</script>`. The script must not execute, and the returned or
displayed text should be sanitized. Restore the field after testing.

**Authorization / IDOR:** while logged in as User A, open the browser
Developer Tools (`F12`), select the Console, and first get User A's account
IDs:

```js
fetch('http://localhost:4000/api/account', { credentials: 'include' })
  .then((response) => response.json())
  .then(console.log)
```

Replace `USER_B_ACCOUNT_ID` with User B's account ID and run:

```js
fetch('http://localhost:4000/api/account/USER_B_ACCOUNT_ID', {
  credentials: 'include',
}).then(async (response) => console.log(response.status, await response.json()));
```

With **Authorization ON**, the expected result is `404` with
`Account not found`. Repeat the test with a User B transaction ID:

```js
fetch('http://localhost:4000/api/transactions/USER_B_TRANSACTION_ID', {
  credentials: 'include',
}).then(async (response) => console.log(response.status, await response.json()));
```

It should return `404` with `Transaction not found`. For the local lab
demonstration only, turn **Authorization** OFF in Security Center and repeat
the requests; they should return `200`. Turn it back ON and verify that the
requests return `404` again.

**Important nuance for your presentation:** with SQL Injection Protection
off, the `' OR '1'='1' --` payload does alter the query (it returns every
user row instead of 0 or 1 — confirmed evidence of the vulnerability, visible
in the Attack Log), but the login attempt itself still fails with the same
generic "Invalid email or password" message. That's because password
verification happens in application code (`bcrypt.compare`) against the real
password hash, not inside the SQL — so this specific payload proves the
query was compromised without by itself granting a full login bypass. A more
advanced UNION\-based payload could achieve a full bypass; that's a possible
stretch addition, not part of the current implementation.

* * *
### Security features added in Phase 4

Phase 4 completes the remaining security controls with protections for
state-changing requests, sessions, repeated login attempts, and browser
security headers.

- **CSRF protection:** Transfer requests require a session-bound
  `X-CSRF-Token` in Secure Mode. In Vulnerable Lab Mode, token validation is
  skipped so the same transfer can be submitted without the token.

- **Session security:** Secure Mode regenerates the session ID after successful
  authentication and uses protected session-cookie settings such as HttpOnly
  and SameSite. In Vulnerable Lab Mode, the existing session ID is reused and
  cookie protections are disabled for demonstration.

- **Rate limiting:** Login requests are limited to 5 requests within 60
  seconds per client IP in Secure Mode. The 6th request is blocked with HTTP
  `429 Too Many Requests`. In Vulnerable Lab Mode, the rate limiter is disabled.

- **Security headers:** Secure Mode adds security headers including
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a
  Content Security Policy. In Vulnerable Lab Mode, these headers are removed.

- **User-aware Attack Logs:** Security events associated with an authenticated
  user display the user's name in the Security Center. Events occurring before
  authentication, such as login SQL injection attempts and rate-limit blocks,
  remain unaffiliated with a user.

### Testing Phase 4

Start the backend and frontend, log in, and open the **Security Center**.

**CSRF protection:** With CSRF Protection ON, submit a transfer without the
`X-CSRF-Token` header using the browser's Developer Tools; the request should
return `403`. Turn the control OFF and repeat the request; it should be
accepted. Turn the control back ON afterward.

**Session security:** Log in with Session Security ON and inspect
`F12 → Application → Cookies`. The `securebank.sid` cookie should have
HttpOnly enabled and SameSite set to `Lax`. Turn Session Security OFF and
repeat the login; the cookie protections should be disabled for the lab
demonstration. On localhost over HTTP, the Secure cookie flag is not expected
to be enabled.

**Rate limiting:** With Rate Limiting ON, submit 6 login requests within
60 seconds from the same client. The first 5 are processed normally and the
6th should return `429 Too Many Requests`. Turn the control OFF and repeat;
requests should no longer be blocked by the rate limiter.

**Security headers:** With Security Headers ON, open `F12 → Network`, select
an API request, and inspect the Response Headers for
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
`Content-Security-Policy`. Turn the control OFF and repeat; these headers
should no longer be present.

**Attack Logs:** After testing, use the Attack Logs section to verify the
security events. Authenticated actions should display the associated username,
while unauthenticated login-related events should not.

## Notes / known gaps

- Each user has exactly one (Savings) account, created at registration; the
  schema and transfer logic don't prevent multiple accounts per user, but
  nothing in the UI creates a second one yet.
- `connect-pg-simple` is configured with `createTableIfMissing: false`
  because `schema.sql` is the single source of truth for the DB schema.
- CSRF protection, secure cookie hardening, rate limiting, and security
  headers remain planned for later phases.
- This was built and syntax/schema\-checked in a sandboxed environment
  without full npm registry access, so live `npm install` \+ end\-to\-end runs
  happen on your machine. If you hit an install or runtime error not covered
  here, share the exact error.
