// src/lib/api.js — the only way this app talks to data.
// Every read and write goes through the Express API on AWS; the browser holds
// no database credentials. The bearer token is the Cognito ID token, set by
// useAuth after sign-in.

import { fmtDate, relativeTime } from '../utils';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7878';

// ── Token store — set by useAuth after Cognito login ──────────────────────
let _token = null;
export const setAuthToken = (t) => { _token = t; };
export const getAuthToken = ()  => _token;

// ── Base fetch with auth header ────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
