/**
 * smoke-test.js — run this right after deploying, to confirm the API is
 * actually reachable, authenticated, and talking to the real database — not
 * just that `pm2 status` says "online".
 *
 * Every login problem we have chased so far ended up being one of the four
 * things below. This checks all of them in a few seconds.
 *
 * Usage:
 *   cd scripts && npm install
 *   export SMOKE_API_URL=https://api.gyftr.net
 *   node smoke-test.js                    # unauthenticated checks only
 *
 *   # add a token to also verify auth + real data:
 *   export SMOKE_TOKEN=$(aws cognito-idp admin-initiate-auth \
 *     --user-pool-id <pool-id> --client-id <client-id> \
 *     --auth-flow ADMIN_USER_PASSWORD_AUTH \
 *     --auth-parameters USERNAME=<email>,PASSWORD=<password> \
 *     --query 'AuthenticationResult.IdToken' --output text)
 *   node smoke-test.js
 *
 * Optional:
 *   SMOKE_ORIGIN — the CloudFront URL, to verify CORS accepts it. This is the
 *                  check that catches "the browser cannot reach the API" while
 *                  curl from the server works fine.
 *
 * Exits non-zero on failure, so it is safe to wire into a deploy script.
 */

const API    = (process.env.SMOKE_API_URL || '').replace(/\/$/, '');
const TOKEN  = process.env.SMOKE_TOKEN || '';
const ORIGIN = process.env.SMOKE_ORIGIN || '';
const TIMEOUT_MS = 15000;

if (!API) {
  console.error('SMOKE_API_URL is required (e.g. https://api.gyftr.net)');
  process.exit(1);
}

let failures = 0;

const pass = (name, detail = '') => console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
const fail = (name, detail = '') => { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); };
const skip = (name, why)         => console.log(`  SKIP  ${name} — ${why}`);

async function req(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API}${path}`, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`=== Smoke test against ${API} ===\n`);

  // 1. Is anything listening at all?
  try {
    const res = await req('/health');
    if (res.ok) pass('API is reachable', `/health ${res.status}`);
    else        fail('API is reachable', `/health returned ${res.status}`);
  } catch (err) {
    fail('API is reachable',
      err.name === 'AbortError'
        ? `no response within ${TIMEOUT_MS / 1000}s — wrong host, or a security group is dropping traffic`
        : `${err.message} — check the URL and that the service is running`);
    console.log('\nNothing else can be checked until the API answers.');
    process.exit(1);
  }

  // 2. Can it reach the database? This is the one that /health hides.
  try {
    const res  = await req('/health/deep');
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.database === 'reachable') {
      pass('Database is reachable', `${body.latencyMs}ms`);
    } else {
      fail('Database is reachable', body.error || `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('Database is reachable', err.message);
  }

  // 3. Are protected routes actually protected?
  try {
    const res = await req('/api/tasks');
    if (res.status === 401) pass('Unauthenticated requests are rejected', '401 as expected');
    else fail('Unauthenticated requests are rejected',
      `expected 401, got ${res.status} — routes may be unprotected`);
  } catch (err) {
    fail('Unauthenticated requests are rejected', err.message);
  }

  // 4. Does the browser's origin survive CORS? curl succeeding proves nothing
  //    here — the browser is what gets blocked.
  if (ORIGIN) {
    try {
      const res = await req('/api/tasks', {
        method: 'OPTIONS',
        headers: {
          Origin: ORIGIN,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });
      const allowed = res.headers.get('access-control-allow-origin');
      if (allowed && (allowed === ORIGIN || allowed === '*')) {
        pass('CORS allows the frontend origin', allowed);
      } else {
        fail('CORS allows the frontend origin',
          `no matching Access-Control-Allow-Origin for ${ORIGIN}. ` +
          'Set FRONTEND_URL in backend/.env to exactly this value — no trailing slash.');
      }
    } catch (err) {
      fail('CORS allows the frontend origin', err.message);
    }
  } else {
    skip('CORS check', 'set SMOKE_ORIGIN to your CloudFront URL to enable it');
  }

  // 5. With a real token, does the whole chain work end to end?
  if (TOKEN) {
    const auth = { Authorization: `Bearer ${TOKEN}` };
    try {
      const res  = await req('/api/users/me', { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.email) pass('Authenticated request works', `${body.email} · ${body.role}/${body.team}`);
      else fail('Authenticated request works', body.error || `HTTP ${res.status}`);
    } catch (err) {
      fail('Authenticated request works', err.message);
    }

    try {
      const res  = await req('/api/tasks', { headers: auth });
      const body = await res.json().catch(() => []);
      if (res.ok && Array.isArray(body)) pass('Tasks load from the database', `${body.length} visible`);
      else fail('Tasks load from the database', body.error || `HTTP ${res.status}`);
    } catch (err) {
      fail('Tasks load from the database', err.message);
    }

    try {
      const res  = await req('/api/properties', { headers: auth });
      const body = await res.json().catch(() => []);
      if (res.ok && Array.isArray(body) && body.length) pass('Properties are seeded', `${body.length} properties`);
      else if (res.ok) fail('Properties are seeded', 'list is empty — schema.sql seed may not have run');
      else fail('Properties are seeded', body.error || `HTTP ${res.status}`);
    } catch (err) {
      fail('Properties are seeded', err.message);
    }
  } else {
    skip('Authenticated checks', 'set SMOKE_TOKEN to enable them');
  }

  console.log(failures === 0
    ? '\nAll checks passed.'
    : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => { console.error('smoke-test crashed:', err); process.exit(1); });
