// db.js — RDS Postgres connection pool
// Credentials come from env vars or AWS Secrets Manager (if AWS_SECRET_NAME is set).
// Set DB_DISABLED=true to start the API without a database (temporary).

import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;
let pool;
let dbDisabled = false;

async function getDbCredentials() {
  // If AWS_SECRET_NAME is set, pull credentials from Secrets Manager
  if (process.env.AWS_SECRET_NAME) {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const res = await client.send(new GetSecretValueCommand({ SecretId: process.env.AWS_SECRET_NAME }));
    const secret = JSON.parse(res.SecretString);
    return {
      host:     secret.host,
      port:     secret.port || 5432,
      database: secret.dbname,
      user:     secret.username,
      password: secret.password,
    };
  }
  // Otherwise use plain env vars (dev / EC2 with env injected)
  return {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

export async function initDb() {
  if (process.env.DB_DISABLED === 'true') {
    dbDisabled = true;
    console.warn(
      '[db] DB_DISABLED=true — skipping Postgres connection. ' +
      'API data routes will fail until DB is configured.'
    );
    return;
  }

  const creds = await getDbCredentials();

  if (!creds.host || !creds.database || !creds.user || !creds.password) {
    throw new Error(
      'Database not configured. Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD ' +
      '(or AWS_SECRET_NAME), or set DB_DISABLED=true temporarily.'
    );
  }

  pool = new Pool({
    ...creds,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  // Verify connection
  const client = await pool.connect();
  console.log('[db] Connected to RDS Postgres:', creds.host);
  client.release();
}

export function query(sql, params) {
  if (dbDisabled || !pool) {
    const err = new Error(
      'Database not available. Configure DB_* env vars (or AWS_SECRET_NAME) and unset DB_DISABLED.'
    );
    err.status = 503;
    throw err;
  }
  return pool.query(sql, params);
}
