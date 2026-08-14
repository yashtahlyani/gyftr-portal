/**
 * backfill-identity.js — repair task↔user links on existing rows.
 *
 * Run ONCE after sync-users.js, then whenever tasks look like they are missing
 * from someone's portal.
 *
 * Tasks were historically linked to a person by matching the free-text `owner`
 * column against a display name hardcoded in the frontend, and were filtered by
 * a `team` column that could disagree with the assignee's actual team. Either
 * mismatch made a task invisible to the very person it was assigned to.
 *
 * This script:
 *   1. reports owner names that match nobody in the directory (the real breakages)
 *   2. fills tasks.owner_email / business_owner_email by name match
 *   3. corrects tasks.team to the assignee's team where they disagree
 *
 * Usage:
 *   cd scripts && npm install
 *   node backfill-identity.js --dry-run     # look first — always do this
 *   node backfill-identity.js
 *
 * Required env vars: RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB
 */

import pg from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

const pool = new pg.Pool({
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'postgres',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

async function main() {
  if (!process.env.RDS_HOST) { console.error('RDS_HOST is required'); process.exit(1); }
  console.log(DRY_RUN ? '=== DRY RUN — no writes ===\n' : '=== APPLYING CHANGES ===\n');

  // ── 1. Owner names that match nobody in the directory ────────────────────
  const { rows: unmatched } = await pool.query(`
    SELECT t.owner, count(*)::int AS tasks
      FROM tasks t
     WHERE t.owner IS NOT NULL AND btrim(t.owner) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM users u WHERE lower(btrim(u.name)) = lower(btrim(t.owner))
       )
     GROUP BY t.owner ORDER BY 2 DESC
  `);
  if (unmatched.length) {
    console.log('Owner names with no matching directory user:');
    unmatched.forEach(r => console.log(`  ! "${r.owner}" — ${r.tasks} task(s)`));
    console.log('  → these tasks are invisible to their assignee. Fix by either');
    console.log('    correcting the name on the task, or renaming the user in');
    console.log('    Admin → Team Directory so the two match.\n');
  } else {
    console.log('Every task owner matches a directory user.\n');
  }

  // ── 1b. Duplicate display names ──────────────────────────────────────────
  // Two users with the same name make owner-by-name matching ambiguous.
  const { rows: dupes } = await pool.query(`
    SELECT lower(btrim(name)) AS name, count(*)::int AS n,
           string_agg(email, ', ' ORDER BY email) AS emails
      FROM users GROUP BY 1 HAVING count(*) > 1
  `);
  if (dupes.length) {
    console.log('Duplicate display names in the directory:');
    dupes.forEach(d => console.log(`  ! "${d.name}" — ${d.n} accounts: ${d.emails}`));
    console.log('  → rename one of them in Admin → Team Directory.\n');
  }

  // ── 2. Link tasks to identities by name ──────────────────────────────────
  const linkOwner = `
    UPDATE tasks t SET owner_email = u.email
      FROM users u
     WHERE t.owner_email IS DISTINCT FROM u.email
       AND lower(btrim(t.owner)) = lower(btrim(u.name))
  `;
  const linkBiz = `
    UPDATE tasks t SET business_owner_email = u.email
      FROM users u
     WHERE t.business_owner_email IS DISTINCT FROM u.email
       AND lower(btrim(t.business_owner)) = lower(btrim(u.name))
  `;

  // ── 3. Correct team to the assignee's team ───────────────────────────────
  // Admin-team users (super admins) are skipped: a task assigned to one of them
  // should keep whichever team it was raised under.
  const fixTeam = `
    UPDATE tasks t SET team = u.team
      FROM users u
     WHERE t.owner_email = u.email
       AND u.team IN ('Content','Creative')
       AND t.team IS DISTINCT FROM u.team
  `;

  if (DRY_RUN) {
    const { rows: a } = await pool.query(`
      SELECT count(*)::int AS n FROM tasks t JOIN users u
        ON lower(btrim(t.owner)) = lower(btrim(u.name))
       WHERE t.owner_email IS DISTINCT FROM u.email`);
    const { rows: b } = await pool.query(`
      SELECT count(*)::int AS n FROM tasks t JOIN users u
        ON lower(btrim(t.business_owner)) = lower(btrim(u.name))
       WHERE t.business_owner_email IS DISTINCT FROM u.email`);
    const { rows: c } = await pool.query(`
      SELECT count(*)::int AS n FROM tasks t JOIN users u ON t.owner_email = u.email
       WHERE u.team IN ('Content','Creative') AND t.team IS DISTINCT FROM u.team`);
    const { rows: sample } = await pool.query(`
      SELECT t.id, t.owner, t.team AS current_team, u.team AS correct_team
        FROM tasks t JOIN users u ON lower(btrim(t.owner)) = lower(btrim(u.name))
       WHERE u.team IN ('Content','Creative') AND t.team IS DISTINCT FROM u.team
       ORDER BY t.id LIMIT 20`);

    console.log(`Would link  ${a[0].n} task(s) to an owner identity`);
    console.log(`Would link  ${b[0].n} task(s) to a business-owner identity`);
    console.log(`Would fix   ${c[0].n} task(s) whose team disagrees with the assignee`);
    if (sample.length) {
      console.log('\nTasks currently hidden from their assignee by a wrong team:');
      sample.forEach(r => console.log(`  ${r.id.padEnd(10)} ${String(r.owner).padEnd(22)} ${r.current_team} → ${r.correct_team}`));
    }
  } else {
    const r1 = await pool.query(linkOwner);
    const r2 = await pool.query(linkBiz);
    const r3 = await pool.query(fixTeam);
    console.log(`Linked ${r1.rowCount} owner / ${r2.rowCount} business-owner reference(s).`);
    console.log(`Corrected team on ${r3.rowCount} task(s).`);
  }

  await pool.end();
}

main().catch(err => { console.error('backfill failed:', err); process.exit(1); });
