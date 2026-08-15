// server.js — GyFTR Portal API
// Express backend on EC2 (behind an ALB). Data in RDS Postgres,
// auth via AWS Cognito JWT, DB credentials via AWS Secrets Manager.

import 'dotenv/config';
import express      from 'express';
import cors         from 'cors';
import { initDbWithRetry, isDbReady, dbLastError, query } from './db.js';
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
// Liveness — is the process up? This is what the ALB target group polls.
// Deliberately does NOT touch the database: a brief RDS blip would otherwise
// deregister every instance at once and turn a degraded service into a total
// outage.
app.get('/health', (_req, res) => res.json({ ok: true, service: 'gyftr-portal-api' }));

// Readiness — can it actually serve? Verifies the database round-trips.
// `/health` returning ok while every request 500s is the failure mode that
// keeps costing us time: pm2 says online, the ALB says healthy, and the portal
// is dead. Use this one when diagnosing, and from scripts/smoke-test.js.
app.get('/health/deep', async (_req, res) => {
  const started = Date.now();
  if (!isDbReady()) {
    return res.status(503).json({
      ok: false,
      database: 'not ready',
      error: dbLastError() || 'still connecting',
      hint: 'The API is running but cannot reach RDS. Check the DB_* / AWS_SECRET_NAME values and the RDS security group.',
    });
  }
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: 'reachable', latencyMs: Date.now() - started });
  } catch (err) {
    console.error('[health/deep] database unreachable:', err.message);
    res.status(503).json({
      ok: false,
      database: 'unreachable',
      error: err.message,
      latencyMs: Date.now() - started,
    });
  }
});

// ── Protected routes (all require valid Cognito token) ─────────────────────
// Without the database there is nothing to serve. Say so in a way somebody can
// act on, rather than letting requests fail with an opaque error.
app.use('/api', (req, res, next) => {
  if (isDbReady()) return next();
  res.status(503).json({
    error: 'The portal is starting up or cannot reach its database. ' +
           (dbLastError() || 'Retrying.') +
           ' Check GET /health/deep for the current status.',
  });
});

app.use('/api/users',      requireAuth, userRoutes);
app.use('/api/properties', requireAuth, propertyRoutes);
app.use('/api/tasks',    requireAuth, taskRoutes);
app.use('/api/effort',   requireAuth, effortRoutes);
app.use('/api/comments', requireAuth, commentRoutes);
app.use('/api/audit',    requireAuth, auditRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
// Listen FIRST, connect second. If the database is unreachable the API still
// answers /health (so the load balancer keeps a target and the box stays
// reachable) and /health/deep reports exactly why. Previously this awaited
// initDb() and exited on failure, so an RDS problem crash-looped the container
// and the ALB returned a bare 503 with nothing to diagnose.
app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  initDbWithRetry().catch(err => {
    console.error('[server] Database retry loop stopped unexpectedly:', err);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled rejection:', err);
});
