// routes/properties.js — the shared property list.
//
// Replaces the hardcoded arrays in src/constants/index.js and the per-browser
// localStorage "custom properties", which meant a property one manager added
// was invisible to everyone else.

import { Router } from 'express';
import { query } from '../db.js';
import { isAdmin } from '../permissions.js';

const router = Router();

const rowToProperty = (r) => ({
  id: r.id, name: r.name, team: r.team, color: r.color,
  sortOrder: r.sort_order, active: r.active,
});

// GET /api/properties — everyone needs this to render the board
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1' && isAdmin(req.identity);
    const { rows } = await query(
      `SELECT * FROM properties ${includeInactive ? '' : 'WHERE active'}
        ORDER BY team, sort_order, name`
    );
    res.json(rows.map(rowToProperty));
  } catch (err) {
    console.error('[GET /properties]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/properties — add one (Admin and above)
router.post('/', async (req, res) => {
  if (!isAdmin(req.identity)) {
    return res.status(403).json({ error: 'Only an admin can add properties' });
  }
  const name = String(req.body.name || '').trim();
  const team = req.body.team;
  if (!name)                                  return res.status(400).json({ error: 'Name is required' });
  if (!['Content', 'Creative'].includes(team)) return res.status(400).json({ error: 'team must be Content or Creative' });
  // An Admin may only manage their own team's list; Super Admins manage both.
  if (req.identity.role === 'manager' && req.identity.team !== team) {
    return res.status(403).json({ error: `You can only manage ${req.identity.team} properties` });
  }

  try {
    const { rows: existing } = await query(
      'SELECT * FROM properties WHERE team = $1 AND lower(btrim(name)) = lower(btrim($2))',
      [team, name]
    );
    // Re-adding a name that was previously removed reactivates it, keeping the
    // colour and any tasks already filed under it.
    if (existing[0]) {
      if (existing[0].active) return res.status(409).json({ error: `"${name}" already exists` });
      const { rows } = await query(
        'UPDATE properties SET active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [existing[0].id]
      );
      return res.status(200).json(rowToProperty(rows[0]));
    }

    const { rows } = await query(
      `INSERT INTO properties (name, team, color, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, team, req.body.color || null, req.body.sortOrder ?? 1000]
    );
    res.status(201).json(rowToProperty(rows[0]));
  } catch (err) {
    console.error('[POST /properties]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/properties/:id — rename / recolour / reactivate
router.patch('/:id', async (req, res) => {
  if (!isAdmin(req.identity)) {
    return res.status(403).json({ error: 'Only an admin can change properties' });
  }
  const cols = { name: 'name', color: 'color', sortOrder: 'sort_order', active: 'active' };
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(cols)) {
    if (req.body[key] !== undefined) { sets.push(`${col} = $${i++}`); vals.push(req.body[key]); }
  }
  if (!sets.length) return res.json({ ok: true });
  sets.push('updated_at = NOW()');
  vals.push(req.params.id);

  try {
    const { rows } = await query(
      `UPDATE properties SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Property not found' });
    res.json(rowToProperty(rows[0]));
  } catch (err) {
    console.error('[PATCH /properties/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/properties/:id — deactivate, never hard-delete.
// Tasks already filed under a property must keep reading correctly.
router.delete('/:id', async (req, res) => {
  if (!isAdmin(req.identity)) {
    return res.status(403).json({ error: 'Only an admin can remove properties' });
  }
  try {
    const { rows } = await query(
      'UPDATE properties SET active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Property not found' });

    const { rows: used } = await query(
      'SELECT count(*)::int AS n FROM tasks WHERE property = $1 AND team = $2',
      [rows[0].name, rows[0].team]
    );
    res.json({ ok: true, tasksStillUsing: used[0].n });
  } catch (err) {
    console.error('[DELETE /properties/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
