/**
 * diagnose-cognito.js — check why login fails
 *
 * Usage:
 *   export COGNITO_USER_POOL_ID=ap-south-1_R9ClS98mR
 *   export AWS_REGION=ap-south-1
 *   node diagnose-cognito.js
 *
 * Prints: pool info, all users + status, and every app client
 * (client id, whether it has a secret, and its auth flows).
 */

import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  ListUsersCommand,
  ListUserPoolClientsCommand,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION       = process.env.AWS_REGION || 'ap-south-1';

if (!USER_POOL_ID) {
  console.error('ERROR: COGNITO_USER_POOL_ID is required');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({ region: REGION });

async function main() {
  const pool = await client.send(new DescribeUserPoolCommand({ UserPoolId: USER_POOL_ID }));
  console.log('=== POOL ===');
  console.log('Id:  ', pool.UserPool.Id);
  console.log('Name:', pool.UserPool.Name);
  console.log('Password policy:', JSON.stringify(pool.UserPool.Policies?.PasswordPolicy));

  console.log('\n=== USERS ===');
  const users = await client.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 }));
  console.log('Count:', users.Users?.length || 0);
  for (const u of users.Users || []) {
    const email = u.Attributes?.find(a => a.Name === 'email')?.value
      || u.Attributes?.find(a => a.Name === 'email')?.Value || '';
    const verified = u.Attributes?.find(a => a.Name === 'email_verified')?.Value;
    console.log(`- ${u.Username}  status=${u.UserStatus}  enabled=${u.Enabled}  email=${email} verified=${verified}`);
  }
  if (!users.Users?.length) console.log('  (no users — login will always fail)');

  console.log('\n=== APP CLIENTS ===');
  const list = await client.send(new ListUserPoolClientsCommand({ UserPoolId: USER_POOL_ID, MaxResults: 20 }));
  for (const c of list.UserPoolClients || []) {
    const d = await client.send(new DescribeUserPoolClientCommand({
      UserPoolId: USER_POOL_ID,
      ClientId:   c.ClientId,
    }));
    const cl = d.UserPoolClient;
    console.log(`- name=${cl.ClientName}`);
    console.log(`  ClientId:  ${cl.ClientId}`);
    console.log(`  HasSecret: ${cl.ClientSecret ? 'YES (browser login will FAIL)' : 'no (good)'}`);
    console.log(`  AuthFlows: ${(cl.ExplicitAuthFlows || []).join(', ') || '(default)'}`);
  }

  console.log('\nFrontend must be built with:');
  console.log(`  VITE_COGNITO_USER_POOL_ID=${pool.UserPool.Id}`);
  console.log('  VITE_COGNITO_CLIENT_ID=<the ClientId above with HasSecret: no>');
}

main().catch(err => {
  console.error('ERROR:', err.name, '-', err.message);
  process.exit(1);
});
