/**
 * audit-access.js — print the current user-level access list for review.
 *
 * Answers "who has what access, and does it look right?" in one page, so the
 * access list can actually be rechecked instead of guessed at. Read-only —
 * this script never changes anything.
 *
 * Usage:
 *   cd scripts && npm install
 *   node audit-access.js
 *   node audit-access.js --csv > access-review.csv
 *
 * Required env vars: RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB
 * Optional (adds a Cognito column showing account status):
 *   COGNITO_USER_POOL_ID, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import pg from 'pg';

const CSV = process.argv.includes('--csv');

const TIER = { super_admin: 'Super Admin', manager: 'Admin', user: 'Employee' };
const SCOPE = {
  super_admin: 'ALL tasks, both teams',
  manager:     'all tasks on own team',
  user:        'only tasks assigned to them',
};

const pool = new pg.Pool({
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'postgres',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

async function cognitoStatuses() {
  if (!process.env.COGNITO_USER_POOL_ID) return null;
  const { CognitoIdentityProviderClient, ListUsersCommand } =
    await import('@aws-sdk/client-cognito-identity-provider');
  const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-south-1' });
  const map = new Map();
  let token;
  do {
    const res = await client.send(new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60, PaginationToken: token,
    }));
    for (const u of res.Users || []) {
      const attr = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
      const email = (attr.email || u.Username || '').toLowerCase();
      if (email) map.set(email, u.Enabled === false ? 'DISABLED' : u.UserStatus);
    }
    token = res.PaginationToken;
  } while (token);
  return map;
}

async function main() {
  if (!process.env.RDS_HOST) { console.error('RDS_HOST is required'); process.exit(1); }

  const cognito = await cognitoStatuses().catch(err => {
    console.error(`(could not read Cognito: ${err.message})\n`);
    return null;
  });

  const { rows } = await pool.query(`
    SELECT u.email, u.name, u.role, u.team, u.active, u.is_business_owner,
           (SELECT count(*) FROM tasks t WHERE t.owner_email = u.email)::int AS owned
      FROM users u
     ORDER BY CASE u.role WHEN 'super_admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,
              u.team, u.name
  `);

  if (CSV) {
    console.log('Name,Email,Access level,Team,Business owner,Active,Cognito status,Tasks owned,Can see');
    rows.forEach(r => console.log([
      r.name, r.email, TIER[r.role] || r.role, r.team,
      r.is_business_owner ? 'yes' : 'no', r.active ? 'yes' : 'no',
      cognito?.get(r.email.toLowerCase()) || '', r.owned, SCOPE[r.role] || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')));
    await pool.end();
    return;
  }

  console.log('=== GyFTR Marketing Portal — user access review ===\n');

  for (const tier of ['super_admin', 'manager', 'user']) {
    const group = rows.filter(r => r.role === tier);
    if (!group.length) continue;
    console.log(`${TIER[tier].toUpperCase()} (${group.length}) — sees ${SCOPE[tier]}`);
    for (const r of group) {
      const flags = [
        r.active ? null : 'INACTIVE',
        r.is_business_owner ? 'biz-owner' : null,
        cognito ? (cognito.get(r.email.toLowerCase()) || 'NOT IN COGNITO') : null,
      ].filter(Boolean).join(' · ');
      console.log(`  ${r.name.padEnd(22)} ${r.email.padEnd(34)} ${r.team.padEnd(9)} ${String(r.owned).padStart(3)} tasks   ${flags}`);
    }
    console.log('');
  }

  // ── Things worth a second look ────────────────────────────────────────────
  const warn = [];
  const admins = rows.filter(r => r.role === 'super_admin' && r.active);
  if (admins.length > 3) warn.push(`${admins.length} Super Admins — each one sees every task on both teams.`);
  if (!admins.length)    warn.push('No active Super Admin — nobody can edit the Team Directory.');

  for (const team of ['Content', 'Creative']) {
    const mgrs = rows.filter(r => r.role === 'manager' && r.team === team && r.active);
    if (!mgrs.length) warn.push(`${team} has no Admin — nobody can create or assign tasks for that team.`);
    if (mgrs.length > 1) warn.push(`${team} has ${mgrs.length} Admins: ${mgrs.map(m => m.name).join(', ')}`);
  }

  // The same person on both company domains would be two directory rows with
  // two separate sets of tasks. Identity resolution picks one deterministically,
  // so this must be surfaced rather than quietly tolerated.
  const byLocal = {};
  rows.forEach(r => {
    const lp = r.email.toLowerCase().split('@')[0];
    (byLocal[lp] = byLocal[lp] || []).push(r.email);
  });
  Object.entries(byLocal)
    .filter(([, emails]) => emails.length > 1)
    .forEach(([lp, emails]) => warn.push(
      `"${lp}" exists on more than one domain (${emails.join(', ')}) — same person, two records. Merge them.`
    ));

  const wrongTeam = rows.filter(r => r.role !== 'super_admin' && r.team === 'Admin');
  wrongTeam.forEach(r => warn.push(`${r.name} is on team "Admin" but is only an ${TIER[r.role]} — they will see no tasks.`));

  const noTasks = rows.filter(r => r.role === 'user' && r.active && r.owned === 0);
  if (noTasks.length) warn.push(`${noTasks.length} active Employee(s) own no tasks: ${noTasks.map(r => r.name).join(', ')}`);

  if (cognito) {
    rows.filter(r => r.active && !cognito.has(r.email.toLowerCase()))
        .forEach(r => warn.push(`${r.name} (${r.email}) is active in the portal but has NO Cognito account — cannot log in.`));
    for (const [email, status] of cognito) {
      if (!rows.some(r => r.email.toLowerCase() === email)) {
        warn.push(`${email} can log in to Cognito but is not in the directory (will auto-provision as a Content Employee).`);
      } else if (status === 'FORCE_CHANGE_PASSWORD') {
        // informational, not a warning
      }
    }
  }

  if (warn.length) {
    console.log('REVIEW THESE:');
    warn.forEach(w => console.log(`  ! ${w}`));
  } else {
    console.log('No anomalies found.');
  }

  if (cognito) {
    const pending = [...cognito.entries()].filter(([, s]) => s === 'FORCE_CHANGE_PASSWORD').length;
    console.log(`\n${pending} account(s) still owe a password change on next login.`);
  }

  await pool.end();
}

main().catch(err => { console.error('audit-access failed:', err); process.exit(1); });
