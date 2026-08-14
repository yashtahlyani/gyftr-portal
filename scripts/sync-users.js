/**
 * sync-users.js — reconcile Cognito → the `users` table in RDS.
 *
 * Cognito is the source of truth for WHO EXISTS.
 * The `users` table is the source of truth for WHAT THEY ARE (role, team).
 *
 * For each Cognito user:
 *   - no row yet  → insert, using roster.json for role/team/colour if the
 *                   person is listed there, otherwise user/Content
 *   - row exists  → leave role/team/colour alone (they are edited in the
 *                   portal under Admin → Team Directory), only refresh the
 *                   display name if Cognito's changed
 * Rows with no matching Cognito account are reported and, with --deactivate,
 * marked inactive rather than deleted, so their task history survives.
 *
 * Usage:
 *   cd scripts && npm install
 *   node sync-users.js [--dry-run] [--deactivate]
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID, AWS_REGION
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY   (cognito-idp:ListUsers)
 *   RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DRY_RUN    = process.argv.includes('--dry-run');
const DEACTIVATE = process.argv.includes('--deactivate');

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION       = process.env.AWS_REGION || 'ap-south-1';

const roster = JSON.parse(readFileSync(fileURLToPath(new URL('./roster.json', import.meta.url)), 'utf8'));

// Keyed on the part before the @, NOT the full address. A person on
// @gyftr.com still matches their @gyftr.net roster entry (and vice versa), so
// a domain difference can never silently drop someone to default access.
const localPart = (e) => String(e || '').toLowerCase().split('@')[0];
const seedByLocalPart = new Map(
  roster.users.map(u => [localPart(u.email || u.prefix), u])
);

const pool = new pg.Pool({
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'postgres',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

async function listCognitoUsers() {
  const client = new CognitoIdentityProviderClient({ region: REGION });
  const out = [];
  let token;
  do {
    const res = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID, Limit: 60, PaginationToken: token,
    }));
    for (const u of res.Users || []) {
      const attr = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
      const email = (attr.email || u.Username || '').toLowerCase();
      if (email) out.push({ email, name: attr.name || email.split('@')[0] });
    }
    token = res.PaginationToken;
  } while (token);
  return out;
}

async function main() {
  if (!USER_POOL_ID) { console.error('COGNITO_USER_POOL_ID is required'); process.exit(1); }
  if (!process.env.RDS_HOST) { console.error('RDS_HOST is required'); process.exit(1); }

  const cognitoUsers = await listCognitoUsers();
  console.log(`Found ${cognitoUsers.length} users in Cognito pool ${USER_POOL_ID}`);
  if (DRY_RUN) console.log('(dry run — no writes)\n');

  const { rows: existing } = await pool.query('SELECT email, name, role, team FROM users');
  const existingByEmail = new Map(existing.map(r => [r.email.toLowerCase(), r]));

  let inserted = 0, renamed = 0, unchanged = 0;

  for (const cu of cognitoUsers) {
    const row  = existingByEmail.get(cu.email);
    const seed = seedByLocalPart.get(localPart(cu.email));

    if (!row) {
      const role  = seed?.role  || 'user';
      const team  = seed?.team  || 'Content';
      const color = seed?.color || null;
      const isBiz = seed?.isBusinessOwner || false;
      const name  = seed?.name  || cu.name;
      console.log(`  + ${cu.email.padEnd(32)} ${name.padEnd(22)} ${role}/${team}`);
      if (!DRY_RUN) {
        await pool.query(
          `INSERT INTO users (email, name, role, team, color, is_business_owner)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
          [cu.email, name, role, team, color, isBiz]
        );
      }
      inserted++;
    } else if (row.name !== cu.name && !seed) {
      // Cognito renamed someone we do not have a seed name for — follow it.
      console.log(`  ~ ${cu.email.padEnd(32)} name "${row.name}" → "${cu.name}"`);
      if (!DRY_RUN) {
        await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE email = $2', [cu.name, cu.email]);
      }
      renamed++;
    } else {
      unchanged++;
    }
  }

  // Directory rows with no Cognito account behind them
  const cognitoEmails = new Set(cognitoUsers.map(u => u.email));
  const orphans = existing.filter(r => !cognitoEmails.has(r.email.toLowerCase()));
  if (orphans.length) {
    console.log(`\n${orphans.length} directory row(s) have no Cognito account:`);
    orphans.forEach(o => console.log(`  ! ${o.email} (${o.name})`));
    if (DEACTIVATE && !DRY_RUN) {
      await pool.query(
        'UPDATE users SET active = false, updated_at = NOW() WHERE email = ANY($1)',
        [orphans.map(o => o.email)]
      );
      console.log('  → marked inactive (history preserved)');
    } else if (!DEACTIVATE) {
      console.log('  → left as-is. Re-run with --deactivate to mark them inactive.');
    }
  }

  console.log(`\nDone. Inserted: ${inserted}  Renamed: ${renamed}  Unchanged: ${unchanged}`);
  await pool.end();
}

main().catch(err => { console.error('sync-users failed:', err); process.exit(1); });
