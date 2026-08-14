// routes/tasks.js — CRUD for tasks + related audit/delete cascade

import { Router } from 'express';
import { query } from '../db.js';
import { getUserByName } from '../identity.js';
import { isAdmin, canSeeTask, checkTaskPatch } from '../permissions.js';

const router = Router();

async function getTaskById(id) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * What this caller is allowed to see. Enforced here rather than in the browser,
 * so the answer does not depend on a hardcoded list shipped in the JS bundle.
 *
 *   super_admin → everything
 *   manager     → everything on their own team
 *   user        → every task they own or are business owner of, on ANY team.
 *                 Deliberately not team-gated: a task assigned to you is yours
 *                 even if the row's `team` is stale, wrong or NULL.
 */
function visibilityFilter(identity) {
  if (identity.role === 'super_admin') return { where: '', params: [] };
  if (identity.role === 'manager') {
    return { where: 'WHERE t.team = $1', params: [identity.team] };
  }
  return {
    where: `WHERE t.owner_email = $1
               OR t.business_owner_email = $1
               OR lower(btrim(t.owner))          = lower(btrim($2))
               OR lower(btrim(t.business_owner)) = lower(btrim($2))`,
    params: [identity.email, identity.name],
  };
}

// ── Shared SQL: fetch tasks with joined relations ──────────────────────────
const tasksQuery = (where) => `
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
  ${where}
  GROUP BY t.id
  ORDER BY t.updated_at DESC
`;

// GET /api/tasks — tasks visible to the caller, with all related data
router.get('/', async (req, res) => {
  try {
    const { where, params } = visibilityFilter(req.identity);
    const { rows } = await query(tasksQuery(where), params);
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

// POST /api/tasks — create new task (Admin and above)
router.post('/', async (req, res) => {
  const f = req.body;
  if (!isAdmin(req.identity)) {
    return res.status(403).json({ error: 'Only an admin can create tasks' });
  }
  try {
    const owner    = await getUserByName(f.owner);
    const bizOwner = await getUserByName(f.business_owner);

    // The assignee's directory profile decides the team, so a task can never
    // land on a team its owner cannot see.
    const team = owner && owner.team !== 'Admin' ? owner.team : (f.team || 'Content');

    await query(
      `INSERT INTO tasks
        (id, team, property, task, type, owner, owner_email,
         business_owner, business_owner_email, priority,
         effort_status, project_status, lock_state, expected, due,
         delivered, description, running, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        f.id, team, f.property, f.task, f.type,
        f.owner, owner?.email || null,
        f.business_owner, bizOwner?.email || null,
        f.priority, 'Discussion', 'Discussion', 'unlocked',
        f.expected || null, f.due || null, null, '', false, null,
      ]
    );
    res.status(201).json({ id: f.id, team });
  } catch (err) {
    console.error('[POST /tasks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update task fields
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Authorise against the task as it actually is, not as the client claims.
  const existing = await getTaskById(id).catch(() => null);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const denied = checkTaskPatch(req.identity, existing, updates);
  if (denied) return res.status(403).json({ error: denied });

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

  try {
    // Reassignment re-derives the identity link and the team, so the new
    // assignee actually sees the task.
    if (updates.owner !== undefined) {
      const owner = await getUserByName(updates.owner);
      setClauses.push(`owner_email = $${idx++}`);
      values.push(owner?.email || null);
      if (owner && owner.team !== 'Admin') {
        setClauses.push(`team = $${idx++}`);
        values.push(owner.team);
      }
    }
    if (updates.businessOwner !== undefined) {
      const bizOwner = await getUserByName(updates.businessOwner);
      setClauses.push(`business_owner_email = $${idx++}`);
      values.push(bizOwner?.email || null);
    }

    if (setClauses.length === 0) return res.json({ ok: true });

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

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

// DELETE /api/tasks/:id — cascade delete all related records then the task.
// Admin and above, and only within their own scope.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isAdmin(req.identity)) {
    return res.status(403).json({ error: 'Only an admin can delete tasks' });
  }
  const existing = await getTaskById(id).catch(() => null);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (!canSeeTask(req.identity, existing)) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }
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
