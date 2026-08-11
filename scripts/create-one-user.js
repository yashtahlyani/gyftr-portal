/**
 * create-one-user.js — create (or reset) a single Cognito user
 *
 * Usage (EC2 / any machine with AWS creds for the pool's account):
 *   export COGNITO_USER_POOL_ID=ap-south-1_R9ClS98mR
 *   export AWS_REGION=ap-south-1
 *   export NEW_EMAIL=chandan.p@gyftr.net
 *   export NEW_NAME="Chandan Prajapati"
 *   export NEW_PASSWORD='Default@123'
 *   node create-one-user.js
 *
 * Notes:
 *   - Password must satisfy the pool policy (>=8, uppercase, lowercase, number).
 *   - If the user already exists, its password is force-reset (permanent).
 *   - Sets a PERMANENT password so there is no forced reset on first login.
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION       = process.env.AWS_REGION || 'ap-south-1';
const EMAIL        = process.env.NEW_EMAIL;
const NAME         = process.env.NEW_NAME || (EMAIL ? EMAIL.split('@')[0] : '');
const PASSWORD     = process.env.NEW_PASSWORD || 'Default@123';

function fail(msg) { console.error('ERROR:', msg); process.exit(1); }

if (!USER_POOL_ID) fail('COGNITO_USER_POOL_ID is required');
if (!EMAIL)        fail('NEW_EMAIL is required (e.g. chandan.p@gyftr.net)');

const client = new CognitoIdentityProviderClient({ region: REGION });

async function main() {
  console.log(`Pool:     ${USER_POOL_ID}`);
  console.log(`Region:   ${REGION}`);
  console.log(`Email:    ${EMAIL}`);
  console.log(`Name:     ${NAME}`);
  console.log(`Password: ${PASSWORD}\n`);

  try {
    await client.send(new AdminCreateUserCommand({
      UserPoolId:    USER_POOL_ID,
      Username:      EMAIL,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email',          Value: EMAIL },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name',           Value: NAME },
      ],
    }));
    console.log('User created.');
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      console.log('User already exists — will reset password.');
    } else {
      fail(err.message);
    }
  }

  await client.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username:   EMAIL,
    Password:   PASSWORD,
    Permanent:  true,
  }));
  console.log('Permanent password set.');

  const info = await client.send(new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username:   EMAIL,
  }));
  console.log(`\nStatus: ${info.UserStatus}  (should be CONFIRMED)`);
  console.log('\nLogin with:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
}

main().catch(err => fail(err.message));
