# SecureBank (Phase 1)

A full-stack demo banking web app built as the secure, functional baseline for a
security-education project. **Phase 1 intentionally contains no vulnerabilities** —
parameterized SQL, bcrypt password hashing, server-side session auth, ownership
checks on every resource, and input validation throughout. Later phases will layer
vulnerability demonstrations on top of this baseline inside the `/security` area
of the app (currently a non-functional placeholder).

## Monorepo layout

```
securebank/
├── backend/          Express REST API (Node.js + PostgreSQL)
│   ├── db/
│   │   ├── schema.sql   All tables, including the connect-pg-simple session table
│   │   └── pool.js      pg.Pool wired to env vars
│   ├── middleware/auth.js
│   ├── routes/{auth,user,account,transfer,transactions}.js
│   ├── utils/validate.js
│   ├── server.js
│   └── .env.example
├── frontend/         React (Vite) + Tailwind CSS SPA
│   ├── src/{components,pages,context,api,utils}
│   └── .env.example
└── docker-compose.yml   Postgres 16 for local development
```

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL (`pg`), `express-session` +
  `connect-pg-simple` for Postgres-backed sessions, `bcrypt` for password hashing.
- **Frontend:** React + Vite, Tailwind CSS, `react-router-dom`, `recharts`, `axios`
  (`withCredentials: true` so the session cookie is sent).

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 16 (either via the provided `docker-compose.yml`, or a local install)
- Docker + Docker Compose, if you want to use the bundled Postgres container

## 1. Database setup

### Option A — Docker Compose (recommended)

```bash
docker compose up -d db
```

This starts a `postgres:16` container named `securebank-db` on `localhost:5432`
with user/password/db all set to `securebank` (see `docker-compose.yml`), backed
by a named volume (`securebank_db_data`) so data survives restarts.

### Option B — local PostgreSQL

Create a database and user matching whatever you put in `backend/.env`, e.g.:

```bash
sudo -u postgres psql -c "CREATE USER securebank WITH PASSWORD 'securebank';"
sudo -u postgres psql -c "CREATE DATABASE securebank OWNER securebank;"
```

### Load the schema (either option)

```bash
psql "postgresql://securebank:securebank@localhost:5432/securebank" -f backend/db/schema.sql
```

`schema.sql` creates `users`, `accounts`, `transactions`, and the `session` table
used by `connect-pg-simple` (standard DDL from its own docs — the app runs with
`createTableIfMissing: false` so this table must exist before the API starts;
you may alternatively let `connect-pg-simple` auto-create it by flipping that
flag to `true` in `server.js`). No fake users are seeded — register through the
UI or via `curl` to create real, bcrypt-hashed accounts.

## 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` if your Postgres credentials differ from the defaults.
Key variables:

| Variable        | Purpose                                           |
|-----------------|----------------------------------------------------|
| `DATABASE_URL`  | Preferred single connection string for Postgres    |
| `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` | Used only if `DATABASE_URL` is unset |
| `SESSION_SECRET`| Secret used to sign the session cookie             |
| `PORT`          | Port the API listens on (default `4000`)           |
| `CORS_ORIGIN`   | Allowed frontend origin (default `http://localhost:5173`) |

`frontend/.env` only needs `VITE_API_URL` (default `http://localhost:4000/api`).

## 3. Run the backend

```bash
cd backend
npm install
npm run dev     # nodemon server.js, auto-restarts on change
# or: npm start
```

The API listens on `http://localhost:4000` by default. Health check:
`GET http://localhost:4000/api/health`.

## 4. Run the frontend

```bash
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173
# npm run build   # production build -> frontend/dist
# npm run preview # preview the production build
```

Open `http://localhost:5173` in a browser. Register a new user (a Savings
account with a ₹10,000.00 starting balance is created automatically), then log
in.

## Default ports

| Service          | Port |
|------------------|------|
| Frontend (Vite)  | 5173 |
| Backend (Express)| 4000 |
| PostgreSQL       | 5432 |

## Phase 1 feature checklist

**Auth**
- [x] Register (bcrypt-hashed password, auto-created Savings account, ₹10,000.00 opening balance)
- [x] Login (Postgres-backed express-session, httpOnly cookie)
- [x] Logout
- [x] Session-based auth middleware on every non-auth route (401 if not logged in)

**Profile**
- [x] View/update profile (name, phone, address; email read-only in the UI)
- [x] Change password (requires current password)
- [x] Logout all other sessions (`session_version` bump, checked on every request)

**Accounts**
- [x] Account summary (masked account number, balance, type, status)
- [x] Account detail by id, with ownership check (no IDOR)

**Transfers**
- [x] Transfer between accounts as a single DB transaction (row-level locking,
      balance + existence + status validation, insufficient-funds check)

**Transactions**
- [x] List with search, credit/debit filter, date range, and pagination
- [x] Transaction detail by id, ownership-checked

**Frontend**
- [x] Login / Register pages
- [x] Dashboard: greeting, balance card, income/expense/savings stat cards,
      recent transactions, income vs. expense chart (recharts)
- [x] Accounts page with masked account number and status badge
- [x] Transfer page with a review/confirm step before submission
- [x] Transactions page: search, filter, date range, pagination, detail modal
- [x] Profile page: edit info, change password, logout-all-sessions
- [x] Security Center placeholder (visually distinct purple accent, disabled
      "coming soon" cards for future vulnerability-education phases)
- [x] Responsive layout (sidebar collapses on mobile), basic dark mode toggle

## Notes / known gaps

- Each user has exactly one (Savings) account in Phase 1, created at
  registration; the schema and transfer logic don't prevent multiple accounts
  per user, but nothing in the UI creates a second one yet.
- `connect-pg-simple` is configured with `createTableIfMissing: false` because
  `schema.sql` is meant to be the single source of truth for the DB — flip that
  flag if you'd rather let the library manage the session table itself.
- This sandbox's outbound network access does not permit `npm install`
  (the npm registry and common CDNs are not reachable), so the frontend build
  (`vite build`) and a live end-to-end backend run could not be executed here.
  What *was* verified in this environment:
  - Every backend `.js` file passes `node --check` (syntax-valid).
  - `backend/db/schema.sql` was loaded into a real local PostgreSQL 16 instance
    without errors (all tables, indexes, and the `session` table were created
    successfully).
  - All frontend `.jsx`/`.js` files have balanced braces/parens/brackets, and
    the API request/response shapes used in the React components were checked
    by hand against the Express route handlers (field names, endpoints, and
    request bodies match on both sides).
  - Once `npm install` succeeds in an environment with normal registry access,
    `npm run build` (frontend) and `npm run dev` / `npm start` (backend) are
    expected to work as-is against the schema and env vars documented above.
