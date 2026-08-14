/**
 * force-password-reset.js — require every user to set a new password.
 *
 * Sets a TEMPORARY password on each Cognito account, which moves it to
 * FORCE_CHANGE_PASSWORD. The next time they sign in, the portal answers the
 * NEW_PASSWORD_REQUIRED challenge with the "Set a new password" screen and they
 * cannot get in until they choose their own.
 *
 * Existing sessions are NOT killed by this — a signed-in user keeps working
 * until their token expires. Pass --signout to revoke their tokens as well,
 * which forces the change immediately instead of at next login.
 *
 * Usage:
 *   cd scripts && npm install
 *   node force-password-reset.js --dry-run            # list who would be reset
 *   node force-password-reset.js                      # reset everyone
 *   node force-password-reset.js --signout            # ...and end active sessions
 *   node force-password-reset.js --only=a@x.com,b@x.com
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID, AWS_REGION
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   TEMP_PASSWORD (optional, defaults to Default@123)
 *
 * IAM: cognito-idp:ListUsers, AdminSetUserPassword, AdminUserGlobalSignOut
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const DRY_RUN  = process.argv.includes('--dry-run');
const SIGNOUT  = process.argv.includes('--signout');
const onlyArg  = process.argv.find(a => a.startsWith('--only='));
const ONLY     = onlyArg ? new Set(onlyArg.slice(7).split(',').map(s => s.trim().toLowerCase())) : null;

const USER_POOL_ID  = process.env.COGNITO_USER_POOL_ID;
const REGION        = process.env.AWS_REGION || 'ap-south-1';
const TEMP_PASSWORD = process.env.TEMP_PASSWORD || 'Default@123';

const client = new CognitoIdentityProviderClient({ region: REGION });

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
      if (email) out.push({ email, username: u.Username, status: u.UserStatus });
    }
    token = res.PaginationToken;
  } while (token);
  return out;
}

async function main() {
  if (!USER_POOL_ID) { console.error('COGNITO_USER_POOL_ID is required'); process.exit(1); }

  let users = await listUsers();
  if (ONLY) users = users.filter(u => ONLY.has(u.email));

  console.log(`Pool ${USER_POOL_ID} — ${users.length} account(s) to process`);
  console.log(`Temporary password: ${TEMP_PASSWORD}`);
  if (DRY_RUN) console.log('(dry run — no changes)');
  console.log('');

  let done = 0, already = 0, failed = 0;

  for (const u of users) {
    process.stdout.write(`  ${u.email.padEnd(36)} ${String(u.status).padEnd(22)}`);

    if (u.status === 'FORCE_CHANGE_PASSWORD') {
      console.log('already must change — skipped');
      already++;
      continue;
    }
    if (DRY_RUN) { console.log('would reset'); done++; continue; }

    try {
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username:   u.username,
        Password:   TEMP_PASSWORD,
        Permanent:  false,          // ← this is what forces the change
      }));
      if (SIGNOUT) {
        await client.send(new AdminUserGlobalSignOutCommand({
          UserPoolId: USER_POOL_ID, Username: u.username,
        }));
      }
      console.log(SIGNOUT ? 'reset + signed out' : 'reset');
      done++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Reset: ${done}  Already pending: ${already}  Failed: ${failed}`);
  if (!DRY_RUN && done > 0) {
    console.log(`\nTell users to sign in with the temporary password "${TEMP_PASSWORD}".`);
    console.log('The portal will then ask them to set their own password.');
  }
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('force-password-reset failed:', err); process.exit(1); });
