# Deploying the Marketing Portal

Release runbook. For first-time AWS provisioning see
[`infra/aws-setup.md`](infra/aws-setup.md); for architecture and access levels
see [`HANDOVER.md`](HANDOVER.md).

---

## Read this before the first deploy of the identity release

The `users` table starts **empty**. If anyone signs in before
`scripts/sync-users.js` has run, they are auto-provisioned as **Employee /
Content** — including the people who should be Super Admins.

`sync-users.js` never overwrites an existing row, so running it afterwards will
**not** correct them. You would be left with no Super Admin, no Admin, no
Admin · PMO tab, nobody able to create tasks, and a Team Directory that cannot
be opened to fix any of it.

**So: run step 3 before telling anyone the portal is live.**

If it already happened, one statement gets you back in, then fix the rest from
Admin → Team Directory:

```sql
UPDATE users SET role='super_admin', team='Admin'
WHERE email='yash.tahlyani@gyftr.net';
```

---

## 1. Backend

```bash
cd /app/marketing-portal && git pull
npm --prefix backend install
pm2 restart gyftr-api
```

`backend/schema.sql` applies itself on start-up — additive and idempotent, so
restarting is always safe. On the very first boot it also seeds the property
list from `backend/seed/properties.json`.

Check it came up:

```bash
curl -s localhost:7878/health     # {"ok":true}
pm2 logs gyftr-api --lines 30
```

## 2. Frontend

```bash
cd /app/marketing-portal
npm --prefix frontend install

# frontend/.env is gitignored — create it if this is a fresh checkout.
# Without it the build succeeds but every login fails.
cp frontend/.env.example frontend/.env   # fill VITE_API_URL + VITE_COGNITO_*

npm run build                             # outputs to frontend/dist
aws s3 sync frontend/dist/ s3://<bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

Tell users to hard-refresh (Ctrl+Shift+R). CloudFront takes a minute to
invalidate and the browser will otherwise keep running the old bundle — which
looks exactly like the deploy not working.

## 3. Identity — first release only

```bash
cd scripts && npm install
export COGNITO_USER_POOL_ID=<pool-id>  AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=<key>         AWS_SECRET_ACCESS_KEY=<secret>
export RDS_HOST=<endpoint>  RDS_USER=<user>  RDS_PASSWORD=<pass>  RDS_DB=<db>

node sync-users.js --dry-run       && node sync-users.js
node backfill-identity.js --dry-run && node backfill-identity.js
```

`backfill-identity.js` links tasks to people by email instead of by matching a
display-name string, and reports any task whose owner matches nobody. Those are
exactly the tasks that go missing from someone's portal.

## 4. Require everyone to set their own password

```bash
node force-password-reset.js --dry-run
node force-password-reset.js            # prompts at next login
node force-password-reset.js --signout  # ...or ends live sessions now
```

## 5. Verify the deploy actually works

```bash
cd scripts
export SMOKE_API_URL=https://api.gyftr.net
export SMOKE_ORIGIN=https://<your-cloudfront-domain>   # enables the CORS check

# optional but worth it — proves auth and real data end to end
export SMOKE_TOKEN=$(aws cognito-idp admin-initiate-auth   --user-pool-id <pool-id> --client-id <client-id>   --auth-flow ADMIN_USER_PASSWORD_AUTH   --auth-parameters USERNAME=<email>,PASSWORD=<password>   --query 'AuthenticationResult.IdToken' --output text)

npm run smoke-test
```

Checks the four things that have caused every login incident so far: the API
answers, the database round-trips, protected routes reject anonymous callers,
and CORS accepts the CloudFront origin. That last one is the check curl from
the server cannot do for you — the browser is what gets blocked.

Exits non-zero on failure, so it is safe to wire into a deploy script.

## 6. Review access

```bash
node audit-access.js                       # readable report + warnings
node audit-access.js --csv > access-review.csv
```

Warns if there is no Super Admin, a team has no Admin, someone would see no
tasks, or a person exists on both email domains.

---

## Do not run

**`migrate-email-domain.js`** — both `@gyftr.net` and `@gyftr.com` are accepted.
Identity is the part before the `@`, so nobody needs migrating. The script is
kept only for retiring a domain entirely.

---

## If something looks wrong

| Symptom | Likely cause |
|---|---|
| Every login fails right after a deploy | `frontend/.env` missing when the bundle was built — `VITE_COGNITO_*` empty |
| "Your session expired" after ~1 hour | Expected if the refresh token is gone; otherwise check the system clock on the client |
| Browser blocks API calls (CORS) | `FRONTEND_URL` in `backend/.env` must match the CloudFront origin exactly — no trailing slash |
| Spinner forever, no error | Older bundle without the request timeout. Rebuild the frontend. |
| Nobody can see the Admin tab | `sync-users.js` was not run before first login — see the top of this file |
| A user sees none of their tasks | Run `backfill-identity.js --dry-run` |

Rollback: `git checkout <previous-sha>`, reinstall, `pm2 restart` for the API,
and re-sync the previous `frontend/dist/` to S3. Schema changes are additive,
so an older build runs fine against the newer database.
