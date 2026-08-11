# GyFTR Portal — Backend API
FROM 653380732738.dkr.ecr.ap-south-1.amazonaws.com/node-24.18.0-alpine3.24-arm:node-24.18.0-alpine3.24-arm

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY . .

ENV NODE_ENV=production
ENV PORT=7878
ENV AWS_SECRET_NAME=gyftr/portal/db

EXPOSE 7878

# Env vars (DB_*, COGNITO_*, FRONTEND_URL, AWS_SECRET_NAME, etc.)
# are injected at runtime — do not bake secrets into the image.
CMD ["node", "server.js"]
