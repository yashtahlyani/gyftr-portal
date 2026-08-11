// middleware/auth.js — validates Cognito JWT on every protected request
// If Cognito is not configured yet, set AUTH_DISABLED=true to start the API
// without JWT checks (temporary / non-production only).

import { CognitoJwtVerifier } from 'aws-jwt-verify';

const userPoolId   = process.env.COGNITO_USER_POOL_ID;
const clientId     = process.env.COGNITO_CLIENT_ID;
const authDisabled = process.env.AUTH_DISABLED === 'true';

let verifier = null;

if (userPoolId && clientId) {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  });
  console.log('[auth] Cognito JWT verification enabled');
} else if (authDisabled) {
  console.warn(
    '[auth] AUTH_DISABLED=true — API auth is bypassed. ' +
    'Configure COGNITO_USER_POOL_ID + COGNITO_CLIENT_ID before production.'
  );
} else {
  console.warn(
    '[auth] Cognito not configured (COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID missing). ' +
    'Protected routes will return 503 until Cognito is set, or set AUTH_DISABLED=true temporarily.'
  );
}

export async function requireAuth(req, res, next) {
  // Temporary bypass when Cognito is not ready yet
  if (!verifier && authDisabled) {
    req.user = {
      sub: 'dev-bypass',
      email: process.env.AUTH_BYPASS_EMAIL || 'dev@gyftr.net',
      'cognito:username': 'dev',
    };
    return next();
  }

  if (!verifier) {
    return res.status(503).json({
      error: 'Auth not configured',
      hint: 'Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID, or AUTH_DISABLED=true for temporary bypass',
    });
  }

  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = await verifier.verify(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
