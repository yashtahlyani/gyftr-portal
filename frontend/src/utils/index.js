/* ─── utils/index.js ─── */
import { STATUS, TASK_TYPES, TYPE_PALETTE, PEOPLE, TEAM_OF } from "../constants";

/* ── Date helpers ── */
export const TODAY = new Date();
// Use local date (not UTC) — important for IST users where UTC midnight = 5:30am IST
const _t = TODAY;
export const TODAY_ISO = `${_t.getFullYear()}-${String(_t.getMonth()+1).padStart(2,"0")}-${String(_t.getDate()).padStart(2,"0")}`;
export const NOW_MS    = Date.now();
// Dynamic version — call this instead of TODAY_ISO wherever you need the date AT THE TIME OF THE CALL
// (e.g. logging effort, stamping delivered dates). TODAY_ISO is frozen at page-load.
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

export const fmtDate = (s) =>
  s ? new Date(s+"T00:00:00").toLocaleDateString("en-GB",{ day:"numeric", month:"short" }) : "—";

export const dayDiff = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);

export const plusDays = (s,n) => {
  const d = new Date(s+"T00:00:00");
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
};

export const relativeTime = (iso) => {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 90)    return "just now";
  if (diff < 3600)  return `${Math.round(diff/60)}m`;
  if (diff < 86400) return `${Math.round(diff/3600)}h`;
  return `${Math.round(diff/86400)}d`;
};

/* ── Effort helpers ── */
export const totalEffort = (eff=[]) => eff.reduce((s,e)=>s+(Number(e.hours)||0),0);

/**
 * Formats hours into "Xh Ym" — always shows minutes, shows hours only when ≥1.
 * e.g. 0.17 → "10m", 1.5 → "1h 30m", 2 → "2h"
 */
export const fmtHrs = (h) => {
  const total    = Math.max(0, Number(h) || 0);
  const hrs      = Math.floor(total);
  const mins     = Math.round((total - hrs) * 60);
  if (hrs === 0 && mins === 0) return "0m";
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

/* ── Task helpers ── */
export const taskNo   = (t) => parseInt((t.id.split("-")[1])||"0",10);
export const teamOf   = (t) => TEAM_OF[t.owner] || "Content";
export const typeColor = (t) => TYPE_PALETTE[Math.max(0,TASK_TYPES.indexOf(t)) % TYPE_PALETTE.length];

export const agingDays = (t) => {
  const target = t.due || t.expected;
  if (!target) return 0;
  if (t.projectStatus === "Completed") {
    const final = t.delivered;
    return final ? Math.max(0, dayDiff(target, final)) : 0;
  }
  return Math.max(0, dayDiff(target, todayISO()));
};

/* ── Avatar ── */
export const initials = (n="") =>
  n.replace(/\(.*\)/,"").trim().split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "?";

export const avatarColor = (name) => (PEOPLE[name]?.c) || "#7A8A80";

/* ── CSV export ── */
const csvCell = (v) => '"' + (v==null?"":String(v)).replace(/"/g,'""') + '"';

export const exportBoardCSV = (rows) => {
  const headers = [
    "No.","Property","Task","Task Type","Team","Assigned To","Business Owner",
    "Priority","Project Status","Effort Status","Expected by Business","Promised Date",
    "Delivered Date","Total Hours","Aging (days late)","Lock State",
    "Description","Effort Log (Manual entries flagged)","Comments","Last Updated",
  ];
  const lines = [headers];
  rows.forEach(t => {
    const u = t.update || {};
    const effortLog = (t.effort||[]).map(e=>`${fmtDate(e.date)} · ${e.status} · ${fmtHrs(e.hours)}${e.manual?" (MANUAL)":""}`).join(" | ");
    const comments  = (t.comments||[]).map(c=>`${c.a} (${c.ts}): ${c.t}`).join(" | ");
    lines.push([
      taskNo(t), t.property, t.task, (Array.isArray(t.type)?t.type:t.type?[t.type]:[]).join(", "), teamOf(t), t.owner, t.businessOwner,
      t.priority, t.projectStatus, t.effortStatus,
      t.expected||t.requested, t.due, t.delivered,
      totalEffort(t.effort), agingDays(t), t.lockState||"locked",
      u.description, effortLog, comments, t.updatedAt,
    ]);
  });
  const csv  = "\uFEFF" + lines.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href=url; a.download=`gyftr_work_board_${TODAY_ISO}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
