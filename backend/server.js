// server.js — GyFTR Portal API
// Express backend on EC2 (behind an ALB). Data in RDS Postgres,
// auth via AWS Cognito JWT, DB credentials via AWS Secrets Manager.

import 'dotenv/config';
import express      from 'express';
import cors         from 'cors';
import { initDb }   from './db.js';
import { requireAuth } from './middleware/auth.js';
import taskRoutes    from './routes/tasks.js';
import effortRoutes  from './routes/effort.js';
import commentRoutes from './routes/comments.js';
import auditRoutes   from './routes/audit.js';
import userRoutes    from './routes/users.js';
import propertyRoutes from './routes/properties.js';

const app  = express();
const PORT = process.env.PORT || 7878;

// ── Middleware ─────────────────────────────────────────────────────────────
// Only the deployed frontend (and local dev) may call this API. The previous
// default of '*' both defeated the point and is invalid alongside credentials.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === 'production' ? [] : [
    'http://localhost:7867',
    'http://localhost:5173',
    'http://localhost:4173',
  ]),
].filter(Boolean);

if (!ALLOWED_ORIGINS.length) {
  console.warn('[server] FRONTEND_URL is not set — all cross-origin requests will be refused.');
}

app.use(cors({
  origin(origin, cb) {
    // Same-origin / curl / health checks send no Origin header.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check (no auth needed) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Protected routes (all require valid Cognito token) ─────────────────────
app.use('/api/users',      requireAuth, userRoutes);
app.use('/api/properties', requireAuth, propertyRoutes);
app.use('/api/tasks',    requireAuth, taskRoutes);
app.use('/api/effort',   requireAuth, effortRoutes);
app.use('/api/comments', requireAuth, commentRoutes);
app.use('/api/audit',    requireAuth, auditRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[server] Failed to start:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
