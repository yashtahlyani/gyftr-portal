// routes/effort.js — effort_entries CRUD + Dashboard direct query

import { Router } from 'express';
import { query } from '../db.js';
import { canSeeTask } from '../permissions.js';

const router = Router();

// Effort may only be logged against a task the caller can actually see.
async function assertTaskAccess(identity, taskId) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  if (!rows[0]) return 'Task not found';
  return canSeeTask(identity, rows[0]) ? null : 'You do not have access to this task';
}

// GET /api/effort?from=YYYY-MM-DD&to=YYYY-MM-DD
// Effort entries with an optional date range, scoped to the tasks the caller
// may see — same rule as GET /api/tasks, so hours cannot leak across teams.
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  let sql    = `SELECT e.task_id, e.date, e.hours, e.status
                  FROM effort_entries e JOIN tasks t ON t.id = e.task_id`;
  const vals = [];
  const cond = [];

  const id = req.identity;
  if (id.role === 'manager') {
    cond.push(`t.team = $${vals.length + 1}`); vals.push(id.team);
  } else if (id.role !== 'super_admin') {
    vals.push(id.email, id.name);
    cond.push(`(t.owner_email = $${vals.length - 1}
                OR t.business_owner_email = $${vals.length - 1}
                OR lower(btrim(t.owner)) = lower(btrim($${vals.length})))`);
  }
  if (from) { cond.push(`e.date >= $${vals.length + 1}`); vals.push(from); }
  if (to)   { cond.push(`e.date <= $${vals.length + 1}`); vals.push(to);   }
  if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
  try {
    const { rows } = await query(sql, vals);
    res.json(rows);
  } catch (err) {
    console.error('[GET /effort]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/effort — log an effort entry
router.post('/', async (req, res) => {
  const { task_id, date, status, hours, manual } = req.body;
  const denied = await assertTaskAccess(req.identity, task_id);
  if (denied) return res.status(denied === 'Task not found' ? 404 : 403).json({ error: denied });
  try {
    const { rows } = await query(
      `INSERT INTO effort_entries (task_id, date, status, hours, manual)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [task_id, date, status, hours, manual || false]
    );
    await query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [task_id]);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('[POST /effort]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/effort/:id — delete a single effort entry by its UUID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get task_id so we can touch updated_at on the parent task
    const { rows } = await query('SELECT task_id FROM effort_entries WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Effort entry not found' });
    const denied = await assertTaskAccess(req.identity, rows[0].task_id);
    if (denied) return res.status(denied === 'Task not found' ? 404 : 403).json({ error: denied });

    await query('DELETE FROM effort_entries WHERE id = $1', [id]);
    if (rows[0]?.task_id) {
      await query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [rows[0].task_id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /effort/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
