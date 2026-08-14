// routes/comments.js — task comments

import { Router } from 'express';
import { query } from '../db.js';
import { canSeeTask } from '../permissions.js';

const router = Router();

// POST /api/comments
router.post('/', async (req, res) => {
  const { task_id, role, body } = req.body;

  const { rows: t } = await query('SELECT * FROM tasks WHERE id = $1', [task_id]);
  if (!t[0]) return res.status(404).json({ error: 'Task not found' });
  if (!canSeeTask(req.identity, t[0])) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }

  try {
    // Author comes from the verified token, not the request body.
    const { rows } = await query(
      `INSERT INTO comments (task_id, author, role, body)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [task_id, req.identity.name, role || 'Team', body]
    );
    await query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [task_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /comments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
