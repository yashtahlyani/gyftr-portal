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

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Migration script dependencies
cd scripts && npm install && cd ..
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

### 3. Migrate database from Supabase → RDS

First, import the schema into RDS (get the schema from Supabase dashboard → SQL Editor → run `\d` or use pg_dump). Then run the data migration script:

```bash
cd scripts

# Set these env vars (use RDS credentials from step 2):
export RDS_HOST=gyftr-portal.xxxx.ap-south-1.rds.amazonaws.com
export RDS_USER=gyftr_admin
export RDS_PASSWORD=yourpassword
export RDS_DB=postgres

# SUPABASE_PAT is already hardcoded in the script — just run it:
node migrate-db.js
```

This copies all tasks, effort entries, comments, and audit logs from Supabase to RDS.

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

This creates **21 users** (all team members) with password `default@123`.
Users can be reset individually from the Cognito console later.

---

### 5. Configure frontend environment

```bash
cp .env.example .env
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
npm run build
aws s3 sync dist/ s3://gyftr-portal-frontend/ --delete
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

## Default login credentials

All users: `<prefix>@gyftr.net` / `default@123`

| Email | Name | Role |
|---|---|---|
| yash.tahlyani@gyftr.net | Yash Tahlyani | Super Admin |
| anirudh.motwani@gyftr.net | Anirudh Motwani | Super Admin |
| ceo.office@gyftr.net | Anushka Mishra | Super Admin |
| deepankar.h@gyftr.net | Deepankar Hemnani | Content Manager |
| ajay.k@gyftr.net | Ajay Kumar | Creative Manager |
| deepak.verma@gyftr.net | Deepak Verma | Creative |
| ashutosh.j@gyftr.net | Ashutosh Kumar | Creative |
| sunil.d@gyftr.net | Sunil Dhyani | Creative |
| amit.c@gyftr.net | Amit Chauhan | Creative |
| shervir@gyftr.net | Shervir | Creative |
| amit.bhattacharjee@gyftr.net | Amit Bhattacharjee | Creative |
| ashish.t@gyftr.net | Ashish Kumar Tiwari | Creative |
| ananya.saril@gyftr.net | Ananya Saril | Content |
| reet@gyftr.net | Reet Suman | Content |
| uday.jadoun@gyftr.net | Uday Jadoun | Content |
| vanshika.atri@gyftr.net | Vanshika Atri | Content |
| sakshi.s1@gyftr.net | Sakshi Sharma | Content |
| snigdha.b@gyftr.net | Snigdha Banerjee | Content |
| priyanshu@gyftr.net | Priyanshu | Content |
| harshita.m@gyftr.net | Harshita M | Content |
| saim.k@gyftr.net | Saim | Content |

---

## Key files to know

| File | What to change |
|---|---|
| `src/constants/index.js` | Add/remove team members, properties, task types |
| `src/hooks/useAuth.js` | Add/remove super admin or manager emails |
| `backend/routes/tasks.js` | Task API logic |
| `backend/routes/effort.js` | Effort logging API |
| `backend/db.js` | DB connection (Secrets Manager or direct) |
| `infra/aws-setup.md` | Full AWS setup instructions |

---

## Ongoing deployments

**Frontend change** → build + sync to S3 + CloudFront invalidation  
**Backend change** → git pull on EC2 + `pm2 restart gyftr-api`

---

## Support

Codebase was built and handed over by Yash Tahlyani (yash.tahlyani@gyftr.net).
