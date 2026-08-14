// routes/audit.js — task audit trail.
//
// Previously this shared a router with comments.js and was mounted at
// /api/audit, so POST /api/audit matched the comments handler and every audit
// entry was silently written as an empty comment row. It has its own router now.

import { Router } from 'express';
import { query } from '../db.js';
import { canSeeTask } from '../permissions.js';

const router = Router();

// POST /api/audit — log a single audit entry, or an array of them
router.post('/', async (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  try {
    for (const e of entries) {
      const { rows: t } = await query('SELECT * FROM tasks WHERE id = $1', [e.task_id]);
      if (!t[0] || !canSeeTask(req.identity, t[0])) {
        return res.status(403).json({ error: 'You do not have access to this task' });
      }
      // Attribution comes from the verified token, not the request body.
      await query(
        'INSERT INTO audit_log (task_id, action, by_user) VALUES ($1, $2, $3)',
        [e.task_id, e.action, req.identity.name]
      );
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[POST /audit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
