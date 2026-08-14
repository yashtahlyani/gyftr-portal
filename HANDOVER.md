# GyFTR Portal — Handover Guide

## What this is
An internal work-tracking portal for the GyFTR Content & Creative teams.
React + Vite frontend. Express backend. AWS hosting.

---

## Step-by-step setup from scratch

### 1. Clone & install

```bash
git clone <repo-url> gyftr-portal
cd gyftr-portal

# Installs frontend, backend and scripts in one go
npm run install:all
```

---

### 2. Provision AWS (follow infra/aws-setup.md)

In order:
1. **RDS** — Postgres database
2. **Secrets Manager** — store DB credentials as `gyftr/portal/db`
3. **Cognito** — user pool for login
4. **EC2** — runs the backend API
5. **ALB** — HTTPS for the backend
6. **S3 + CloudFront** — hosts the frontend

Full instructions with exact console steps: **`infra/aws-setup.md`**

---

### 3. Database schema

The migration off the old stack is **done** — the portal is AWS-only and there
is no import step any more.

The `tasks`, `effort_entries`, `comments`, `audit_log` and `task_files` tables
must exist in RDS. Everything the portal added since — the `users` directory,
the `properties` list, and the `owner_email` / `business_owner_email` columns —
is created automatically by `backend/schema.sql`, which the API applies on every
boot. It is additive and idempotent, so restarting the backend is always safe.

On the very first boot the property list is seeded from
`backend/seed/properties.json` (111 properties across both teams). That happens
only while the table is empty, so properties added or removed in the portal are
never resurrected by a restart.

---

### 4. Create all users in Cognito

```bash
cd scripts

# Set these env vars:
export COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ    # from Cognito console
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

node create-cognito-users.js
```

This creates **21 users** (all team members) with password `default@123`, reading
the roster from `scripts/roster.json`. Users can be reset individually from the
Cognito console later.

---

### 4b. Sync Cognito → the `users` directory table

```bash
cd scripts
# same Cognito env vars as above, plus RDS_HOST / RDS_USER / RDS_PASSWORD / RDS_DB

node sync-users.js --dry-run   # look first
node sync-users.js
```

Then repair the links on tasks that already exist:

```bash
node backfill-identity.js --dry-run   # shows what would change
node backfill-identity.js
```

`backfill-identity.js` reports any task whose `owner` name matches nobody in the
directory — those are exactly the tasks that go missing from someone's portal.

---

## How identity works (read this before changing anything about people)

**Cognito decides who can log in. The `users` table decides what they are.**

| Thing | Lives in | Changed by |
|---|---|---|
| Can this person log in? | Cognito user pool | Cognito console / `create-cognito-users.js` |
| Their display name, team, role, avatar colour | `users` table in RDS | Portal → **Admin · PMO → Team Directory** |
| Which tasks they see | computed in `backend/routes/tasks.js` from the above | — |

None of this is hardcoded in the frontend any more. A new team member is created
in Cognito, and appears in the portal on first login as a Content member — move
them to the right team in Admin → Team Directory.

### Access levels

| Tier | DB `role` | Can see | Can do |
|---|---|---|---|
| **Super Admin** | `super_admin` | every task, both teams | everything, plus edit the Team Directory |
| **Admin** | `manager` | every task on their own team | create, reassign, rename, reschedule, delete, lock/unlock effort |
| **Employee** | `user` | only tasks assigned to them, **on any team** | log effort, change effort/project status, write updates and comments, request an effort unlock |

Employees are deliberately **not** team-filtered: a task assigned to you is
yours to see even if the row's `team` column is stale or wrong. Team-gating here
is what previously hid Creative tasks from their own assignees.

All of this is enforced in `backend/permissions.js` and applied on every write
route — not just hidden in the UI. Hiding a button is not access control; the
API is what actually decides.

Review the live access list any time with:

```bash
cd scripts && node audit-access.js          # readable report + anomaly warnings
cd scripts && node audit-access.js --csv    # spreadsheet for sign-off
```

### Passwords

Everyone must set their own password — no shared default stays in place.

- New accounts are created with a **temporary** password, so Cognito puts them
  in `FORCE_CHANGE_PASSWORD` and the portal shows "Set a new password" on first
  login. `create-cognito-users.js` must always use `Permanent: false`.
- To force everyone (including people already using the portal) to change theirs:

```bash
cd scripts
node force-password-reset.js --dry-run    # see who would be reset
node force-password-reset.js              # forces change at next login
node force-password-reset.js --signout    # ...and ends active sessions now
```

Tasks are linked to people by `tasks.owner_email` (set from the directory when a
task is created or reassigned), not by matching the free-text `owner` name. The
name column is kept in sync for display and CSV export.

---

### 5. Configure frontend environment

```bash
cp frontend/.env.example frontend/.env
# Fill in:
#   VITE_API_URL=https://api.gyftr.net
#   VITE_COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
#   VITE_COGNITO_CLIENT_ID=...
```

---

### 6. Configure backend environment

On the EC2 server, create `/app/gyftr-portal/backend/.env`:

```
PORT=3001
AWS_SECRET_NAME=gyftr/portal/db
COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
COGNITO_CLIENT_ID=...
COGNITO_REGION=ap-south-1
FRONTEND_URL=https://portal.gyftr.net
```

---

### 7. Build & deploy frontend

```bash
npm run build                    # outputs to frontend/dist
aws s3 sync frontend/dist/ s3://gyftr-portal-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <CF_ID> --paths "/*"
```

---

### 8. Start backend

```bash
# SSH into EC2
cd /app/gyftr-portal/backend
pm2 start server.js --name gyftr-api
pm2 save
```

---

## Logging in

### Either company domain works

Staff are on `@gyftr.net`; some people (and interns as they convert) are on
`@gyftr.com`. **Both work, and nobody needs migrating.** Identity is the part
before the `@`, so `sunil.d@gyftr.net` and `sunil.d@gyftr.com` are the same
person — same team, same access level, same tasks.

Accepted domains are set by `COMPANY_EMAIL_DOMAINS` in the backend env
(default `gyftr.net,gyftr.com`). Add a domain there rather than in code.

One consequence worth knowing: a person must have **one** account, not two. If
the same name part appears on both domains you get two directory records with
two separate sets of tasks. `node audit-access.js` flags this — merge them in
Admin → Team Directory if it ever happens.

### Passwords

`default@123` is a **temporary** password only. On first login the portal
requires a new one, and there is no shared password afterwards. If someone is
locked out, reset them from the Cognito console (or
`node force-password-reset.js --only=<email>`) — never set a permanent password.

The authoritative roster is **`scripts/roster.json`** (bootstrap) and the
`users` table (live). For the current list of people and their access levels,
run `cd scripts && node audit-access.js` rather than trusting a list in a doc.

A roster entry is `prefix` + the default `emailDomain`, unless it carries an
explicit `email` field for someone on a different domain.

### If a whole domain ever does need moving

`scripts/migrate-email-domain.js` exists for that (Cognito usernames cannot be
renamed, so it creates new accounts, disables the old ones, and rewrites the
database references in one transaction). **It is not needed for normal
operation** — both domains already work side by side.

> The infrastructure hostnames (`api.gyftr.net`, `portal.gyftr.net`) are a
> separate matter from user accounts and are not changed by that script.

---

## Key files to know

| File | What to change |
|---|---|
| `frontend/src/constants/index.js` | Properties, task types, statuses, colours — **not people** |
| `backend/identity.js` | How a Cognito login maps to a directory user |
| `backend/permissions.js` | Who can see and change what — the access rules |
| `backend/routes/tasks.js` | Task API logic + who can see which tasks |
| `backend/routes/users.js` | Directory API (`/api/users`, `/api/users/me`) |
| `backend/routes/effort.js` | Effort logging API |
| `backend/schema.sql` | Tables/columns — applied automatically on backend boot |
| `backend/db.js` | DB connection (Secrets Manager or direct) |
| `frontend/src/lib/directory.js` | Frontend directory lookups (names, teams, colours) |
| `scripts/roster.json` | One-time bootstrap roster (Cognito + first DB seed only) |
| `infra/aws-setup.md` | Full AWS setup instructions |

> Team members, their teams and their roles are **not** in any of these files.
> Change them in the portal under **Admin · PMO → Team Directory**.

---

## Ongoing deployments

**Frontend change** → build + sync to S3 + CloudFront invalidation  
**Backend change** → git pull on EC2 + `pm2 restart gyftr-api`

---

## Support

Codebase was built and handed over by Yash Tahlyani (yash.tahlyani@gyftr.net).
