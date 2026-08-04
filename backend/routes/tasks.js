// routes/tasks.js — CRUD for tasks + related audit/delete cascade

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// ── Shared SQL: fetch all tasks with joined relations ──────────────────────
const TASKS_QUERY = `
  SELECT
    t.*,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'id', ee.id, 'task_id', ee.task_id, 'date', ee.date,
        'status', ee.status, 'hours', ee.hours, 'manual', ee.manual,
        'created_at', ee.created_at
      )) FILTER (WHERE ee.id IS NOT NULL), '[]'
    ) AS effort_entries,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'id', c.id, 'task_id', c.task_id, 'author', c.author,
        'role', c.role, 'body', c.body, 'created_at', c.created_at
      )) FILTER (WHERE c.id IS NOT NULL), '[]'
    ) AS comments,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'id', al.id, 'task_id', al.task_id, 'action', al.action,
        'by_user', al.by_user, 'created_at', al.created_at
      )) FILTER (WHERE al.id IS NOT NULL), '[]'
    ) AS audit_log,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'id', tf.id, 'task_id', tf.task_id
      )) FILTER (WHERE tf.id IS NOT NULL), '[]'
    ) AS task_files
  FROM tasks t
  LEFT JOIN effort_entries ee ON ee.task_id = t.id
  LEFT JOIN comments       c  ON c.task_id  = t.id
  LEFT JOIN audit_log      al ON al.task_id = t.id
  LEFT JOIN task_files     tf ON tf.task_id = t.id
  GROUP BY t.id
  ORDER BY t.updated_at DESC
`;

// GET /api/tasks — fetch all tasks with all related data
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(TASKS_QUERY);
    res.json(rows);
  } catch (err) {
    console.error('[GET /tasks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/next-id — returns next MKT-XX id
router.get('/next-id', async (req, res) => {
  try {
    const { rows } = await query('SELECT id FROM tasks');
    const max = rows.reduce((m, r) => {
      const n = parseInt(r.id.split('-')[1] || '0', 10);
      return Math.max(m, n);
    }, 0);
    res.json({ nextId: 'MKT-' + String(max + 1).padStart(2, '0') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create new task
router.post('/', async (req, res) => {
  const f = req.body;
  try {
    await query(
      `INSERT INTO tasks
        (id, team, property, task, type, owner, business_owner, priority,
         effort_status, project_status, lock_state, expected, due,
         delivered, description, running, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        f.id, f.team, f.property, f.task, f.type, f.owner, f.business_owner,
        f.priority, 'Discussion', 'Discussion', 'unlocked',
        f.expected || null, f.due || null, null, '', false, null,
      ]
    );
    res.status(201).json({ id: f.id });
  } catch (err) {
    console.error('[POST /tasks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update task fields
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Map frontend field names → DB column names
  const colMap = {
    property:      'property',
    task:          'task',
    type:          'type',
    owner:         'owner',
    businessOwner: 'business_owner',
    priority:      'priority',
    effortStatus:  'effort_status',
    projectStatus: 'project_status',
    lockState:     'lock_state',
    due:           'due',
    delivered:     'delivered',
    running:       'running',
    startedAt:     'started_at',
    description:   'description',
  };

  const setClauses = [];
  const values     = [];
  let   idx        = 1;

  for (const [key, col] of Object.entries(colMap)) {
    if (updates[key] !== undefined) {
      let val = updates[key];
      if (key === 'startedAt') val = val ? new Date(val).toISOString() : null;
      if (key === 'due' || key === 'delivered') val = val || null;
      setClauses.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) return res.json({ ok: true });

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  try {
    await query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /tasks/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — cascade delete all related records then the task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM effort_entries WHERE task_id = $1', [id]);
    await query('DELETE FROM comments       WHERE task_id = $1', [id]);
    await query('DELETE FROM audit_log      WHERE task_id = $1', [id]);
    await query('DELETE FROM task_files     WHERE task_id = $1', [id]);
    await query('DELETE FROM tasks          WHERE id      = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /tasks/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
