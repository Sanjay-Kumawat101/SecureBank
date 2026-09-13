# SecureBank (Phase 1)

A full\-stack demo banking web app built as the secure, functional baseline for a
security\-education project. **Phase 1 intentionally contains no vulnerabilities** —
parameterized SQL, bcrypt password hashing, server\-side session auth, ownership
checks on every resource, and input validation throughout. Later phases will layer
vulnerability demonstrations on top of this baseline inside the `/security` area
of the app (currently a non\-functional placeholder).

No Docker required — this runs against any PostgreSQL instance you already have
(local install or a hosted database), using a connection string you provide.

## Monorepo layout

```
securebank/
├── backend/          Express REST API (Node.js + PostgreSQL)
│   ├── db/
│   │   ├── schema.sql      All tables, including the connect-pg-simple session table
│   │   ├── run-schema.js   Applies schema.sql to DATABASE_URL (no psql needed)
│   │   └── pool.js         pg.Pool wired to env vars, with SSL handling for hosted DBs
│   ├── middleware/auth.js
│   ├── routes/{auth,user,account,transfer,transactions}.js
│   ├── utils/validate.js
│   ├── server.js
│   └── .env.example
└── frontend/         React (Vite) + Tailwind CSS SPA
    ├── src/{components,pages,context,api,utils}
    └── .env.example
```

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL (`pg`), `express-session` \+
  `connect-pg-simple` for Postgres\-backed sessions, `bcrypt` for password hashing.
- **Frontend:** React \+ Vite, Tailwind CSS, `react-router-dom`, `recharts`, `axios`
  (`withCredentials: true` so the session cookie is sent).

## Prerequisites

- Node.js 18\+ and npm
- A PostgreSQL database you can connect to — local install, or a hosted one
  (Neon, Supabase, Railway, RDS, etc.) — and its connection string

## Steps to run the app

### 1\. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to your real connection string, e.g.:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

If your provider requires SSL (most hosted ones do), add `?sslmode=require` to
the end of the URL — `pool.js` and `run-schema.js` both detect that and enable
SSL automatically. Everything else in `.env.example` (`SESSION_SECRET`, `PORT`,
`CORS_ORIGIN`) has a working default baked into the code, so `DATABASE_URL` is
the only value you must fill in to get started.

### 2\. Install backend dependencies

```bash
npm install
```

(still inside `backend/`)

### 3\. Apply the database schema

```bash
npm run db:setup
```

This runs `backend/db/run-schema.js`, which reads `DATABASE_URL` from `.env` and
executes `schema.sql` against it directly through the `pg` package — no `psql`
CLI install needed. It creates `users`, `accounts`, `transactions`, and the
`session` table used by `connect-pg-simple`. No fake users are seeded; register
through the UI (or `curl`) to create real, bcrypt\-hashed accounts.

Re\-running `npm run db:setup` against a database that already has the tables
will error on the `CREATE TABLE` statements — that's expected and just means
the schema is already applied.

### 4\. Start the backend

```bash
npm run dev     # nodemon server.js, auto-restarts on change
# or: npm start
```

The API listens on `http://localhost:4000` by default. Health check:
`GET http://localhost:4000/api/health`.

### 5\. Configure and start the frontend

In a separate terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

`frontend/.env` only needs `VITE_API_URL` (default `http://localhost:4000/api`)
— change it if your backend runs on a different host/port.

### 6\. Use the app

Open `http://localhost:5173` in a browser. Register a new user — a Savings
account with a ₹10,000.00 starting balance is created automatically — then log
in. To test a transfer, register a second user in another browser/incognito
window, go to their Accounts page, click "Show full number" to reveal and copy
their account number, then send them money from the first account's Transfer
page.

## Default ports

| Service | Port |
| --- | --- |
| Frontend (Vite) | 5173 |
| Backend (Express) | 4000 |

(PostgreSQL port depends on wherever your database is hosted.)

## Phase 1 feature checklist — everything done so far

**Auth**

- [x] Register (bcrypt\-hashed password, auto\-created Savings account, ₹10,000.00 opening balance)
- [x] Login (Postgres\-backed express\-session, httpOnly cookie)
- [x] Logout
- [x] Session\-based auth middleware on every non\-auth route (401 if not logged in)

**Profile**

- [x] View/update profile (name, phone, address; email read\-only in the UI)
- [x] Change password (requires current password)
- [x] Logout all other sessions (`session_version` bump, checked on every request)

**Accounts**

- [x] Account summary (masked account number, balance, type, status)
- [x] Account detail by id, with ownership check (no IDOR)
- [x] Reveal \+ copy full account number from the Accounts page (added after
  initial build — the list endpoint masks the number for security, so the
  UI now calls the detail endpoint on demand to reveal it, so you can share
  it with someone else to receive a transfer)

**Transfers**

- [x] Transfer between accounts as a single DB transaction (row\-level locking,
  balance \+ existence \+ status validation, insufficient\-funds check)

**Transactions**

- [x] List with search, credit/debit filter, date range, and pagination
- [x] Transaction detail by id, ownership\-checked

**Frontend**

- [x] Login / Register pages
- [x] Dashboard: greeting, balance card, income/expense/savings stat cards,
  recent transactions, income vs. expense chart (recharts)
- [x] Accounts page with masked\-by\-default account number, reveal \+ copy, and status badge
- [x] Transfer page with a review/confirm step before submission
- [x] Transactions page: search, filter, date range, pagination, detail modal
- [x] Profile page: edit info, change password, logout\-all\-sessions
- [x] Security Center placeholder (visually distinct purple accent, disabled
  "coming soon" cards for future vulnerability\-education phases)
- [x] Responsive layout (sidebar collapses on mobile), basic dark mode toggle

**Local setup / DX**

- [x] Runs without Docker — any reachable PostgreSQL connection string works
- [x] `db/run-schema.js` applies the schema via `npm run db:setup` (no `psql` install required)
- [x] `.env.example` trimmed to require only `DATABASE_URL`; everything else defaults sensibly in code
- [x] `pool.js` auto\-enables SSL when `DATABASE_URL` includes `sslmode=require` (needed by most hosted Postgres providers)

## Notes / known gaps

- Each user has exactly one (Savings) account in Phase 1, created at
  registration; the schema and transfer logic don't prevent multiple accounts
  per user, but nothing in the UI creates a second one yet.
- `connect-pg-simple` is configured with `createTableIfMissing: false` because
  `schema.sql` is meant to be the single source of truth for the DB — flip that
  flag if you'd rather let the library manage the session table itself.
- This was built and syntax/schema\-checked in a sandboxed environment without
  full npm registry access, so a live `npm install` \+ end\-to\-end run happened
  on your machine, not during initial development. If you hit an install or
  runtime error the notes above don't cover, share the exact error and it can
  be fixed directly.
