# AWS Setup Guide — GyFTR Portal

Full migration from Vercel + Supabase to AWS.  
**Region**: ap-south-1 (Mumbai) throughout.

---

## 1. RDS Postgres (replaces Supabase DB)

1. Go to **RDS → Create database**.
2. Engine: **PostgreSQL 16**, template: **Free tier** (or Production for live).
3. DB identifier: `gyftr-portal`, master username: `gyftr_admin`.
4. Instance: `db.t3.micro` (upgrade to `db.t3.small` for production).
5. VPC: default, **Public access: No** (EC2 will connect via private subnet).
6. Create a **security group** `gyftr-rds-sg` — inbound: PostgreSQL 5432 from `gyftr-ec2-sg` only.
7. After creation, note the **Endpoint** (e.g. `gyftr-portal.xxxx.ap-south-1.rds.amazonaws.com`).
8. Connect via EC2 bastion or psql tunnel and run the existing Supabase schema DDL (see §8).

---

## 2. AWS Secrets Manager (replaces .env)

1. Go to **Secrets Manager → Store a new secret**.
2. Type: **Other type of secret**.
3. Add key/value pairs:
   - `DB_HOST` → RDS endpoint
   - `DB_PORT` → `5432`
   - `DB_NAME` → `postgres`
   - `DB_USER` → `gyftr_admin`
   - `DB_PASSWORD` → (your RDS password)
4. Secret name: `gyftr/portal/db`.
5. The backend reads this at startup via `AWS_SECRET_NAME=gyftr/portal/db`.

---

## 3. AWS Cognito (replaces Supabase Auth)

1. Go to **Cognito → Create user pool**.
2. Sign-in options: **Email**.
3. Password policy: minimum 8 chars, require uppercase + number.
4. MFA: optional (off for now).
5. User pool name: `gyftr-portal-users`.
6. App client name: `gyftr-portal-web`, type: **Public client**, no secret.
7. Note the **User Pool ID** (e.g. `ap-south-1_AbcXYZ`) and **Client ID**.
8. Put these in frontend `.env`:
   ```
   VITE_COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
   VITE_COGNITO_CLIENT_ID=...
   ```
9. **Migrate users**: for each existing Supabase user, go to **Users → Create user** in the Cognito console and set their `@gyftr.net` email + temporary password. They'll reset on first login.

---

## 4. EC2 (runs the Express backend)

1. Go to **EC2 → Launch instance**.
2. AMI: **Amazon Linux 2023**, instance type: `t3.small`.
3. Key pair: create `gyftr-portal-key` and download `.pem`.
4. Security group `gyftr-ec2-sg`: inbound port 3001 from ALB sg, port 22 from your IP only.
5. IAM role: create role `gyftr-ec2-role` with policies:
   - `SecretsManagerReadWrite` (or a custom policy scoped to `gyftr/portal/*`)
6. Assign the IAM role to the EC2 instance.
7. SSH in and run:
   ```bash
   sudo dnf install -y nodejs git
   git clone <repo> /app/gyftr-portal
   cd /app/gyftr-portal/backend
   npm install
   # Create /app/gyftr-portal/backend/.env with:
   # PORT=3001
   # AWS_SECRET_NAME=gyftr/portal/db
   # COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
   # COGNITO_CLIENT_ID=...
   # COGNITO_REGION=ap-south-1
   # FRONTEND_URL=https://portal.gyftr.net
   node server.js
   ```
8. Use **PM2** to keep it running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name gyftr-api
   pm2 startup && pm2 save
   ```

---

## 5. Application Load Balancer (HTTPS for the API)

1. Go to **EC2 → Load Balancers → Create ALB**.
2. Name: `gyftr-api-alb`, scheme: **Internet-facing**.
3. Listener: HTTPS 443 (attach an ACM certificate for `api.gyftr.net`).
4. Target group: `gyftr-api-tg`, protocol HTTP, port 3001, target: the EC2 instance.
5. In Route53 (or your DNS): add `api.gyftr.net` CNAME → ALB DNS name.
6. Set `VITE_API_URL=https://api.gyftr.net` in the frontend `.env`.

---

## 6. S3 + CloudFront (hosts the React frontend)

1. Go to **S3 → Create bucket**: `gyftr-portal-frontend`.
2. Uncheck "Block all public access" — the bucket is served via CloudFront only (keep bucket policy private).
3. **Build the frontend**:
   ```bash
   cd /path/to/gyftr-portal
   npm install
   npm run build   # outputs to dist/
   ```
4. Upload `dist/` contents to S3:
   ```bash
   aws s3 sync dist/ s3://gyftr-portal-frontend/ --delete
   ```
5. Go to **CloudFront → Create distribution**:
   - Origin: `gyftr-portal-frontend.s3.ap-south-1.amazonaws.com`
   - Origin access: **Origin Access Control (OAC)** — let CloudFront auto-create the bucket policy.
   - Viewer protocol: Redirect HTTP → HTTPS.
   - Default root object: `index.html`.
   - Custom error page: 404 → `/index.html` (so React Router works).
   - Attach ACM certificate for `portal.gyftr.net`.
6. In Route53: add `portal.gyftr.net` CNAME → CloudFront domain.

---

## 7. Deploy updates

**Backend** (on EC2):
```bash
cd /app/gyftr-portal && git pull
cd backend && npm install
pm2 restart gyftr-api
```

**Frontend** (from your laptop):
```bash
npm run build
aws s3 sync dist/ s3://gyftr-portal-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <CF_ID> --paths "/*"
```

---

## 8. Database schema migration from Supabase

Export schema from Supabase:
```bash
# In Supabase dashboard → Settings → Database → Connection string
pg_dump "postgres://postgres:<pass>@<host>:5432/postgres" \
  --schema-only --no-owner -f schema.sql
```

Import to RDS:
```bash
psql "postgres://gyftr_admin:<pass>@<rds-endpoint>:5432/postgres" -f schema.sql
```

Export + import data:
```bash
pg_dump "postgres://postgres:<pass>@<supabase-host>:5432/postgres" \
  --data-only --no-owner -f data.sql
psql "postgres://gyftr_admin:<pass>@<rds-endpoint>:5432/postgres" -f data.sql
```

**Note**: Supabase RLS policies are Supabase-specific — don't export them. Access control is now handled by the Express backend (`requireAuth` middleware + the hardcoded role lists in `useAuth.js`).

---

## 9. Environment variables summary

| Variable | Where | Value |
|---|---|---|
| `VITE_API_URL` | Frontend `.env` | `https://api.gyftr.net` |
| `VITE_COGNITO_USER_POOL_ID` | Frontend `.env` | From Cognito console |
| `VITE_COGNITO_CLIENT_ID` | Frontend `.env` | From Cognito console |
| `PORT` | Backend `.env` | `3001` |
| `AWS_SECRET_NAME` | Backend `.env` | `gyftr/portal/db` |
| `COGNITO_USER_POOL_ID` | Backend `.env` | Same as frontend |
| `COGNITO_CLIENT_ID` | Backend `.env` | Same as frontend |
| `COGNITO_REGION` | Backend `.env` | `ap-south-1` |
| `FRONTEND_URL` | Backend `.env` | `https://portal.gyftr.net` |

---

## 10. Key files reference

| File | Purpose |
|---|---|
| `backend/server.js` | Express app entry point |
| `backend/db.js` | RDS connection pool + Secrets Manager loader |
| `backend/middleware/auth.js` | Cognito JWT verification |
| `backend/routes/tasks.js` | Task CRUD API |
| `backend/routes/effort.js` | Effort entries API |
| `backend/routes/comments.js` | Comments + audit log API |
| `src/lib/api.js` | Frontend API client (fetch wrapper) |
| `src/hooks/useAuth.js` | Cognito login/session |
| `src/hooks/useTaskStore.js` | All task state + DB operations |
