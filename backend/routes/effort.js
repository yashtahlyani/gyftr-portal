// routes/effort.js — effort_entries CRUD + Dashboard direct query

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/effort?from=YYYY-MM-DD&to=YYYY-MM-DD
// Used by Dashboard to fetch all effort entries with optional date range
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  let sql    = 'SELECT task_id, date, hours, status FROM effort_entries';
  const vals = [];
  const cond = [];
  if (from) { cond.push(`date >= $${vals.length + 1}`); vals.push(from); }
  if (to)   { cond.push(`date <= $${vals.length + 1}`); vals.push(to);   }
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
