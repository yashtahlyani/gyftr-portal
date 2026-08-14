// permissions.js — the access rules, in one place, enforced server-side.
//
// The three tiers, as agreed with the product team:
//
//   super_admin  "Super Admin"  both teams, everything, plus the Team Directory
//   manager      "Admin"        everything on their own team
//   user         "Employee"     their own tasks; may log progress but not
//                               reassign, rename, reschedule or delete
//
// The UI hides what a tier cannot do, but hiding a button is not access
// control — every rule below is checked again on the server, because a request
// can be sent by hand regardless of what the UI renders.

const norm = (s) => String(s || '').trim().toLowerCase();

export const isAdmin = (identity) =>
  identity.role === 'manager' || identity.role === 'super_admin';

/** Can this person see this task at all? Mirrors visibilityFilter in routes/tasks.js. */
export function canSeeTask(identity, task) {
  if (identity.role === 'super_admin') return true;
  if (identity.role === 'manager')     return (task.team || 'Content') === identity.team;
  return task.owner_email          === identity.email
      || task.business_owner_email === identity.email
      || norm(task.owner)          === norm(identity.name)
      || norm(task.business_owner) === norm(identity.name);
}

// What an Employee may change on a task of their own: their own progress.
// Everything else — who it is assigned to, what it is called, when it is due —
// is an Admin decision.
const EMPLOYEE_EDITABLE = new Set([
  'effortStatus', 'projectStatus', 'description', 'running', 'startedAt', 'delivered',
]);

/**
 * @returns {string|null} an error message, or null if the patch is allowed.
 */
export function checkTaskPatch(identity, task, updates) {
  if (!canSeeTask(identity, task)) return 'You do not have access to this task';
  if (isAdmin(identity)) return null;

  for (const key of Object.keys(updates)) {
    if (key === 'lockState') {
      // An Employee may ask for effort logging to be unlocked, nothing more.
      if (updates.lockState !== 'requested') {
        return 'Only an admin can lock or unlock effort logging';
      }
      continue;
    }
    if (!EMPLOYEE_EDITABLE.has(key)) {
      return `Only an admin can change "${key}"`;
    }
  }
  return null;
}
