/* ─── lib/directory.js ───
 * The team directory: who exists, their team, role and avatar colour.
 * Loaded from the backend `users` table (seeded from Cognito) — this is what
 * replaced the hardcoded OWNERS / CREATIVE_OWNERS / BUSINESS_OWNERS / TEAM_OF /
 * PEOPLE / USER_BY_EMAIL arrays that used to live in constants/index.js.
 *
 * This module holds the plain data + lookups so non-React callers (utils, CSV
 * export) can use them. React components should use useDirectory() from
 * ./DirectoryProvider.jsx instead, so they re-render when it loads.
 */

let _users  = [];
let _byName = new Map();

export function setDirectory(users) {
  _users  = users;
  _byName = new Map(users.map(u => [u.name.trim().toLowerCase(), u]));
}

export const getDirectory = () => _users;
export const userByName   = (name) => _byName.get(String(name || "").trim().toLowerCase()) || null;

/* Deterministic fallback so someone with no colour set still renders
   consistently, instead of every unknown person sharing one grey. */
const FALLBACK_PALETTE = [
  "#1F7A3D","#C2185B","#0E6FA3","#8B5CF6","#0891B2","#15803D","#B01457",
  "#6D4C99","#0369A1","#0B6FCB","#C84B31","#2D6A4F","#7B2D8B","#B5451B",
  "#1A6B72","#6B3A1F","#1B4F72","#D97706","#4338CA","#831843",
];

export function fallbackColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

export const colorOfName = (name) => userByName(name)?.color || fallbackColor(String(name || ""));
export const teamOfName  = (name) => userByName(name)?.team  || null;

/* Assignable people on a team. */
export const ownersOf = (users, team) =>
  users.filter(u => u.team === team).map(u => u.name);

/* Business owners for a team: people flagged as business owners who are either
   on that team or on Admin (super admins oversee both teams). A Creative
   business owner must not show up in Content's dropdown. */
export const bizOwnersOf = (users, team) => [...new Set(
  users.filter(u => u.isBusinessOwner && (u.team === team || u.team === "Admin")).map(u => u.name)
)];

/* A <select> whose value is not among its options renders blank. Keep the
   current assignee visible even if they moved team or were deactivated. */
export const withCurrent = (list, value) =>
  value && !list.includes(value) ? [value, ...list] : list;
