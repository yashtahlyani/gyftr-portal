// server.js — GyFTR Portal API
// Express backend that replaces direct Supabase calls.
// Runs on EC2 / Lambda (with serverless-http). Auth via AWS Cognito JWT.

import 'dotenv/config';
import express      from 'express';
import cors         from 'cors';
import { initDb }   from './db.js';
import { requireAuth } from './middleware/auth.js';
import taskRoutes   from './routes/tasks.js';
import effortRoutes from './routes/effort.js';
import commentRoutes from './routes/comments.js';

const app  = express();
const PORT = process.env.PORT || 7878;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// ── Health check (no auth needed) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Protected routes (all require valid Cognito token) ─────────────────────
app.use('/api/tasks',    requireAuth, taskRoutes);
app.use('/api/effort',   requireAuth, effortRoutes);
app.use('/api/comments', requireAuth, commentRoutes);
app.use('/api/audit',    requireAuth, commentRoutes); // audit is in commentRoutes

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
