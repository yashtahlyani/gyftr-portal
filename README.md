# GyFTR Marketing Portal

Internal work-tracking portal for the GyFTR Content & Creative teams. Tasks,
assignments, effort logging and reporting.

Runs entirely on AWS.

| Layer | Service |
|---|---|
| Frontend | React + Vite (Docker / S3 + CloudFront) |
| API | Express (Docker / EC2 behind ALB) |
| Database | RDS Postgres |
| Auth | Cognito user pool |
| Secrets | Secrets Manager (DB credentials) |

The browser never talks to the database. Every read and write goes through the
API, which verifies a Cognito ID token and applies the access rules in
`backend/permissions.js`.

## Structure

```
gyftr-portal/
├── frontend/          # React + Vite (+ Dockerfile, buildspec)
├── backend/           # Express API (+ Dockerfile, buildspec)
├── docker-compose.yml # Local run of both services
├── .env.example
├── package.json       # Convenience scripts
├── infra/             # AWS setup notes
└── scripts/           # Cognito / identity helpers
```

## Running locally

```bash
npm run install:all

cp frontend/.env.example frontend/.env   # VITE_COGNITO_* and VITE_API_URL
cp backend/.env.example backend/.env

npm run dev:backend    # API on :7878
npm run dev:frontend   # UI on :7867
```

## Docker (both services)

```bash
cp .env.example .env   # fill values
docker compose up --build
```

- Frontend: https://portal.gyftr.net (local `:7867`)
- Backend:  https://backend-portal.gyftr.net (local `:7878`)

## Nothing is hardcoded

People, access levels and the property list all live in RDS and are edited in
the portal, not in the source:

| What | Where it lives | Who changes it |
|---|---|---|
| Who can log in | Cognito | Cognito console / `scripts/create-cognito-users.js` |
| Name, team, access level | `users` table | Admin · PMO → **Team Directory** |
| Property list and colours | `properties` table | Admin · PMO → **Manage Properties** |
| Task types, statuses, priorities | `frontend/src/constants/index.js` | code (fixed vocabulary) |

`backend/schema.sql` is applied automatically on API start-up, so there is no
manual migration step.

## Operations

```bash
cd scripts && npm install

node audit-access.js              # who has what access, + anomaly warnings
node sync-users.js --dry-run      # reconcile Cognito → users table
node backfill-identity.js --dry-run   # repair task↔user links
node force-password-reset.js --dry-run   # force everyone to set a new password
node migrate-email-domain.js --dry-run   # move users to a new email domain
```

Every script supports `--dry-run`. Always use it first.

See **[HANDOVER.md](HANDOVER.md)** for full setup, access levels and day-to-day
operations, and **[infra/aws-setup.md](infra/aws-setup.md)** for provisioning
the AWS resources.
