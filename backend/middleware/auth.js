// middleware/auth.js — validates Cognito JWT on every protected request and
// resolves the caller to a directory user (see ../identity.js).

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { resolveIdentity } from '../identity.js';

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId   = process.env.COGNITO_CLIENT_ID;

if (!userPoolId || !clientId) {
  console.error(
    '[auth] Missing COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID — set both on the container.'
  );
  process.exit(1);
}

const verifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  let claims;
  try {
    claims = await verifier.verify(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    req.user     = claims;
    req.identity = await resolveIdentity(claims);
    if (!req.identity.active) return res.status(403).json({ error: 'Account is deactivated' });
    next();
  } catch (err) {
    console.error('[auth] identity resolution failed:', err.message);
    res.status(500).json({ error: 'Could not resolve user identity' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.identity?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin only' });
  }
  next();
}
