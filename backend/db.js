// db.js — RDS Postgres connection pool
// Credentials come from env vars or AWS Secrets Manager (if AWS_SECRET_NAME is set).

import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;
let pool;

async function getDbCredentials() {
  // If AWS_SECRET_NAME is set, pull credentials from Secrets Manager
  if (process.env.AWS_SECRET_NAME) {
    // Region default matches the scripts and the deployed stack (Mumbai).
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-south-1',
    });
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

// Init state, so the API can answer "why is this broken?" instead of dying.
let _ready = false;
let _lastError = null;

export const isDbReady = () => _ready;
export const dbLastError = () => (_lastError ? _lastError.message : null);

/**
 * Connect, retrying in the background forever.
 *
 * initDb() throwing used to kill the process: start() awaited it, the catch
 * called process.exit(1), the container crash-looped, the target group emptied
 * and the ALB served a bare 503 with no information. A transient RDS problem
 * therefore looked identical to a broken deploy, and there was no HTTP surface
 * left to ask what was wrong.
 *
 * Now the API stays up and says what is wrong, and recovers on its own when
 * the database comes back.
 */
export async function initDbWithRetry({ intervalMs = 10000 } = {}) {
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      await initDb();
      _ready = true;
      _lastError = null;
      console.log(`[db] Ready (attempt ${attempt}).`);
      return;
    } catch (err) {
      _ready = false;
      _lastError = err;
      console.error(`[db] Not ready (attempt ${attempt}): ${err.message}`);
      if (attempt === 1) {
        console.error('[db] The API is up and will keep retrying. GET /health/deep for the current reason.');
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
}

export async function initDb() {
  const creds = await getDbCredentials();

  if (!creds.host || !creds.database || !creds.user || !creds.password) {
    throw new Error(
      'Database not configured. Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD ' +
      '(or AWS_SECRET_NAME for Secrets Manager).'
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

  await applySchema();
}

// Applies schema.sql (additive, idempotent) then links any task rows that still
// have no owner_email to a user by display name. NULL-only, so it never
// overwrites a link that is already there.
async function applySchema() {
  const sql = await readFile(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
  await pool.query(sql);

  const linked = await pool.query(`
    UPDATE tasks t SET owner_email = u.email
      FROM users u
     WHERE t.owner_email IS NULL
       AND lower(btrim(t.owner)) = lower(btrim(u.name))
  `);
  const linkedBiz = await pool.query(`
    UPDATE tasks t SET business_owner_email = u.email
      FROM users u
     WHERE t.business_owner_email IS NULL
       AND lower(btrim(t.business_owner)) = lower(btrim(u.name))
  `);
  console.log(`[db] Schema applied. Linked ${linked.rowCount} owner / ${linkedBiz.rowCount} business-owner rows to users.`);

  await seedProperties();
}

// One-time bootstrap of the property list. Only runs while the table is empty,
// so properties added or removed in the portal are never resurrected on restart.
async function seedProperties() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM properties');
  if (rows[0].n > 0) return;

  const seed = JSON.parse(
    await readFile(fileURLToPath(new URL('./seed/properties.json', import.meta.url)), 'utf8')
  );
  for (const p of seed) {
    await pool.query(
      `INSERT INTO properties (name, team, color, sort_order)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [p.name, p.team, p.color, p.sort_order]
    );
  }
  console.log(`[db] Seeded ${seed.length} properties (first run only).`);
}

export function query(sql, params) {
  if (!pool) throw new Error('DB not initialized — call initDb() first');
  return pool.query(sql, params);
}
