import { createClient } from "@supabase/supabase-js";
import { fmtDate, relativeTime } from "../utils";

const _url  = import.meta.env?.VITE_SUPABASE_URL  || "";
const _anon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
export const supabase = _url ? createClient(_url, _anon) : null;

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
    delivered:     row.delivered || "",
    update:        { description: row.description || "", files: [] },
    effort:        (row.effort_entries || []).map(e => ({
                     _id: e.id, date: e.date, status: e.status,
                     hours: parseFloat(e.hours), manual: e.manual,
                   })),
    comments:      (row.comments || []).map(c => ({
                     _id: c.id, a: c.author, r: c.role, t: c.body,
                     ts: new Date(c.created_at).toLocaleString("en-IN",{
                       day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit",
                     }),
                   })),
    audit:         (row.audit_log || []).map(a => ({
                     _id: a.id, x: a.action, by: a.by_user,
                     ts: fmtDate(a.created_at?.slice(0,10)),
                   })),
    running:       row.running,
    startedAt:     row.started_at ? new Date(row.started_at).getTime() : null,
    updatedTs:     new Date(row.updated_at).getTime(),
    updatedAt:     relativeTime(row.updated_at),
    task_files:    row.task_files || [],
  };
}

export function taskToDb(f, id) {
  return {
    id,
    property:       f.property,
    task:           f.task.trim(),
    type:           f.type,
    owner:          f.assignee || f.owner,
    business_owner: f.businessOwner,
    priority:       f.priority,
    effort_status:  "Discussion",
    project_status: "Discussion",
    lock_state:     "unlocked",
    expected:       f.expected || null,
    due:            f.due     || null,
    delivered:      null,
    description:    "",
    running:        false,
    started_at:     null,
  };
}

export function buildDbPatch(updates) {
  const dbPatch = {};
  if (updates.property      !== undefined) dbPatch.property       = updates.property;
  if (updates.task          !== undefined) dbPatch.task           = updates.task;
  if (updates.type          !== undefined) dbPatch.type           = updates.type;
  if (updates.owner         !== undefined) dbPatch.owner          = updates.owner;
  if (updates.businessOwner !== undefined) dbPatch.business_owner = updates.businessOwner;
  if (updates.priority      !== undefined) dbPatch.priority       = updates.priority;
  if (updates.effortStatus  !== undefined) dbPatch.effort_status  = updates.effortStatus;
  if (updates.projectStatus !== undefined) dbPatch.project_status = updates.projectStatus;
  if (updates.lockState     !== undefined) dbPatch.lock_state     = updates.lockState;
  if (updates.due           !== undefined) dbPatch.due            = updates.due || null;
  if (updates.delivered     !== undefined) dbPatch.delivered      = updates.delivered || null;
  if (updates.running       !== undefined) dbPatch.running        = updates.running;
  if (updates.startedAt     !== undefined) {
    dbPatch.started_at = updates.startedAt ? new Date(updates.startedAt).toISOString() : null;
  }
  return dbPatch;
}