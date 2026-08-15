# GyFTR Portal — Frontend (React + Vite → static serve)
# Base image is ARM — build/run on linux/arm64 (e.g. Graviton).
#
# Build:
#   docker build --platform linux/arm64 \
#     --build-arg VITE_API_URL=https://backend-portal.gyftr.net \
#     --build-arg VITE_COGNITO_USER_POOL_ID=ap-south-1_xxx \
#     --build-arg VITE_COGNITO_CLIENT_ID=xxx \
#     -f frontend/Dockerfile -t gyftr-portal-frontend ./frontend
#
# Or from repo root:
#   docker compose up --build
#
# Run:
#   docker run --platform linux/arm64 -p 7867:7867 gyftr-portal-frontend

ARG BASE_IMAGE=653380732738.dkr.ecr.ap-south-1.amazonaws.com/node-24.18.0-alpine3.24-arm:node-24.18.0-alpine3.24-arm

# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM ${BASE_IMAGE} AS build

WORKDIR /app

COPY package.json package-lock.json ./

# Base image sets NODE_ENV=production, which makes npm skip devDependencies
# (vite lives there). Override it for the install only — `vite build` must run
# with NODE_ENV=production so the bundle is not built in dev mode.
RUN NODE_ENV=development npm ci --include=dev

COPY index.html vite.config.js eslint.config.js ./
COPY public ./public
COPY src ./src

# Vite embeds these at build time
ARG VITE_API_URL
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID

RUN npm run build

# ── Stage 2: serve static files ─────────────────────────────────────────────
FROM ${BASE_IMAGE}

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 7867

# Bind explicitly to 0.0.0.0. `-l 7867` leaves the interface to serve's
# defaults; if that ever resolves to localhost the container looks fine from
# inside while the load balancer health check fails from outside — which
# presents as a 503 with a perfectly running container.
# `-s` rewrites unknown paths to index.html, which the SPA router needs.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:7867/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:7867"]
