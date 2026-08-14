// identity.js — the user directory, backed by the `users` table.
//
// Nothing about who a person is, what team they are on, or what they may see
// is hardcoded anywhere. Cognito decides *who can log in*; this table decides
// *what they are*. A Cognito user who has never been seen before is
// auto-provisioned on first request, so adding a team member is just
// "create them in Cognito" — no code change, no redeploy.

import { query } from './db.js';

const DEFAULT_ROLE = 'user';
const DEFAULT_TEAM = 'Content';

// Stable avatar colour for anyone with no colour set in the directory.
// Deterministic on the name, so it never changes between sessions.
const FALLBACK_PALETTE = [
  '#1F7A3D', '#C2185B', '#0E6FA3', '#8B5CF6', '#0891B2', '#15803D', '#B01457',
  '#6D4C99', '#0369A1', '#0B6FCB', '#C84B31', '#2D6A4F', '#7B2D8B', '#B5451B',
  '#1A6B72', '#6B3A1F', '#1B4F72', '#D97706', '#4338CA', '#831843',
];

export function fallbackColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

function rowToUser(r) {
  return {
    email:           r.email,
    name:            r.name,
    role:            r.role,
    team:            r.team,
    color:           r.color || fallbackColor(r.name),
    isBusinessOwner: r.is_business_owner,
    active:          r.active,
  };
}

export async function listUsers({ includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT * FROM users ${includeInactive ? '' : 'WHERE active'} ORDER BY team, name`
  );
  return rows.map(rowToUser);
}

// Company domains a person may sign in from. Staff are on @gyftr.net, some
// (and interns as they convert) are on @gyftr.com. Both are the same person:
// identity is the part before the @, not the whole address.
export const COMPANY_DOMAINS = (process.env.COMPANY_EMAIL_DOMAINS || 'gyftr.net,gyftr.com')
  .split(',').map(d => d.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);

const localPart  = (email) => String(email || '').toLowerCase().split('@')[0];
const domainOf   = (email) => String(email || '').toLowerCase().split('@')[1] || '';
const isCompany  = (email) => COMPANY_DOMAINS.includes(domainOf(email));

export async function getUserByEmail(email) {
  if (!email) return null;
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

/**
 * Find a user by the part before the @, across any company domain.
 * This is what lets sunil.d@gyftr.net and sunil.d@gyftr.com be one person with
 * one set of tasks and one access level, instead of two unrelated accounts.
 */
export async function getUserByLocalPart(email) {
  if (!email || !isCompany(email)) return null;
  const { rows } = await query(
    `SELECT * FROM users
      WHERE lower(split_part(email, '@', 1)) = lower($1)
        AND lower(split_part(email, '@', 2)) = ANY($2)
      ORDER BY active DESC, created_at ASC LIMIT 1`,
    [localPart(email), COMPANY_DOMAINS]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

// Display names are not guaranteed unique. Order so the same name always
// resolves to the same person rather than varying between calls.
export async function getUserByName(name) {
  if (!name) return null;
  const { rows } = await query(
    `SELECT * FROM users WHERE lower(btrim(name)) = lower(btrim($1))
      ORDER BY active DESC, created_at ASC, email ASC LIMIT 1`,
    [name]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

/**
 * Resolve a verified Cognito JWT payload into a directory user.
 * Auto-provisions on first sight so a brand-new Cognito account works
 * immediately instead of silently falling through to a default.
 */
export async function resolveIdentity(claims) {
  const email = (claims.email || claims['cognito:username'] || '').toLowerCase();
  if (!email) throw new Error('Token carries no email claim');

  // Exact address first.
  const exact = await getUserByEmail(email);
  if (exact) return exact;

  // Then the same person on the other company domain. Someone who signs in as
  // name@gyftr.com when the directory holds name@gyftr.net is not a new user —
  // they keep their team, access level and existing tasks.
  const sameLocal = await getUserByLocalPart(email);
  if (sameLocal) {
    console.log(`[identity] ${email} matched existing user ${sameLocal.email} by name part`);
    return sameLocal;
  }

  const name = claims.name || email.split('@')[0];
  const { rows } = await query(
    `INSERT INTO users (email, name, role, team)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [email, name, DEFAULT_ROLE, DEFAULT_TEAM]
  );
  console.log(`[identity] Auto-provisioned ${email} as ${DEFAULT_ROLE}/${DEFAULT_TEAM}`);
  return rowToUser(rows[0]);
}

export async function updateUser(email, patch) {
  const cols = { name: 'name', role: 'role', team: 'team', color: 'color', active: 'active', isBusinessOwner: 'is_business_owner' };
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(cols)) {
    if (patch[key] !== undefined) { sets.push(`${col} = $${i++}`); vals.push(patch[key]); }
  }
  if (!sets.length) return getUserByEmail(email);
  sets.push('updated_at = NOW()');
  vals.push(email);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE lower(email) = lower($${i}) RETURNING *`,
    vals
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export const ROLES = ['super_admin', 'manager', 'user'];
export const TEAMS = ['Content', 'Creative', 'Admin'];
