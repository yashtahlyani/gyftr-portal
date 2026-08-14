/**
 * create-cognito-users.js — seed all GyFTR team members into Cognito
 *
 * Creates every known user with a permanent password of default@123.
 * Users do NOT need to reset password on first login.
 *
 * Usage:
 *   cd scripts && npm install
 *   node create-cognito-users.js
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID  — e.g. ap-south-1_AbcXYZ
 *   AWS_REGION            — e.g. ap-south-1
 *   AWS_ACCESS_KEY_ID     — IAM user with Cognito admin permissions
 *   AWS_SECRET_ACCESS_KEY
 *
 * IAM permission needed: cognito-idp:AdminCreateUser, cognito-idp:AdminSetUserPassword
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── Config ────────────────────────────────────────────────────────────────────

const USER_POOL_ID     = process.env.COGNITO_USER_POOL_ID;
const REGION           = process.env.AWS_REGION || 'ap-south-1';
const DEFAULT_PASSWORD = 'default@123';

// The roster lives in exactly one place — roster.json — shared with
// sync-users.js. Do not re-list people here.
const roster       = JSON.parse(readFileSync(fileURLToPath(new URL('./roster.json', import.meta.url)), 'utf8'));
const EMAIL_DOMAIN = roster.emailDomain;
const USERS        = roster.users;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!USER_POOL_ID) {
    console.error('COGNITO_USER_POOL_ID env var is required');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: REGION });

  console.log(`=== Creating ${USERS.length} Cognito users in pool ${USER_POOL_ID} ===`);
  console.log(`Temporary password: ${DEFAULT_PASSWORD} (users must change it on first login)\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const u of USERS) {
    // A roster entry may carry an explicit "email" (someone on a different
    // company domain); otherwise it is prefix + the default domain.
    const email = (u.email || u.prefix + EMAIL_DOMAIN).toLowerCase();
    process.stdout.write(`  ${email.padEnd(42)}`);

    try {
      // Create user — suppress the Cognito welcome email
      await client.send(new AdminCreateUserCommand({
        UserPoolId:         USER_POOL_ID,
        Username:           email,
        MessageAction:      'SUPPRESS',
        UserAttributes: [
          { Name: 'email',          Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name',           Value: u.name },
        ],
      }));

      // TEMPORARY password (Permanent: false) — Cognito puts the account in
      // FORCE_CHANGE_PASSWORD, so the portal makes them choose their own
      // password on first login. Never set Permanent: true here.
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username:   email,
        Password:   DEFAULT_PASSWORD,
        Permanent:  false,
      }));

      console.log('created');
      created++;
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        console.log('already exists (skipped)');
        skipped++;
      } else {
        console.log(`FAILED — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}  Failed: ${failed}`);
  if (failed > 0) {
    console.log('Re-run the script to retry failed users.');
    process.exit(1);
  }
}

main();
