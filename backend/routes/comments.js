// routes/comments.js — add comments / audit log entries

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/comments
router.post('/', async (req, res) => {
  const { task_id, author, role, body } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO comments (task_id, author, role, body)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [task_id, author, role || 'Team', body]
    );
    await query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [task_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /comments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit — log a single audit entry (or array of entries)
router.post('/audit', async (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  try {
    for (const e of entries) {
      await query(
        'INSERT INTO audit_log (task_id, action, by_user) VALUES ($1, $2, $3)',
        [e.task_id, e.action, e.by_user]
      );
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[POST /audit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
