// routes/users.js — the user directory the frontend builds its dropdowns,
// avatars and permissions from. Replaces the hardcoded arrays that used to
// live in src/constants/index.js and src/hooks/useAuth.js.

import { Router } from 'express';
import { listUsers, updateUser, ROLES, TEAMS } from '../identity.js';
import { requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/users/me — who am I, according to the directory
router.get('/me', (req, res) => res.json(req.identity));

// GET /api/users — full active directory (everyone needs it to render names)
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1' && req.identity.role === 'super_admin';
    res.json(await listUsers({ includeInactive }));
  } catch (err) {
    console.error('[GET /users]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:email — change role / team / colour. Super admin only:
// this is the control that used to require editing and redeploying code.
router.patch('/:email', requireSuperAdmin, async (req, res) => {
  const { role, team, color, active, isBusinessOwner, name } = req.body;
  if (role !== undefined && !ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });
  }
  if (team !== undefined && !TEAMS.includes(team)) {
    return res.status(400).json({ error: `team must be one of ${TEAMS.join(', ')}` });
  }
  try {
    const updated = await updateUser(req.params.email, { role, team, color, active, isBusinessOwner, name });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error('[PATCH /users/:email]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
