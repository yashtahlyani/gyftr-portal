/**
 * migrate-email-domain.js â€” move every user from @gyftr.net to @gyftr.com.
 *
 * A Cognito username cannot be renamed, so each person gets a NEW account on
 * the new domain and the old one is disabled (or deleted with --delete-old).
 * The new account is created with a temporary password, so everyone sets their
 * own password on first login â€” which also satisfies the forced-password-change
 * requirement for migrated users.
 *
 * The database side moves with them, inside one transaction:
 *   users.email, tasks.owner_email, tasks.business_owner_email
 * Display names are untouched, so task history, comments and the audit log all
 * still read correctly.
 *
 * Usage:
 *   cd scripts && npm install
 *   node migrate-email-domain.js --dry-run        # ALWAYS run this first
 *   node migrate-email-domain.js                  # migrate; old accounts disabled
 *   node migrate-email-domain.js --delete-old     # migrate; old accounts deleted
 *   node migrate-email-domain.js --from=gyftr.net --to=gyftr.com
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB
 *   TEMP_PASSWORD (optional, defaults to Default@123)
 *
 * IAM: cognito-idp:ListUsers, AdminCreateUser, AdminSetUserPassword,
 *      AdminDisableUser, AdminDeleteUser
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDisableUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import pg from 'pg';

const arg = (name, fallback) => {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const DRY_RUN    = process.argv.includes('--dry-run');
const DELETE_OLD = process.argv.includes('--delete-old');
const FROM       = arg('from', 'gyftr.net').replace(/^@/, '');
const TO         = arg('to',   'gyftr.com').replace(/^@/, '');

const USER_POOL_ID  = process.env.COGNITO_USER_POOL_ID;
const REGION        = process.env.AWS_REGION || 'ap-south-1';
const TEMP_PASSWORD = process.env.TEMP_PASSWORD || 'Default@123';

const client = new CognitoIdentityProviderClient({ region: REGION });
const pool = new pg.Pool({
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'postgres',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

async function listUsers() {
  const out = [];
  let token;
  do {
    const res = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID, Limit: 60, PaginationToken: token,
    }));
    for (const u of res.Users || []) {
      const attr = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
      const email = (attr.email || u.Username || '').toLowerCase();
      if (email) out.push({ email, username: u.Username, name: attr.name || '', enabled: u.Enabled });
    }
    token = res.PaginationToken;
  } while (token);
  return out;
}

async function main() {
  if (!USER_POOL_ID)          { console.error('COGNITO_USER_POOL_ID is required'); process.exit(1); }
  if (!process.env.RDS_HOST)  { console.error('RDS_HOST is required'); process.exit(1); }

  console.log(`=== Migrating @${FROM} â†’ @${TO} ===`);
  console.log(DRY_RUN ? '(dry run â€” nothing will be changed)\n'
                      : `Old accounts will be ${DELETE_OLD ? 'DELETED' : 'disabled'}\n`);

  const all      = await listUsers();
  const existing = new Set(all.map(u => u.email));
  const toMigrate = all.filter(u => u.email.endsWith(`@${FROM}`));

  if (!toMigrate.length) {
    console.log(`No accounts on @${FROM} â€” nothing to do.`);
    await pool.end();
    return;
  }

  // â”€â”€ Cognito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(`${toMigrate.length} account(s) on @${FROM}:\n`);
  const migrated = [];
  let created = 0, skipped = 0, failed = 0;

  for (const u of toMigrate) {
    const newEmail = u.email.replace(new RegExp(`@${FROM.replace('.', '\\.')}$`), `@${TO}`);
    process.stdout.write(`  ${u.email.padEnd(34)} â†’ ${newEmail.padEnd(34)}`);

    if (existing.has(newEmail)) {
      console.log('target already exists â€” skipped');
      migrated.push({ from: u.email, to: newEmail });   // still fix the DB
      skipped++;
      continue;
    }
    if (DRY_RUN) { console.log('would create'); migrated.push({ from: u.email, to: newEmail }); created++; continue; }

    try {
      await client.send(new AdminCreateUserCommand({
        UserPoolId:    USER_POOL_ID,
        Username:      newEmail,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email',          Value: newEmail },
          { Name: 'email_verified', Value: 'true' },
          ...(u.name ? [{ Name: 'name', Value: u.name }] : []),
        ],
      }));
      // Temporary â†’ forced password change on first login.
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID, Username: newEmail,
        Password: TEMP_PASSWORD, Permanent: false,
      }));

      if (DELETE_OLD) {
        await client.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: u.username }));
      } else {
        await client.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: u.username }));
      }

      console.log(DELETE_OLD ? 'created, old deleted' : 'created, old disabled');
      migrated.push({ from: u.email, to: newEmail });
      created++;
    } catch (err) {
      console.log(`FAILED â€” ${err.message}`);
      failed++;
    }
  }

  // â”€â”€ Database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('\nDatabase:');
  const rx = `@${FROM.replace('.', '\\.')}$`;

  if (DRY_RUN) {
    const { rows: u } = await pool.query(
      `SELECT count(*)::int AS n FROM users WHERE email ~* $1`, [rx]);
    const { rows: t } = await pool.query(
      `SELECT count(*)::int AS n FROM tasks WHERE owner_email ~* $1`, [rx]);
    const { rows: b } = await pool.query(
      `SELECT count(*)::int AS n FROM tasks WHERE business_owner_email ~* $1`, [rx]);
    console.log(`  would rewrite ${u[0].n} directory row(s)`);
    console.log(`  would rewrite ${t[0].n} task owner reference(s)`);
    console.log(`  would rewrite ${b[0].n} task business-owner reference(s)`);
  } else {
    // users.email is the primary key â€” a row already sitting on the new
    // address would make the rename fail. Report and stop rather than guess
    // which of the two rows is the real person.
    const { rows: collisions } = await pool.query(
      `SELECT u.email AS old_email, regexp_replace(u.email, $1, '@${TO}') AS new_email
         FROM users u
        WHERE u.email ~* $1
          AND EXISTS (SELECT 1 FROM users v WHERE lower(v.email) = lower(regexp_replace(u.email, $1, '@${TO}')))`,
      [rx]
    );
    if (collisions.length) {
      console.error('  ABORTED â€” these directory rows already exist on the new domain:');
      collisions.forEach(c => console.error(`    ${c.old_email} â†’ ${c.new_email} (already present)`));
      console.error('  Remove the duplicate rows in Admin â†’ Team Directory, then re-run.');
      await pool.end();
      process.exit(1);
    }

    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const r1 = await db.query(
        `UPDATE users SET email = regexp_replace(email, $1, '@${TO}'), updated_at = NOW()
          WHERE email ~* $1`, [rx]);
      const r2 = await db.query(
        `UPDATE tasks SET owner_email = regexp_replace(owner_email, $1, '@${TO}')
          WHERE owner_email ~* $1`, [rx]);
      const r3 = await db.query(
        `UPDATE tasks SET business_owner_email = regexp_replace(business_owner_email, $1, '@${TO}')
          WHERE business_owner_email ~* $1`, [rx]);
      await db.query('COMMIT');
      console.log(`  rewrote ${r1.rowCount} directory row(s)`);
      console.log(`  rewrote ${r2.rowCount} task owner reference(s)`);
      console.log(`  rewrote ${r3.rowCount} task business-owner reference(s)`);
    } catch (err) {
      await db.query('ROLLBACK');
      console.error('  DB migration rolled back:', err.message);
      throw err;
    } finally {
      db.release();
    }
  }

  console.log(`\nCognito â€” created: ${created}  skipped: ${skipped}  failed: ${failed}`);
  if (!DRY_RUN) {
    console.log(`\nNext: update scripts/roster.json emailDomain to "@${TO}",`);
    console.log(`then tell users to sign in as <name>@${TO} with "${TEMP_PASSWORD}"`);
    console.log('and set their own password when prompted.');
    if (!DELETE_OLD) console.log(`\nOld @${FROM} accounts are disabled, not deleted â€” re-enable in the`);
    if (!DELETE_OLD) console.log('Cognito console if anything went wrong.');
  }

  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('migrate-email-domain failed:', err); process.exit(1); });
