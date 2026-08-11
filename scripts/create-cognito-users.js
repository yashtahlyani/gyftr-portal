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

// ── Config ────────────────────────────────────────────────────────────────────

const USER_POOL_ID     = process.env.COGNITO_USER_POOL_ID;
const REGION           = process.env.AWS_REGION || 'ap-south-1';
// Must include uppercase — Cognito pool policy requires it
const DEFAULT_PASSWORD = 'Default@123';
const EMAIL_DOMAIN     = '@gyftr.net';

// All team members — prefix + display name
const USERS = [
  // Super admins
  { prefix: 'yash.tahlyani',        name: 'Yash Tahlyani' },
  { prefix: 'anirudh.motwani',      name: 'Anirudh Motwani' },
  { prefix: 'ceo.office',           name: 'Anushka Mishra' },
  // Content team
  { prefix: 'deepankar.h',          name: 'Deepankar Hemnani' },
  { prefix: 'ananya.saril',         name: 'Ananya Saril' },
  { prefix: 'reet',                 name: 'Reet Suman' },
  { prefix: 'uday.jadoun',          name: 'Uday Jadoun' },
  { prefix: 'vanshika.atri',        name: 'Vanshika Atri' },
  { prefix: 'sakshi.s1',            name: 'Sakshi Sharma' },
  { prefix: 'snigdha.b',            name: 'Snigdha Banerjee' },
  { prefix: 'priyanshu',            name: 'Priyanshu' },
  { prefix: 'harshita.m',           name: 'Harshita M' },
  { prefix: 'saim.k',               name: 'Saim' },
  // Creative team
  { prefix: 'ajay.k',               name: 'Ajay Kumar' },
  { prefix: 'ashutosh.j',           name: 'Ashutosh Kumar' },
  { prefix: 'sunil.d',              name: 'Sunil Dhyani' },
  { prefix: 'amit.c',               name: 'Amit Chauhan' },
  { prefix: 'shervir',              name: 'Shervir' },
  { prefix: 'deepak.verma',         name: 'Deepak Verma' },
  { prefix: 'amit.bhattacharjee',   name: 'Amit Bhattacharjee' },
  { prefix: 'ashish.t',             name: 'Ashish Kumar Tiwari' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!USER_POOL_ID) {
    console.error('COGNITO_USER_POOL_ID env var is required');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: REGION });

  console.log(`=== Creating ${USERS.length} Cognito users in pool ${USER_POOL_ID} ===`);
  console.log(`Default password: ${DEFAULT_PASSWORD}\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const u of USERS) {
    const email = u.prefix + EMAIL_DOMAIN;
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

      // Set permanent password — user won't be forced to change it
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username:   email,
        Password:   DEFAULT_PASSWORD,
        Permanent:  true,
      }));

      console.log('created');
      created++;
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        // User may exist from a previous failed password set — force permanent password
        try {
          await client.send(new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username:   email,
            Password:   DEFAULT_PASSWORD,
            Permanent:  true,
          }));
          console.log('already exists — password reset');
          skipped++;
        } catch (pwErr) {
          console.log(`already exists — password FAILED — ${pwErr.message}`);
          failed++;
        }
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
