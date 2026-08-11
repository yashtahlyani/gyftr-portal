# GyFTR Portal

Internal work-tracking portal — React frontend + Express backend.

## Structure

```
gyftr-portal/
├── frontend/          # React + Vite app (+ Dockerfile)
├── backend/           # Express API (+ Dockerfile)
├── docker-compose.yml # Local run of both services
├── .env.example
├── package.json       # Convenience scripts
├── infra/             # AWS setup notes
└── scripts/           # Migration / Cognito helpers
```

## Local development

```bash
npm run install:all

# Terminal 1 — API
cp backend/.env.example backend/.env   # fill values
npm run dev:backend

# Terminal 2 — UI
cp frontend/.env.example frontend/.env # fill values
npm run dev:frontend
```

## Docker (both services)

```bash
cp .env.example .env   # fill values
docker compose up --build
```

- Frontend: https://portal.gyftr.net  
- Backend:  https://backend-portal.gyftr.net  

Local Compose ports: frontend `:7867`, backend `:7878`.

See `HANDOVER.md` and `infra/aws-setup.md` for production AWS deployment.
