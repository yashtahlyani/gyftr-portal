// src/lib/api.js — the only way this app talks to data.
// Every read and write goes through the Express API on AWS; the browser holds
// no database credentials. The bearer token is the Cognito ID token, set by
// useAuth after sign-in.

import { fmtDate, relativeTime } from '../utils';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Token store ────────────────────────────────────────────────────────────
// A Cognito ID token expires after an hour. Holding one captured at login
// meant that after 60 minutes every request went out with a dead token, the
// API answered 401, and the app looked broken until the user reloaded the
// page — reloading worked because it re-read the session. So instead of a
// fixed token we hold a *provider* that returns a currently-valid one, and
// Cognito refreshes it transparently when needed.
let _token = null;
let _tokenProvider = null;

export const setAuthToken = (t) => { _token = t; };
export const getAuthToken = ()  => _token;

/** @param {null | (() => Promise<string|null>)} fn */
export const setAuthTokenProvider = (fn) => { _tokenProvider = fn; };

// Called when the session cannot be renewed — wired to logout by useAuth so
// the user is sent to the login screen instead of hitting silent 401s.
let _onSessionExpired = null;
export const setOnSessionExpired = (fn) => { _onSessionExpired = fn; };

async function currentToken() {
  if (_tokenProvider) {
    try {
      const fresh = await _tokenProvider();
      if (fresh) { _token = fresh; return fresh; }
      if (_onSessionExpired) _onSessionExpired();
      return null;
    } catch {
      return _token;   // fall back to the last known token rather than failing outright
    }
  }
  return _token;
}

// ── Base fetch with auth header ────────────────────────────────────────────
// If the API host accepts the connection but never answers — a security group
// dropping traffic, an ALB with no healthy target — fetch waits forever, and
// the UI just spins with no error. Fail loudly instead.
const REQUEST_TIMEOUT_MS = 15000;

export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = await currentToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`The server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${API_URL}). It may be down or unreachable.`, { cause: err });
    }
    throw new Error(`Could not reach the server at ${API_URL}. Check the API is running and its CORS origin matches this site.`, { cause: err });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ── Data transformers (same logic as before, just moved here) ─────────────

export function dbToTask(row) {
  return {
    id:            row.id,
    property:      row.property,
    task:          row.task,
    type:          row.type,
    owner:         row.owner,
    businessOwner: row.business_owner,
    priority:      row.priority,
    effortStatus:  row.effort_status,
    projectStatus: row.project_status,
    lockState:     row.lock_state,
    expected:      row.expected,
    requested:     row.expected,
    due:           row.due,
    delivered:     row.delivered || '',
    update:        { description: row.description || '', files: [] },
    effort:        (row.effort_entries || []).map(e => ({
                     _id: e.id, date: e.date, status: e.status,
                     hours: parseFloat(e.hours), manual: e.manual,
                   })),
    comments:      (row.comments || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
                     .map(c => ({
                       _id: c.id, a: c.author, r: c.role, t: c.body,
                       ts: new Date(c.created_at).toLocaleString('en-IN', {
                         day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                       }),
                     })),
    audit:         (row.audit_log || []).map(a => ({
                     _id: a.id, x: a.action, by: a.by_user,
                     ts: fmtDate(a.created_at?.slice(0, 10)),
                   })),
    team:          row.team || 'Content',
    running:       row.running,
    startedAt:     row.started_at ? new Date(row.started_at).getTime() : null,
    updatedTs:     new Date(row.updated_at).getTime(),
    updatedAt:     relativeTime(row.updated_at),
    createdAt:     row.created_at ? row.created_at.slice(0, 10) : null,
    task_files:    row.task_files || [],
  };
}

export function buildDbPatch(updates) {
  const p = {};
  const m = {
    property: 'property', task: 'task', type: 'type', owner: 'owner',
    businessOwner: 'businessOwner', priority: 'priority',
    effortStatus: 'effortStatus', projectStatus: 'projectStatus',
    lockState: 'lockState', due: 'due', delivered: 'delivered',
    running: 'running', startedAt: 'startedAt', description: 'description',
  };
  for (const [k, v] of Object.entries(m)) {
    if (updates[k] !== undefined) p[v] = updates[k];
  }
  return p;
}
