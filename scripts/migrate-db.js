/**
 * migrate-db.js — Supabase → RDS full data migration
 *
 * Run AFTER RDS schema is created (see infra/aws-setup.md §8).
 *
 * Usage:
 *   cd scripts && npm install
 *   node migrate-db.js
 *
 * Required env vars (set in shell or .env in this folder):
 *   SUPABASE_PAT   — Supabase personal access token
 *   RDS_HOST       — RDS endpoint
 *   RDS_USER       — e.g. gyftr_admin
 *   RDS_PASSWORD   — RDS master password
 *   RDS_DB         — e.g. postgres
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY — skip auto-fetch if you already have it
 */

import { createClient } from '@supabase/supabase-js';
import pg               from 'pg';

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://yqocfjopglhyhueicdxe.supabase.co';
const SUPABASE_REF = 'yqocfjopglhyhueicdxe';
// Set SUPABASE_PAT env var to your Supabase Personal Access Token before running
const SUPABASE_PAT = process.env.SUPABASE_PAT;

const RDS = {
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'postgres',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
};

// ── Step 1: get service_role key via Management API ───────────────────────────

async function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Using SUPABASE_SERVICE_ROLE_KEY from env');
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  console.log('Fetching service_role key from Supabase Management API…');
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${SUPABASE_PAT}` },
  });
  if (!res.ok) throw new Error(`Management API error ${res.status}: ${await res.text()}`);
  const keys = await res.json();
  const srKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!srKey) throw new Error('service_role key not found in Management API response');
  console.log('Got service_role key.');
  return srKey;
}

// ── Step 2: export all tables from Supabase ───────────────────────────────────

async function exportSupabase(serviceRoleKey) {
  const sb = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const tables = ['tasks', 'effort_entries', 'comments', 'audit_log', 'task_files'];
  const exported = {};

  for (const table of tables) {
    console.log(`Exporting ${table}…`);
    const { data, error } = await sb.from(table).select('*');
    if (error) {
      console.warn(`  Warning: ${table} export failed: ${error.message}`);
      exported[table] = [];
    } else {
      exported[table] = data;
      console.log(`  ${data.length} rows`);
    }
  }
  return exported;
}

// ── Step 3: import into RDS ───────────────────────────────────────────────────

async function importRds(data) {
  if (!RDS.host || !RDS.password) {
    throw new Error('RDS_HOST and RDS_PASSWORD env vars are required');
  }

  const pool = new pg.Pool(RDS);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // tasks
    console.log(`\nImporting ${data.tasks.length} tasks…`);
    for (const r of data.tasks) {
      await client.query(
        `INSERT INTO tasks
          (id, team, property, task, type, owner, business_owner, priority,
           effort_status, project_status, lock_state, expected, due,
           delivered, description, running, started_at, updated_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.team, r.property, r.task, r.type, r.owner, r.business_owner,
          r.priority, r.effort_status, r.project_status, r.lock_state,
          r.expected, r.due, r.delivered, r.description, r.running,
          r.started_at, r.updated_at, r.created_at,
        ]
      );
    }

    // effort_entries
    console.log(`Importing ${data.effort_entries.length} effort entries…`);
    for (const r of data.effort_entries) {
      await client.query(
        `INSERT INTO effort_entries (id, task_id, date, status, hours, manual, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.task_id, r.date, r.status, r.hours, r.manual, r.created_at]
      );
    }

    // comments
    console.log(`Importing ${data.comments.length} comments…`);
    for (const r of data.comments) {
      await client.query(
        `INSERT INTO comments (id, task_id, author, role, body, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.task_id, r.author, r.role, r.body, r.created_at]
      );
    }

    // audit_log
    console.log(`Importing ${data.audit_log.length} audit log entries…`);
    for (const r of data.audit_log) {
      await client.query(
        `INSERT INTO audit_log (id, task_id, action, by_user, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.task_id, r.action, r.by_user, r.created_at]
      );
    }

    // task_files
    if (data.task_files.length) {
      console.log(`Importing ${data.task_files.length} task files…`);
      for (const r of data.task_files) {
        await client.query(
          `INSERT INTO task_files (id, task_id) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.task_id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('\nMigration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== GyFTR Portal: Supabase → RDS Migration ===\n');
  if (!SUPABASE_PAT) {
    console.error('Error: SUPABASE_PAT env var is required.');
    console.error('Set it before running:');
    console.error('  export SUPABASE_PAT=<your-supabase-personal-access-token>');
    console.error('The token is in the handover Excel under "Supabase PAT".');
    process.exit(1);
  }
  try {
    const srKey  = await getServiceRoleKey();
    const data   = await exportSupabase(srKey);
    await importRds(data);
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  }
}

main();
