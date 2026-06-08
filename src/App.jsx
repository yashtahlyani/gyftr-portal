import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  LayoutDashboard, Table2, Settings, Search, Plus, X, Send, Clock,
  AlertTriangle, ChevronRight, ChevronDown, LogOut, Timer, FileText, Flag,
  Download, Play, Square, Lock, Unlock, Pencil, Paperclip, Check,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

/* ─── SUPABASE CLIENT ─── */
const _url  = import.meta.env?.VITE_SUPABASE_URL  || "";
const _anon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
const supabase = _url ? createClient(_url, _anon) : null;

/* ─────────────────────────────  DESIGN SYSTEM  ───────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.gx-root{
  --paper:#F3F6F2; --surface:#FFFFFF; --ink:#15241B; --ink-soft:#586860;
  --line:#E1EAE3; --line-soft:#EEF4EF; --pop:#62A92A; --pop-deep:#4C8A1E; --pop-soft:#EDF6D9;
  --font-d:'Bricolage Grotesque',sans-serif; --font-b:'Hanken Grotesk',sans-serif; --font-m:'JetBrains Mono',monospace;
  font-family:var(--font-b); color:var(--ink); background:var(--paper);
  -webkit-font-smoothing:antialiased; letter-spacing:-0.005em;
}
.gx-root *::-webkit-scrollbar{width:10px;height:10px}
.gx-root *::-webkit-scrollbar-thumb{background:#cbd6cd;border-radius:9px;border:2px solid transparent;background-clip:content-box}
.gx-root *::-webkit-scrollbar-track{background:transparent}
.gx-disp{font-family:var(--font-d);letter-spacing:-0.02em}
.gx-mono{font-family:var(--font-m);font-feature-settings:"tnum"}
.gx-btn{font-family:var(--font-b);font-weight:600;border:none;cursor:pointer;border-radius:10px;transition:transform .12s,box-shadow .12s,background .12s}
.gx-btn:active{transform:translateY(1px)}
.gx-btn-dark{background:var(--pop);color:#fff;padding:9px 15px;display:inline-flex;align-items:center;gap:7px;font-size:13.5px}
.gx-btn-dark:hover{background:var(--pop-deep);box-shadow:0 6px 18px -6px rgba(76,138,30,.55)}
.gx-btn-ghost{background:transparent;color:var(--ink-soft);padding:8px 12px;display:inline-flex;align-items:center;gap:7px;font-size:13.5px;border-radius:9px}
.gx-btn-ghost:hover{background:#E6EFE7;color:var(--ink)}
.gx-chip{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:12px;padding:5px 11px;border-radius:999px;white-space:nowrap;border:none;cursor:pointer;font-family:var(--font-b)}
.gx-card{background:var(--surface);border:1px solid var(--line);border-radius:16px}
.gx-row:hover{background:#F4F8F4}
.gx-navitem{display:flex;align-items:center;gap:11px;padding:8px 14px;border-radius:11px;color:var(--ink-soft);font-weight:600;font-size:13.5px;cursor:pointer;transition:.12s}
.gx-navitem:hover{background:#E6EFE7;color:var(--ink)}
.gx-navitem.on{background:var(--pop);color:#fff}
.gx-navitem.on svg{color:#fff}
.gx-input{font-family:var(--font-b);font-size:13.5px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 12px;outline:none;width:100%}
.gx-input:focus{border-color:var(--pop);box-shadow:0 0 0 3px var(--pop-soft)}
.gx-cellinput{font-family:var(--font-b);font-size:13px;color:var(--ink);background:transparent;border:1px solid transparent;border-radius:7px;padding:6px 8px;outline:none;width:100%}
.gx-cellinput:hover{background:#F1F6F1}
.gx-cellinput:focus{background:#fff;border-color:var(--pop);box-shadow:0 0 0 3px var(--pop-soft)}
.gx-sel{font-family:var(--font-b);font-size:12.5px;color:var(--ink);background:transparent;border:1px solid transparent;border-radius:7px;padding:6px 20px 6px 7px;outline:none;width:100%;appearance:none;cursor:pointer}
.gx-sel:hover{background:#F1F6F1}
.gx-sel:focus{background:#fff;border-color:var(--pop)}
.gx-th{font-family:var(--font-b);font-weight:700;font-size:10px;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-soft);text-align:left;padding:9px 8px;white-space:nowrap;background:#EEF4EF}
.gx-td{padding:5px 7px;font-size:12.5px;vertical-align:middle;border-top:1px solid var(--line-soft);border-right:1px solid var(--line-soft)}
.gx-board .gx-th{padding:12px 9px}
.gx-board .gx-td{padding:11px 8px}
.gx-fade{animation:gxf .4s cubic-bezier(.2,.7,.2,1) both}
@keyframes gxf{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.gx-stagger>*{animation:gxf .45s cubic-bezier(.2,.7,.2,1) both}
.gx-stagger>*:nth-child(1){animation-delay:.02s}.gx-stagger>*:nth-child(2){animation-delay:.06s}
.gx-stagger>*:nth-child(3){animation-delay:.10s}.gx-stagger>*:nth-child(4){animation-delay:.14s}
.gx-stagger>*:nth-child(5){animation-delay:.18s}.gx-stagger>*:nth-child(6){animation-delay:.22s}
.gx-drawer{animation:gxd .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes gxd{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
.gx-scrim{animation:gxs .25s ease both}@keyframes gxs{from{opacity:0}to{opacity:1}}
.gx-avatar{border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-b);font-weight:700;color:#fff;flex:none}
.gx-tab{font-family:var(--font-b);font-weight:600;font-size:13px;padding:9px 2px;color:var(--ink-soft);cursor:pointer;border-bottom:2px solid transparent;margin-right:20px}
.gx-tab.on{color:var(--ink);border-bottom-color:var(--pop)}
.gx-menuitem{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
.gx-menuitem:hover{background:#F1F6F1}
`;

/* ─────────────────────────────  CONSTANTS  ───────────────────────────── */
const STATUS = {
  "Discussion":          { bg:"#D6F4F7", fg:"#067A8C", dot:"#06B6D4", group:"active" },
  "Execution":           { bg:"#EFE7FF", fg:"#6A3BD1", dot:"#8B5CF6", group:"active" },
  "Review":              { bg:"#FFEFD6", fg:"#9A5B00", dot:"#F5A623", group:"active" },
  "Hold Due To Clarity": { bg:"#FBE0EC", fg:"#B01457", dot:"#E11D74", group:"hold" },
  "Deferred":            { bg:"#ECEAE3", fg:"#605E55", dot:"#94918A", group:"hold" },
  "Completed":           { bg:"#CDEBD6", fg:"#0F6B33", dot:"#15803D", group:"done" },
};
const STATUS_LIST = Object.keys(STATUS);
const EFFORT_STATUS_LIST = STATUS_LIST;
const PROJECT_STATUS_LIST = STATUS_LIST;

const PRIORITY = {
  High:   { bg:"#EDE4FF", fg:"#5B21B6", dot:"#7C3AED", rank:3 },
  Medium: { bg:"#DBEAFE", fg:"#1D4ED8", dot:"#2563EB", rank:2 },
  Low:    { bg:"#E0F2FE", fg:"#0369A1", dot:"#38BDF8", rank:1 },
};
const PRIORITY_LIST = ["High","Medium","Low"];
const PROPERTIES = ["HDFC","SBI","RBL","OTHERS"];

const TASK_TYPES = [
  "Discussion","Emailer","Sms","WhatsApp","BTF","ATF","T&C","Important Instructions","Redemption Steps",
  "Video Script","Category BTF","Homepage BTF","Occassion BTF","Banner","Push Notification",
  "Google Ads","Meta Ads","Blog","Website Content","Newsletter","Pop Up","Event Content","Gamification",
];

/* ── Avatar colour palette — deterministic from name ── */
const AVATAR_COLORS = ["#1F7A3D","#0E6FA3","#B4561A","#B01457","#6D4C99","#2D7FF9","#C2185B","#00838F","#AD6800","#2E7D32","#1565C0","#6A1B9A","#00695C"];
const strHash = (s="") => [...s].reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0);
const avatarColor = (name) => AVATAR_COLORS[Math.abs(strHash(name)) % AVATAR_COLORS.length];
const initials = (n="") => n.replace(/\(.*\)/,"").trim().split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "?";
const Avatar = ({ name, size=22 }) => (
  <span className="gx-avatar" title={name} style={{ width:size, height:size, fontSize:size*0.4, background:avatarColor(name) }}>{initials(name)}</span>
);

const GYFTR_LOGO = "data:image/png;base64,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";
const GyftrLogo = ({ fs=18 }) => (
  <img src={GYFTR_LOGO} alt="GYFTR" style={{ height:Math.round(fs*1.5), width:"auto", display:"block" }} draggable={false}/>
);

/* ─────────────────────────────  HELPERS  ───────────────────────────── */
// ✅ PRODUCTION: Always use today's real date
const getTodayISO = () => new Date().toISOString().slice(0,10);
const TODAY_ISO = getTodayISO();
const TODAY = new Date(TODAY_ISO + "T00:00:00");
const NOW_MS = Date.now();

const fmtDate = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—";
const dayDiff = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const plusDays = (s,n) => { const d=new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const totalEffort = (eff=[]) => eff.reduce((s,e)=>s+(Number(e.hours)||0),0);
const fmtHrs = (h) => `${Math.round((Number(h)||0)*10)/10}h`;
const taskNo = (t) => parseInt((t.id.split("-")[1])||"0",10);

const agingDays = (t) => {
  const target = t.due || t.expected;
  if (!target) return 0;
  if (t.projectStatus === "Completed") {
    const final = t.delivered;
    return final ? Math.max(0, dayDiff(target, final)) : 0;
  }
  return Math.max(0, dayDiff(target, TODAY_ISO));
};

const csvCell = (v) => '"' + (v==null?"":String(v)).replace(/"/g,'""') + '"';
const exportBoardCSV = (rows) => {
  const headers = ["No.","Property","Task","Task Type","Team","Assigned To","Business Owner","Priority","Project Status","Effort Status",
    "Expected by Business","Promised Date","Delivered Date","Total Hours","Aging (days late)","Lock State",
    "Description","Effort Log","Comments","Last Updated"];
  const lines = [headers];
  rows.forEach(t=>{
    const u=t.update||{};
    const effortLog=(t.effort||[]).map(e=>`${fmtDate(e.date)} · ${e.status} · ${fmtHrs(e.hours)}${e.manual?" (MANUAL)":""}`).join(" | ");
    const comments=(t.comments||[]).map(c=>`${c.a} (${c.ts}): ${c.t}`).join(" | ");
    lines.push([ taskNo(t), t.property, t.task, t.type, t.team||"—", t.owner, t.businessOwner, t.priority, t.projectStatus, t.effortStatus,
      t.expected||t.requested, t.due, t.delivered, totalEffort(t.effort), agingDays(t), t.lockState||"locked", u.description,
      effortLog, comments, t.updatedAt ]);
  });
  const csv = "\uFEFF" + lines.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`gyftr_work_board_${TODAY_ISO}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

/* ─────────────────────────────  DB TRANSFORMERS  ───────────────────────────── */
function relativeTime(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 90) return "just now";
  if (diff < 3600) return `${Math.round(diff/60)}m`;
  if (diff < 86400) return `${Math.round(diff/3600)}h`;
  return `${Math.round(diff/86400)}d`;
}

function dbToTask(row) {
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
    team:          row.team || "—",
    update:        { description: row.description || "", files: [] },
    effort:        (row.effort_entries || []).map(e => ({
                     _id: e.id, date: e.date, status: e.status,
                     hours: parseFloat(e.hours), manual: e.manual,
                   })),
    comments:      (row.comments || []).map(c => ({
                     _id: c.id, a: c.author, r: c.role, t: c.body,
                     ts: new Date(c.created_at).toLocaleString("en-IN",
                       { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
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

function taskToDb(f, id) {
  return {
    id:             id,
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

/* ─────────────────────────────  SMALL UI  ───────────────────────────── */
const StatusChip = ({ status }) => {
  const s = STATUS[status] || { bg:"#eee", fg:"#555", dot:"#999" };
  return <span className="gx-chip" style={{ background:s.bg, color:s.fg }}><span style={{ width:7,height:7,borderRadius:99,background:s.dot }}/>{status||"—"}</span>;
};
const PriorityChip = ({ p }) => {
  const s = PRIORITY[p];
  if (!s) return <span className="gx-chip" style={{ background:"#eee", color:"#666" }}>—</span>;
  return <span className="gx-chip" style={{ background:s.bg, color:s.fg }}><Flag size={11} fill={s.dot} color={s.dot}/>{p}</span>;
};
function ChipMenu({ trigger, options, value, onPick, render, width=200 }) {
  const [open,setOpen] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-block" }}>
      <span style={{ cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>{trigger}</span>
      {open && (<>
        <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
        <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:6, width, boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
          {options.map(o=>(
            <div key={o} className="gx-menuitem" style={{ background:o===value?"#F1F6F1":"transparent" }} onClick={()=>{ onPick(o); setOpen(false); }}>{render(o)}</div>
          ))}
        </div>
      </>)}
    </span>
  );
}
function TextCell({ value, onCommit, placeholder, bold }) {
  const [v,setV] = useState(value ?? "");
  useEffect(()=>{ setV(value ?? ""); }, [value]);
  return <input className="gx-cellinput" value={v} placeholder={placeholder} style={{ fontWeight:bold?600:400 }}
    onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!==(value??"")) onCommit(v); }} onKeyDown={e=>{ if(e.key==="Enter") e.currentTarget.blur(); }}/>;
}
function DateCell({ value, onCommit }) {
  return <input type="date" className="gx-cellinput gx-mono" value={value||""} onChange={e=>onCommit(e.target.value)} style={{ minWidth:104, fontSize:11.5 }}/>;
}
function EffortAddCell({ onAdd }) {
  const [h,setH] = useState("");
  const add = () => { const n=parseFloat(h); if(n>0){ onAdd(n); setH(""); } };
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      <input className="gx-mono" type="number" step="0.5" min="0" placeholder="h" value={h} onChange={e=>setH(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
        style={{ width:36, textAlign:"center", border:"1px solid var(--line)", borderRadius:6, padding:"5px 3px", fontFamily:"var(--font-m)", fontSize:12, outline:"none" }}/>
      <button className="gx-btn" onClick={add} style={{ background:"#EAF1EB", color:"var(--ink-soft)", padding:"5px 6px", fontSize:11.5, fontWeight:700, display:"inline-flex", alignItems:"center" }}><Plus size={12}/></button>
    </div>
  );
}
function TimerCell({ running, startedAt, onStart, onStop }) {
  const [,tick] = useState(0);
  useEffect(()=>{ if(!running) return; const id=setInterval(()=>tick(x=>x+1),1000); return ()=>clearInterval(id); },[running]);
  if (running) {
    const sec = Math.max(0, Math.floor((Date.now()-startedAt)/1000));
    const mm = String(Math.floor(sec/60)).padStart(2,"0"), ss = String(sec%60).padStart(2,"0");
    return (
      <button className="gx-btn" onClick={()=>onStop((Date.now()-startedAt)/3600000)}
        style={{ background:"#FDE2E2", color:"#C42424", padding:"6px 9px", fontSize:12, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
        <Square size={11} fill="#C42424"/> {mm}:{ss}
      </button>
    );
  }
  return (
    <button className="gx-btn" onClick={onStart}
      style={{ background:"var(--pop-soft)", color:"var(--pop-deep)", padding:"6px 11px", fontSize:12.5, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
      <Play size={12} fill="var(--pop-deep)"/> Start
    </button>
  );
}
const Caret = () => <ChevronDown size={13} style={{ position:"absolute", right:6, top:9, color:"#94a59b", pointerEvents:"none" }}/>;

/* ─────────────────────────────  LOGIN  ───────────────────────────── */
function Login({ onIn }) {
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [err,setErr]       = useState("");
  const [loading,setLoading] = useState(false);

  const signIn = async () => {
    setErr(""); setLoading(true);
    if (!supabase) { setErr("Supabase not configured."); setLoading(false); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr(error.message); setLoading(false); return; }
    // ✅ PRODUCTION: name comes from email prefix, full name from profiles
    const name = data.user?.email?.split("@")[0] || "User";
    onIn(name, data.user);
    setLoading(false);
  };

  return (
    <div className="gx-root" style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"radial-gradient(120% 120% at 80% 0%, #E9F4D5 0%, #F3F6F2 42%)" }}>
      <style>{STYLES}</style>
      <div className="gx-fade" style={{ width:380, maxWidth:"92vw" }}>
        <div style={{ marginBottom:26 }}>
          <GyftrLogo fs={28}/>
          <div style={{ fontSize:11.5, color:"var(--ink-soft)", fontWeight:600, marginTop:8, paddingLeft:2 }}>Creative &amp; Content Work Portal</div>
        </div>
        <div className="gx-card" style={{ padding:26 }}>
          <h1 className="gx-disp" style={{ fontSize:23, fontWeight:700, margin:"0 0 4px" }}>Welcome back</h1>
          <p style={{ fontSize:13.5, color:"var(--ink-soft)", margin:"0 0 22px" }}>Track every piece of content &amp; creative work and the effort behind it.</p>
          <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Company email</label>
          <input className="gx-input" style={{ margin:"6px 0 14px" }} type="email" value={email} placeholder="you@gyftr.com" onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/>
          <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Password</label>
          <input className="gx-input" type="password" placeholder="••••••••" style={{ margin:"6px 0 18px" }} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/>
          {err && <div style={{ fontSize:12, color:"#C42424", marginBottom:10, fontWeight:600 }}>{err}</div>}
          <button className="gx-btn gx-btn-dark" disabled={loading} style={{ width:"100%", justifyContent:"center", padding:"11px", opacity:loading?.6:1 }} onClick={signIn}>{loading?"Signing in…":"Sign in"}</button>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, fontSize:12.5, fontWeight:600 }}>
            <span style={{ color:"var(--ink-soft)" }}>Manager access only</span>
            <span style={{ color:"var(--ink-soft)" }}>Contact GyFTR admin to reset</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  DASHBOARD  ───────────────────────────── */
const PROP_COLOR = { HDFC:"#62A92A", SBI:"#2D7FF9", RBL:"#8B5CF6", OTHERS:"#F5A623" };
const TYPE_PALETTE = ["#62A92A","#2D7FF9","#8B5CF6","#F5A623","#06B6D4","#E11D74","#15803D","#FF8A4C","#A855F7","#0EA5E9","#84CC16","#EF4444","#F59E0B","#10B981","#3B82F6","#EC4899","#6366F1","#14B8A6","#F97316","#22C55E","#A78BFA","#FB7185","#0891B2"];
const typeColor = (t) => TYPE_PALETTE[Math.max(0, TASK_TYPES.indexOf(t)) % TYPE_PALETTE.length];
const RANGE_OPTS = [
  { k:"all", label:"All time", days:null },
  { k:"1d",  label:"Today",        days:1   },
  { k:"1w",  label:"Last 1 week",  days:7   },
  { k:"1m",  label:"Last 1 month", days:30  },
  { k:"3m",  label:"Last 3 months",days:90  },
  { k:"6m",  label:"Last 6 months",days:180 },
  { k:"1y",  label:"Last 1 year",  days:365 },
];

function Dashboard({ tasks, owners, bizOwners, onCreate, openDrawer }) {
  const [drill, setDrill] = useState(null);
  const [selProps, setSelProps] = useState(PROPERTIES.slice());
  const [selTypes, setSelTypes] = useState(TASK_TYPES.slice());
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [propMenuOpen, setPropMenuOpen] = useState(false);
  const [range, setRange] = useState("all");
  const [fStatus, setFStatus] = useState(STATUS_LIST.slice());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [fOwner, setFOwner] = useState("All");
  const [fBizOwner, setFBizOwner] = useState("All");

  const rangeDays = RANGE_OPTS.find(r=>r.k===range)?.days;
  const from = rangeDays ? plusDays(TODAY_ISO, -rangeDays) : "";
  const to   = rangeDays ? TODAY_ISO : "";

  const hasFilter = range!=="all"||fStatus.length!==STATUS_LIST.length||fOwner!=="All"||fBizOwner!=="All"||selProps.length!==PROPERTIES.length||selTypes.length!==TASK_TYPES.length;
  const clearAll = ()=>{ setRange("all"); setFStatus(STATUS_LIST.slice()); setFOwner("All"); setFBizOwner("All"); setSelProps(PROPERTIES.slice()); setSelTypes(TASK_TYPES.slice()); setDrill(null); };
  const inRange = (d)=> d ? ((!from||d>=from)&&(!to||d<=to)) : false;
  const taskInRange = (t)=>{ if(!from&&!to) return true; const s=t.requested||t.due, e=t.expected||t.due; if(!s&&!e) return (t.effort||[]).some(x=>inRange(x.date)); return (!to||(s||e)<=to)&&(!from||(e||s)>=from); };
  const effEntries = (t)=> (from||to) ? (t.effort||[]).filter(e=>inRange(e.date)) : (t.effort||[]);
  const effTotal = (t)=> effEntries(t).reduce((a,e)=>a+(Number(e.hours)||0),0);

  const filtered = useMemo(()=>tasks.filter(t=>
    selProps.includes(t.property) && selTypes.includes(t.type) &&
    fStatus.includes(t.projectStatus) && (fOwner==="All"||t.owner===fOwner) && (fBizOwner==="All"||t.businessOwner===fBizOwner) && taskInRange(t)
  ),[tasks,selProps,selTypes,fStatus,fOwner,fBizOwner,range]);

  const isActive=(t)=>STATUS[t.projectStatus]?.group==="active";
  const isHold=(t)=>STATUS[t.projectStatus]?.group==="hold";
  const isDone=(t)=>t.projectStatus==="Completed";
  const isOverdue=(t)=>agingDays(t)>0;
  const totalAll = filtered.reduce((s,t)=>s+effTotal(t),0);

  const cards = [
    { k:"total",   label:"Total Tasks",  value:filtered.length,              sub:"click to see all",  rows:()=>filtered },
    { k:"active",  label:"In Progress",  value:filtered.filter(isActive).length, c:"#2D7FF9", sub:"active stages", rows:()=>filtered.filter(isActive) },
    { k:"hold",    label:"On Hold",      value:filtered.filter(isHold).length,   c:"#E11D74", sub:"hold / deferred", rows:()=>filtered.filter(isHold) },
    { k:"done",    label:"Completed",    value:filtered.filter(isDone).length,   c:"#15803D", sub:"closed out",    rows:()=>filtered.filter(isDone) },
    { k:"overdue", label:"Overdue",      value:filtered.filter(isOverdue).length,c:"#F5A623", sub:"past due",      rows:()=>filtered.filter(isOverdue) },
    { k:"effort",  label:"Total Effort", value:fmtHrs(totalAll),                 c:"#067A8C", sub:"hours · click for split", rows:()=>[...filtered].sort((a,b)=>effTotal(b)-effTotal(a)) },
  ];
  const active = cards.find(c=>c.k===drill);
  const drillRows = active ? active.rows() : [];

  const statusData = PROJECT_STATUS_LIST.map(s=>({ name:s, value:filtered.filter(t=>t.projectStatus===s).length, fill:STATUS[s].dot })).filter(d=>d.value>0);
  const overdueByProperty = PROPERTIES.filter(p=>selProps.includes(p)).map(p=>({ name:p, count:filtered.filter(t=>t.property===p&&agingDays(t)>0).length, fill:PROP_COLOR[p] })).filter(d=>d.count>0);

  const dateMap = {};
  filtered.forEach(t => { effEntries(t).forEach(e => { if(!dateMap[e.date]) dateMap[e.date]={ date:e.date }; dateMap[e.date][t.type]=(dateMap[e.date][t.type]||0)+(Number(e.hours)||0); }); });
  const dateData = Object.values(dateMap).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({ ...d, name:fmtDate(d.date) }));
  const typesInDateData = TASK_TYPES.filter(t=>selTypes.includes(t) && dateData.some(d=>d[t]>0));

  const typeMap = {};
  filtered.forEach(t => { if(!typeMap[t.type]) typeMap[t.type]={ name:t.type }; typeMap[t.type][t.property]=(typeMap[t.type][t.property]||0)+1; });
  const typeData = Object.values(typeMap).sort((a,b)=>{ const sa=PROPERTIES.reduce((s,p)=>s+(a[p]||0),0); const sb=PROPERTIES.reduce((s,p)=>s+(b[p]||0),0); return sb-sa; });
  const propsInTypeData = PROPERTIES.filter(p=>selProps.includes(p) && typeData.some(d=>d[p]>0));

  const propHoursMap = {};
  filtered.forEach(t => { const ents=effEntries(t); if(!ents.length) return; if(!propHoursMap[t.property]) propHoursMap[t.property]={ name:t.property }; const h=ents.reduce((s,e)=>s+(Number(e.hours)||0),0); propHoursMap[t.property][t.type]=(propHoursMap[t.property][t.type]||0)+h; });
  const propHoursData = PROPERTIES.filter(p=>selProps.includes(p)).map(p=>propHoursMap[p]).filter(Boolean);
  const typesInPropHours = TASK_TYPES.filter(t=>selTypes.includes(t) && propHoursData.some(d=>(d[t]||0)>0));

  const toggleProp   = (p)=>setSelProps(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p]);
  const toggleType   = (t)=>setSelTypes(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t]);
  const toggleStatus = (s)=>setFStatus(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]);
  const titleStyle = { fontSize:15, fontWeight:700, margin:"0 0 4px" };

  return (
    <div className="gx-fade" style={{ padding:"24px 30px", overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 className="gx-disp" style={{ fontSize:26, fontWeight:700, margin:0 }}>Dashboard &amp; Reporting</h1>
          <p style={{ color:"var(--ink-soft)", fontSize:13.5, margin:"4px 0 0" }}>Filter by property, task type, status, owner or date range.</p>
        </div>
        <button className="gx-btn gx-btn-dark" onClick={onCreate}><Plus size={16}/> Create task</button>
      </div>

      {/* FILTER BAR */}
      <div className="gx-card" style={{ padding:"12px 14px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
        {/* Property filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setPropMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"8px 11px", fontSize:12.5 }}>
            Property: <b style={{ marginLeft:4 }}>{selProps.length===PROPERTIES.length?"All":selProps.length===0?"None":selProps.length===1?selProps[0]:`${selProps.length} of ${PROPERTIES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {propMenuOpen && (<>
            <div onClick={()=>setPropMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:200, boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Property</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setSelProps(selProps.length===PROPERTIES.length?[]:PROPERTIES.slice())}>{selProps.length===PROPERTIES.length?"Clear":"All"}</span>
              </div>
              {PROPERTIES.map(p=>{ const on=selProps.includes(p); return (
                <div key={p} onClick={()=>toggleProp(p)} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 5px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:13, height:13, borderRadius:3, background: on?PROP_COLOR[p]:"transparent", border: on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color: on?PROP_COLOR[p]:"var(--ink-soft)" }}>{p}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Task type filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setTypeMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"8px 11px", fontSize:12.5 }}>
            <FileText size={13}/>Types: <b style={{ marginLeft:4 }}>{selTypes.length===TASK_TYPES.length?"All":`${selTypes.length} of ${TASK_TYPES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {typeMenuOpen && (<>
            <div onClick={()=>setTypeMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:240, maxHeight:340, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Task type</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setSelTypes(selTypes.length===TASK_TYPES.length?[]:TASK_TYPES.slice())}>{selTypes.length===TASK_TYPES.length?"Clear":"All"}</span>
              </div>
              {TASK_TYPES.map(t=>{ const on=selTypes.includes(t); return (
                <div key={t} onClick={()=>toggleType(t)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:12, height:12, borderRadius:3, background: on?typeColor(t):"transparent", border: on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color: on?"var(--ink)":"var(--ink-soft)" }}>{t}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Range */}
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:170 }} value={range} onChange={e=>setRange(e.target.value)}>{RANGE_OPTS.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</select><Caret/></div>

        {/* Status filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setStatusMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"8px 11px", fontSize:12.5 }}>
            Status: <b style={{ marginLeft:4 }}>{fStatus.length===STATUS_LIST.length?"All":`${fStatus.length} of ${STATUS_LIST.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {statusMenuOpen && (<>
            <div onClick={()=>setStatusMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:220, maxHeight:320, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Status</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setFStatus(fStatus.length===STATUS_LIST.length?[]:STATUS_LIST.slice())}>{fStatus.length===STATUS_LIST.length?"Clear":"All"}</span>
              </div>
              {STATUS_LIST.map(s=>{ const on=fStatus.includes(s); return (
                <div key={s} onClick={()=>toggleStatus(s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:13, height:13, borderRadius:3, background: on?STATUS[s].dot:"transparent", border: on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color: on?"var(--ink)":"var(--ink-soft)" }}>{s}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* ✅ PRODUCTION: owners come from DB, not hardcoded */}
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={fOwner} onChange={e=>setFOwner(e.target.value)}><option value="All">Assigned to: All</option>{owners.map(o=><option key={o}>{o}</option>)}</select><Caret/></div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:150 }} value={fBizOwner} onChange={e=>setFBizOwner(e.target.value)}><option value="All">Biz Owner: All</option>{bizOwners.map(o=><option key={o}>{o}</option>)}</select><Caret/></div>

        {hasFilter && <button className="gx-btn gx-btn-ghost" style={{ border:"1px solid var(--line)" }} onClick={clearAll}><X size={14}/> Clear</button>}
        <span style={{ marginLeft:"auto", fontSize:12.5, fontWeight:600, color:"var(--ink-soft)" }}>{filtered.length} of {tasks.length} tasks</span>
      </div>

      {/* KPI CARDS */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:14, marginBottom:14 }}>
        {cards.map(c=>(
          <div key={c.k} className="gx-card" onClick={()=>setDrill(drill===c.k?null:c.k)} style={{ padding:"15px 16px", cursor:"pointer", transition:".15s", outline: drill===c.k?"2px solid var(--pop)":"2px solid transparent", boxShadow: drill===c.k?"0 10px 26px -12px rgba(76,138,30,.5)":"none" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>{c.label}</span>
              <ChevronRight size={14} color={drill===c.k?"var(--pop)":"#b9c4bc"} style={{ transform:drill===c.k?"rotate(90deg)":"none", transition:".15s" }}/>
            </div>
            <div className="gx-disp" style={{ fontSize:29, fontWeight:700, margin:"6px 0 2px", color:c.c||"var(--ink)" }}>{c.value}</div>
            <div style={{ fontSize:11, color:"var(--ink-soft)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* DRILL TABLE */}
      {active && (
        <div className="gx-card gx-fade" style={{ marginBottom:18, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid var(--line)" }}>
            <span style={{ width:4, height:18, borderRadius:4, background:"var(--pop)" }}/><b className="gx-disp" style={{ fontSize:15 }}>{active.label}</b>
            <span className="gx-mono" style={{ fontSize:11, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:99 }}>{drillRows.length}</span>
            <button className="gx-btn gx-btn-ghost" style={{ marginLeft:"auto", padding:6 }} onClick={()=>setDrill(null)}><X size={16}/></button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["No.","Property","Task","Owner","Project Status","Total Hrs","Aging"].map(h=><th key={h} className="gx-th">{h}</th>)}</tr></thead>
            <tbody>
              {drillRows.map(t=>{ const ag=agingDays(t); return (
                <tr key={t.id} className="gx-row" style={{ cursor:"pointer" }} onClick={()=>openDrawer(t.id, drill==="effort"?"Effort":"Update")}>
                  <td className="gx-td gx-mono" style={{ color:"var(--ink-soft)" }}>{taskNo(t)}</td>
                  <td className="gx-td" style={{ fontWeight:600 }}>{t.property}</td>
                  <td className="gx-td" style={{ fontWeight:600 }}>{t.task}</td>
                  <td className="gx-td"><div style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar name={t.owner} size={20}/>{t.owner}</div></td>
                  <td className="gx-td"><StatusChip status={t.projectStatus}/></td>
                  <td className="gx-td gx-mono" style={{ fontWeight:700, color:"#067A8C" }}>{fmtHrs(effTotal(t))}</td>
                  <td className="gx-td">{ag>0 ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={11}/>{ag}d</span> : <span style={{ fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>On time</span>}</td>
                </tr>
              );})}
              {drillRows.length===0 && <tr><td className="gx-td" colSpan={7} style={{ color:"var(--ink-soft)" }}>No tasks match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* CHARTS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={titleStyle}>Tasks by status</h3>
          <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 8px" }}>Project status distribution</p>
          <div style={{ display:"flex", alignItems:"center", gap:18 }}>
            <ResponsiveContainer width={170} height={170}><PieChart><Pie data={statusData} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">{statusData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }}/></PieChart></ResponsiveContainer>
            <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 10px" }}>
              {statusData.map(d=>(<div key={d.name} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11.5, fontWeight:600 }}><span style={{ width:8,height:8,borderRadius:99,background:d.fill,flex:"none" }}/><span style={{ color:"var(--ink-soft)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span><span style={{ marginLeft:"auto" }}>{d.value}</span></div>))}
              {statusData.length===0 && <span style={{ fontSize:12.5, color:"var(--ink-soft)" }}>No tasks.</span>}
            </div>
          </div>
        </div>
        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={titleStyle}>Overdue per property</h3>
          {overdueByProperty.length ? (
            <ResponsiveContainer width="100%" height={190}><BarChart data={overdueByProperty} barCategoryGap="30%"><CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/><XAxis dataKey="name" tick={{ fontSize:11.5, fontWeight:700, fill:"#586860" }} axisLine={false} tickLine={false} interval={0} height={28}/><YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip cursor={{ fill:"#F1F6F1" }} contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }}/><Bar dataKey="count" radius={[6,6,0,0]}>{overdueByProperty.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer>
          ) : <div style={{ height:190, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No overdue tasks 🎉</div>}
        </div>
      </div>

      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:16 }}>
        <h3 className="gx-disp" style={titleStyle}>Tasks per task type · by property</h3>
        <ResponsiveContainer width="100%" height={260}><BarChart data={typeData} barCategoryGap="22%"><CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/><XAxis dataKey="name" tick={{ fontSize:10, fill:"#586860" }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={62}/><YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip cursor={{ fill:"#F1F6F1" }} contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }}/>
          {propsInTypeData.map((p,i,arr)=>(<Bar key={p} dataKey={p} stackId="p" fill={PROP_COLOR[p]} radius={i===arr.length-1?[5,5,0,0]:[0,0,0,0]}/>))}
        </BarChart></ResponsiveContainer>
      </div>

      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:16 }}>
        <h3 className="gx-disp" style={titleStyle}>Total hours per date · by task type</h3>
        {dateData.length ? (
          <ResponsiveContainer width="100%" height={250}><BarChart data={dateData} barCategoryGap="22%"><CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/><XAxis dataKey="name" tick={{ fontSize:10, fill:"#586860" }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={56}/><YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} unit="h"/><Tooltip cursor={{ fill:"#F1F6F1" }} contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }} formatter={(v,n)=>[fmtHrs(v),n]}/>
            {typesInDateData.map((t,i,arr)=>(<Bar key={t} dataKey={t} stackId="d" fill={typeColor(t)} radius={i===arr.length-1?[5,5,0,0]:[0,0,0,0]}/>))}
          </BarChart></ResponsiveContainer>
        ) : <div style={{ height:250, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No effort logged yet.</div>}
      </div>

      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:16 }}>
        <h3 className="gx-disp" style={titleStyle}>Total hours per property · by task type</h3>
        {propHoursData.length ? (
          <ResponsiveContainer width="100%" height={250}><BarChart data={propHoursData} barCategoryGap="22%"><CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/><XAxis dataKey="name" tick={(props)=>{ const { x, y, payload } = props; return <text x={x} y={y+15} fontSize={12.5} fontWeight={800} fill={PROP_COLOR[payload.value]||"#586860"} textAnchor="middle">{payload.value}</text>; }} axisLine={false} tickLine={false} interval={0} height={32}/><YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} unit="h"/><Tooltip cursor={{ fill:"#F1F6F1" }} contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }} formatter={(v,n)=>[fmtHrs(v),n]}/>
            {typesInPropHours.map((t,i,arr)=>(<Bar key={t} dataKey={t} stackId="ph" fill={typeColor(t)} radius={i===arr.length-1?[5,5,0,0]:[0,0,0,0]}/>))}
          </BarChart></ResponsiveContainer>
        ) : <div style={{ height:250, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No effort logged.</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────  WORK BOARD  ───────────────────────────── */
const COLS = [
  { k:"no",          label:"No.",            w:36  },
  { k:"property",    label:"Property",       w:78  },
  { k:"task",        label:"Task",           w:204 },
  { k:"type",        label:"Task Type",      w:114 },
  { k:"assignee",    label:"Assigned To",    w:122 },
  { k:"bizOwner",    label:"Business Owner", w:122 },
  { k:"effortStatus",label:"Effort Status",  w:130 },
  { k:"projectStatus",label:"Project Status",w:138 },
  { k:"lock",        label:"Lock",           w:46  },
  { k:"promise",     label:"Promised",       w:96  },
  { k:"delivered",   label:"Delivered",      w:96  },
  { k:"timer",       label:"Timer",          w:90  },
  { k:"total",       label:"Total Hrs",      w:130 },
  { k:"aging",       label:"Aging",          w:64  },
  { k:"priority",    label:"Priority",       w:94  },
  { k:"updated",     label:"Updated",        w:64  },
];
const TABLE_W = COLS.reduce((s,c)=>s+c.w,0) + 16;

function LockCell({ state, onToggle }) {
  if (state === "unlocked") return <button className="gx-btn" onClick={onToggle} style={{ background:"#E1F5E8", color:"#15803D", padding:"5px 7px", display:"inline-flex", alignItems:"center", justifyContent:"center" }}><Unlock size={14}/></button>;
  if (state === "requested") return <button className="gx-btn" onClick={onToggle} style={{ background:"#FDE2E2", color:"#C42424", padding:"5px 7px", display:"inline-flex", alignItems:"center", justifyContent:"center" }}><Lock size={14}/></button>;
  return <button className="gx-btn" onClick={onToggle} style={{ background:"#EAF1EB", color:"#586860", padding:"5px 7px", display:"inline-flex", alignItems:"center", justifyContent:"center" }}><Lock size={14}/></button>;
}

function Board({ tasks, patch, addEffort, openDrawer, owners, bizOwners }) {
  const [q,setQ]             = useState("");
  const [fProp,setFProp]     = useState("All");
  const [fStatus,setFStatus] = useState("All");
  const [fAssignee,setFAssignee] = useState("All");
  const [fPri,setFPri]       = useState("All");
  const [fBizOwner,setFBizOwner] = useState("All");

  const rows = useMemo(()=>tasks
    .filter(t => (fProp==="All"||t.property===fProp)
      && (fStatus==="All"||t.projectStatus===fStatus)
      && (fAssignee==="All"||t.owner===fAssignee)
      && (fBizOwner==="All"||t.businessOwner===fBizOwner)
      && (fPri==="All"||t.priority===fPri)
      && (q===""||((t.task+t.id+t.type+t.property+(t.owner||"")+(t.businessOwner||"")).toLowerCase().includes(q.toLowerCase()))))
    .sort((a,b)=> (b.updatedTs||0)-(a.updatedTs||0))
  ,[tasks,q,fProp,fStatus,fAssignee,fBizOwner,fPri]);

  const startTimer = (id)=>patch(id,{ running:true, startedAt:Date.now() });
  const stopTimer  = (t,hours)=>{ addEffort(t.id,{ date:TODAY_ISO, status:t.effortStatus, hours:Math.round(hours*100)/100 }); patch(t.id,{ running:false, startedAt:null }); };
  const cycleLock  = (t)=>{ const s=t.lockState||"locked"; patch(t.id,{ lockState: s==="unlocked"?"locked":"unlocked" }); };

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"18px 24px 10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <h1 className="gx-disp" style={{ fontSize:23, fontWeight:700, margin:0 }}>Work Board <span style={{ fontSize:13, fontWeight:600, color:"var(--ink-soft)" }}>· manager view</span></h1>
          {(()=>{ const req=tasks.filter(t=>t.lockState==="requested").length; return req>0 ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424", fontWeight:700, fontSize:12 }}><Lock size={12}/> {req} promise date unlock{req>1?"s":""}</span> : null; })()}
        </div>
        <p style={{ color:"var(--ink-soft)", fontSize:13, margin:"3px 0 0" }}>Assign work, track effort with Start/Stop, and grant manual-change permissions.</p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"0 24px 12px", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:"0 0 220px" }}>
          <Search size={15} style={{ position:"absolute", left:11, top:10, color:"#94a59b" }}/>
          <input className="gx-input" style={{ paddingLeft:32 }} placeholder="Search task, owner…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:136 }} value={fProp} onChange={e=>setFProp(e.target.value)}><option value="All">Property: All</option>{PROPERTIES.map(p=><option key={p}>{p}</option>)}</select><Caret/></div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:146 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="All">Status: All</option>{PROJECT_STATUS_LIST.map(s=><option key={s}>{s}</option>)}</select><Caret/></div>
        {/* ✅ PRODUCTION: owners from DB */}
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={fAssignee} onChange={e=>setFAssignee(e.target.value)}><option value="All">Assigned to: All</option>{owners.map(o=><option key={o}>{o}</option>)}</select><Caret/></div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:150 }} value={fBizOwner} onChange={e=>setFBizOwner(e.target.value)}><option value="All">Biz Owner: All</option>{bizOwners.map(o=><option key={o}>{o}</option>)}</select><Caret/></div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:136 }} value={fPri} onChange={e=>setFPri(e.target.value)}><option value="All">Priority: All</option>{PRIORITY_LIST.map(p=><option key={p}>{p}</option>)}</select><Caret/></div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:"var(--ink-soft)" }}>{rows.length} of {tasks.length}</span>
          <button className="gx-btn gx-btn-dark" onClick={()=>exportBoardCSV(rows)}><Download size={15}/> Export CSV</button>
        </div>
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"0 24px 24px" }}>
        <div className="gx-card" style={{ overflow:"visible", minWidth:TABLE_W, width:"100%", maxWidth:TABLE_W }}>
          <table className="gx-board" style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
            <colgroup>{COLS.map(c=><col key={c.k} style={{ width:c.w }}/>)}</colgroup>
            <thead><tr>{COLS.map(c=><th key={c.k} className="gx-th">{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map(t=>{ const ag=agingDays(t); const total=totalEffort(t.effort); const lockS=t.lockState||"locked"; const canEditPromise=lockS==="unlocked"; return (
                <tr key={t.id} className="gx-row">
                  <td className="gx-td gx-mono" style={{ fontWeight:600, color:"var(--ink-soft)", textAlign:"center" }}>{taskNo(t)}</td>
                  <td className="gx-td" style={{ position:"relative" }}><select className="gx-sel" style={{ fontWeight:700, color: PROP_COLOR[t.property] }} value={t.property} onChange={e=>patch(t.id,{property:e.target.value})}>{PROPERTIES.map(p=><option key={p}>{p}</option>)}</select></td>
                  <td className="gx-td">
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ flex:1, minWidth:0 }}><TextCell value={t.task} bold onCommit={v=>patch(t.id,{task:v})} placeholder="Task name…"/></div>
                      <button className="gx-btn gx-btn-ghost" onClick={()=>openDrawer(t.id,"Update")} style={{ padding:"5px 5px", flex:"none" }}><Pencil size={13}/></button>
                    </div>
                  </td>
                  <td className="gx-td" style={{ position:"relative" }}><select className="gx-sel" value={t.type} onChange={e=>patch(t.id,{type:e.target.value})}>{TASK_TYPES.map(c=><option key={c}>{c}</option>)}</select></td>
                  <td className="gx-td"><div style={{ display:"flex", alignItems:"center", gap:5 }}><Avatar name={t.owner} size={20}/><select className="gx-sel" value={t.owner||""} onChange={e=>patch(t.id,{owner:e.target.value})}>{owners.map(o=><option key={o}>{o}</option>)}</select></div></td>
                  <td className="gx-td"><div style={{ display:"flex", alignItems:"center", gap:5 }}><Avatar name={t.businessOwner} size={20}/><select className="gx-sel" value={t.businessOwner||""} onChange={e=>patch(t.id,{businessOwner:e.target.value})}>{bizOwners.map(o=><option key={o}>{o}</option>)}</select></div></td>
                  <td className="gx-td"><ChipMenu trigger={<StatusChip status={t.effortStatus}/>} options={EFFORT_STATUS_LIST} value={t.effortStatus} onPick={s=>patch(t.id,{effortStatus:s})} render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/></td>
                  <td className="gx-td"><ChipMenu trigger={<StatusChip status={t.projectStatus}/>} options={PROJECT_STATUS_LIST} value={t.projectStatus} onPick={s=>patch(t.id,{ projectStatus:s })} render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/></td>
                  <td className="gx-td" style={{ textAlign:"center" }}><LockCell state={lockS} onToggle={()=>cycleLock(t)}/></td>
                  <td className="gx-td">{canEditPromise
                    ? <DateCell value={t.due} onCommit={v=>patch(t.id,{due:v})}/>
                    : <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:t.due?"var(--ink)":"#94a59b" }}>{t.due?fmtDate(t.due):"—"}</span>
                        {lockS==="requested" && <span style={{ fontSize:9.5, fontWeight:700, color:"#C42424" }}>req</span>}
                        {lockS==="locked" && <Lock size={10} color="#94a59b"/>}
                      </div>
                  }</td>
                  <td className="gx-td">{t.delivered ? <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:"#0F6B33" }}>{fmtDate(t.delivered)}</span> : <span style={{ fontSize:11.5, color:"#94a59b", fontStyle:"italic" }}>—</span>}</td>
                  <td className="gx-td"><TimerCell running={t.running} startedAt={t.startedAt} onStart={()=>startTimer(t.id)} onStop={(h)=>stopTimer(t,h)}/></td>
                  <td className="gx-td">
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <button className="gx-btn" onClick={()=>openDrawer(t.id,"Effort")} style={{ background:"transparent", color:"var(--pop-deep)", fontWeight:700, fontSize:13, display:"inline-flex", alignItems:"center", gap:3, padding:"3px 2px" }}><Timer size={13}/>{fmtHrs(total)}</button>
                      <EffortAddCell onAdd={h=>addEffort(t.id,{ date:TODAY_ISO, status:t.effortStatus, hours:h, manual:true })}/>
                    </div>
                  </td>
                  <td className="gx-td">{ag>0 ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={11}/>{ag}d</span> : <span style={{ fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>On time</span>}</td>
                  <td className="gx-td"><ChipMenu trigger={<PriorityChip p={t.priority}/>} options={PRIORITY_LIST} value={t.priority} width={150} onPick={p=>patch(t.id,{priority:p})} render={p=><><Flag size={12} fill={PRIORITY[p].dot} color={PRIORITY[p].dot}/>{p}</>}/></td>
                  <td className="gx-td" style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{t.updatedAt}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  TASK DRAWER  ───────────────────────────── */
function Drawer({ task, tab, setTab, onClose, patch, patchUpdate, addEffort, removeEffort, addComment, owners, currentUser }) {
  const [draft,setDraft] = useState("");
  const [eDate,setEDate] = useState(TODAY_ISO);
  const [eStatus,setEStatus] = useState(task?.effortStatus || "Discussion");
  const [eHrs,setEHrs]   = useState("");
  if (!task) return null;
  const u = task.update || {};
  const total = totalEffort(task.effort);
  const TABS = ["Update","Effort","Comments","Activity"];
  const lockS = task.lockState || "locked";
  const submitEffort = () => { const n=parseFloat(eHrs); if(n>0){ addEffort(task.id,{ date:eDate, status:eStatus, hours:n, manual:true }); setEHrs(""); } };

  return (
    <>
      <div className="gx-scrim" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,36,25,.3)", zIndex:60 }}/>
      <div className="gx-drawer gx-root" style={{ position:"fixed", top:0, right:0, height:"100vh", width:540, maxWidth:"96vw", background:"var(--surface)", zIndex:70, boxShadow:"-30px 0 60px -30px rgba(0,0,0,.4)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:"var(--ink-soft)" }}>#{taskNo(task)}</span>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--pop-deep)", background:"var(--pop-soft)", padding:"2px 8px", borderRadius:7 }}>{task.property}</span>
            <span style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:7 }}>{task.team||"—"} · {task.type}</span>
            <PriorityChip p={task.priority}/>
            <button className="gx-btn gx-btn-ghost" style={{ marginLeft:"auto", padding:7 }} onClick={onClose}><X size={18}/></button>
          </div>
          <h2 className="gx-disp" style={{ fontSize:20, fontWeight:700, margin:"10px 0 10px" }}>{task.task}</h2>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <StatusChip status={task.projectStatus}/>
            <span className="gx-chip" style={{ background:"#EAF7F9", color:"#067A8C" }}><Timer size={12}/>{fmtHrs(total)} logged</span>
            {agingDays(task)>0 && <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={12}/>{agingDays(task)}d late</span>}
            {task.owner && <span className="gx-chip" style={{ background:"var(--pop-soft)", color:"var(--pop-deep)" }}><Avatar name={task.owner} size={14}/>Assigned to {task.owner}</span>}
          </div>
          <div className="gx-mono" style={{ fontSize:11.5, color:"var(--ink-soft)", marginTop:9 }}>
            Expected {fmtDate(task.expected||task.requested)} · Promise {fmtDate(task.due)}
            {task.delivered ? <> · <span style={{ color:"#0F6B33", fontWeight:700 }}>Delivered {fmtDate(task.delivered)}</span></> : null}
          </div>
        </div>

        <div style={{ display:"flex", padding:"0 22px", borderBottom:"1px solid var(--line)" }}>
          {TABS.map(t=><span key={t} className={"gx-tab"+(tab===t?" on":"")} onClick={()=>setTab(t)}>{t}</span>)}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {tab==="Update" && (
            <div className="gx-fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Assigned To</label>
                <div style={{ position:"relative" }}>
                  {/* ✅ PRODUCTION: owners from DB */}
                  <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }} value={task.owner||""} onChange={e=>patch(task.id,{ owner:e.target.value })}>
                    <option value="">Select…</option>{owners.map(o=><option key={o}>{o}</option>)}
                  </select><Caret/>
                </div>
                <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Team: <b>{task.team||"—"}</b></div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Delivered Date</label>
                <input className="gx-input" type="date" value={task.delivered||""} onChange={e=>patch(task.id,{delivered:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Comment / Description</label>
                <textarea className="gx-input" rows={4} style={{ resize:"vertical", fontFamily:"var(--font-b)" }} placeholder="Notes, brief, or reason for any delay…" value={u.description||""} onChange={e=>patchUpdate(task.id,{description:e.target.value})}/>
              </div>
              {/* ✅ PRODUCTION: File upload via Supabase Storage */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Files</label>
                <div className="gx-card" style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>
                  {(task.task_files||[]).length === 0 && <div style={{ fontSize:12.5, color:"var(--ink-soft)" }}>No files attached yet.</div>}
                  {(task.task_files||[]).map((f,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", background:"#F4F8F4", borderRadius:8 }}>
                      <Paperclip size={13} color="#586860"/>
                      <a href={f.file_url} target="_blank" rel="noreferrer" style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--pop-deep)", textDecoration:"none" }}>{f.file_name}</a>
                    </div>
                  ))}
                  <FileUploadCell taskId={task.id} currentUser={currentUser} onUploaded={()=>{}}/>
                </div>
              </div>
            </div>
          )}

          {tab==="Effort" && (
            <div className="gx-fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div className="gx-card" style={{ padding:14, background:"#EAF7F9", borderColor:"#BEE6EC" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#067A8C", textTransform:"uppercase" }}>Total effort</div>
                <div className="gx-disp" style={{ fontSize:28, fontWeight:700, color:"#067A8C", marginTop:4 }}>{fmtHrs(total)}</div>
                <div style={{ fontSize:12, color:"#067A8C" }}>across {(task.effort||[]).length} entries</div>
              </div>
              <div className="gx-card" style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:9, background: lockS==="unlocked"?"#E1F5E8":lockS==="requested"?"#FDE2E2":"#EAF1EB" }}>
                {lockS==="unlocked" ? <Unlock size={14} color="#15803D"/> : <Lock size={14} color={lockS==="requested"?"#C42424":"#586860"}/>}
                <div style={{ flex:1, fontSize:12.5, fontWeight:600, color: lockS==="unlocked"?"#15803D":lockS==="requested"?"#C42424":"#586860" }}>
                  {lockS==="unlocked" && "Promise date editable."}
                  {lockS==="locked" && "Promise date locked — request to change."}
                  {lockS==="requested" && "Unlock requested — awaiting manager."}
                </div>
                {lockS==="locked"    && <button className="gx-btn gx-btn-dark" style={{ padding:"5px 10px", fontSize:11.5 }} onClick={()=>patch(task.id,{ lockState:"requested" })}>Request</button>}
                {lockS==="requested" && <button className="gx-btn" style={{ padding:"5px 10px", fontSize:11.5, background:"#15803D", color:"#fff" }} onClick={()=>patch(task.id,{ lockState:"unlocked" })}><Check size={13}/> Grant</button>}
                {lockS==="unlocked"  && <button className="gx-btn gx-btn-ghost" style={{ padding:"5px 10px", fontSize:11.5, border:"1px solid var(--line)" }} onClick={()=>patch(task.id,{ lockState:"locked" })}>Lock</button>}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:8 }}>Effort log</div>
                {(task.effort||[]).length ? (
                  <div className="gx-card" style={{ overflow:"hidden" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}><thead><tr>{["Date","Status","Hours","Source",""].map(c=><th key={c} className="gx-th">{c}</th>)}</tr></thead>
                      <tbody>
                        {[...(task.effort||[])].map((e,i)=>{ const m=!!e.manual; return (
                          <tr key={i} className="gx-row" style={{ background:m?"#FFF4F4":"transparent" }}>
                            <td className="gx-td gx-mono" style={{ fontSize:12.5, color:m?"#C42424":"inherit" }}>{fmtDate(e.date)}</td>
                            <td className="gx-td"><StatusChip status={e.status}/></td>
                            <td className="gx-td gx-mono" style={{ fontSize:12.5, fontWeight:700, color:m?"#C42424":"#067A8C" }}>{fmtHrs(e.hours)}</td>
                            <td className="gx-td" style={{ fontSize:11.5, fontWeight:700, color:m?"#C42424":"var(--ink-soft)" }}>{m?"Manual":"Timer"}</td>
                            <td className="gx-td" style={{ textAlign:"right", borderRight:"none" }}>{m ? <X size={14} style={{ color:"#C42424", cursor:"pointer" }} onClick={()=>removeEffort(task.id,i)}/> : null}</td>
                          </tr>);
                        })}
                        <tr style={{ background:"#F4F8F4" }}><td className="gx-td" style={{ fontWeight:700, fontSize:12.5 }} colSpan={2}>Total</td><td className="gx-td gx-mono" style={{ fontWeight:700, fontSize:13.5, color:"#067A8C" }}>{fmtHrs(total)}</td><td className="gx-td"/><td className="gx-td" style={{ borderRight:"none" }}/></tr>
                      </tbody>
                    </table>
                  </div>
                ) : <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No effort logged yet.</div>}
              </div>
              <div className="gx-card" style={{ padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:10 }}>Add manually</div>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap" }}>
                  <div style={{ flex:"1 1 130px" }}><label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Date</label><input className="gx-input" type="date" style={{ marginTop:4 }} value={eDate} onChange={e=>setEDate(e.target.value)}/></div>
                  <div style={{ flex:"1 1 150px", position:"relative" }}><label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Status</label><select className="gx-input" style={{ marginTop:4, appearance:"none", cursor:"pointer", paddingRight:30 }} value={eStatus} onChange={e=>setEStatus(e.target.value)}>{EFFORT_STATUS_LIST.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div style={{ flex:"0 0 70px" }}><label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Hours</label><input className="gx-input gx-mono" type="number" step="0.5" min="0" placeholder="2.5" style={{ marginTop:4 }} value={eHrs} onChange={e=>setEHrs(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitEffort()}/></div>
                  <button className="gx-btn gx-btn-dark" onClick={submitEffort}><Plus size={15}/> Add</button>
                </div>
              </div>
            </div>
          )}

          {tab==="Comments" && (
            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
              {(task.comments||[]).map((c,i)=>(<div key={i} style={{ display:"flex", gap:10 }}>
                <Avatar name={c.a} size={30}/>
                <div style={{ background:"#F4F8F4", border:"1px solid var(--line)", borderRadius:"4px 12px 12px 12px", padding:"9px 12px", flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}><b style={{ fontSize:12.5 }}>{c.a}</b><span style={{ fontSize:10.5, fontWeight:700, color:"#1A5FD0", background:"#E3EEFF", padding:"1px 7px", borderRadius:6 }}>{c.r}</span><span style={{ marginLeft:"auto", fontSize:11, color:"#94a59b" }}>{c.ts}</span></div>
                  <div style={{ fontSize:13, lineHeight:1.45 }}>{c.t}</div>
                </div>
              </div>))}
              {(task.comments||[]).length===0 && <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No comments yet.</div>}
            </div>
          )}

          {tab==="Activity" && (
            <div style={{ position:"relative", paddingLeft:18 }}>
              <div style={{ position:"absolute", left:5, top:6, bottom:6, width:2, background:"var(--line)" }}/>
              {(task.audit||[]).map((a,i)=>(<div key={i} style={{ position:"relative", marginBottom:16 }}><span style={{ position:"absolute", left:-17, top:3, width:10, height:10, borderRadius:99, background:"var(--pop)", border:"2px solid #fff" }}/><div style={{ fontSize:13, fontWeight:600 }}>{a.x}</div><div style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{a.by} · {a.ts}</div></div>))}
            </div>
          )}
        </div>

        {tab==="Comments" && (
          <div style={{ padding:"12px 22px", borderTop:"1px solid var(--line)", display:"flex", gap:8 }}>
            <input className="gx-input" placeholder="Add a comment…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&draft.trim()){ addComment(task.id,draft.trim()); setDraft(""); } }}/>
            <button className="gx-btn gx-btn-dark" style={{ padding:"9px 12px" }} onClick={()=>{ if(draft.trim()){ addComment(task.id,draft.trim()); setDraft(""); } }}><Send size={15}/></button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────  FILE UPLOAD (Supabase Storage)  ─────────── */
function FileUploadCell({ taskId, currentUser, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploading(true); setErr("");
    try {
      const path = `tasks/${taskId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("task-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("task-files").getPublicUrl(path);
      await supabase.from("task_files").insert({
        task_id: taskId, uploaded_by: currentUser,
        file_name: file.name, file_url: publicUrl,
      });
      await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", taskId);
      onUploaded();
    } catch(ex) {
      setErr(ex.message || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div>
      <label className="gx-btn gx-btn-ghost" style={{ border:"1px dashed var(--line)", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", padding:"8px 10px", opacity:uploading?.6:1 }}>
        {uploading ? "Uploading…" : <><Plus size={14}/> Add a file</>}
        <input type="file" onChange={handleFile} disabled={uploading} style={{ display:"none" }}/>
      </label>
      {err && <div style={{ fontSize:11.5, color:"#C42424", marginTop:4 }}>{err}</div>}
    </div>
  );
}

/* ─────────────────────────────  CREATE TASK MODAL  ───────────────────────────── */
function CreateTaskModal({ tasks, onClose, onCreate, owners, bizOwners }) {
  const [f,setF] = useState({
    property:PROPERTIES[0], task:"", type:TASK_TYPES[0],
    businessOwner: bizOwners[0] || "", assignee: owners[0] || "",
    expected:TODAY_ISO, due:plusDays(TODAY_ISO,7), priority:"Medium"
  });
  // Update defaults when owners load
  useEffect(()=>{ if(owners.length && !f.assignee) setF(p=>({...p, assignee:owners[0]})); },[owners]);
  useEffect(()=>{ if(bizOwners.length && !f.businessOwner) setF(p=>({...p, businessOwner:bizOwners[0]})); },[bizOwners]);

  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const valid = f.task.trim() && f.property && f.type && f.businessOwner && f.assignee && f.expected;
  const Lbl = ({ children, opt }) => <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", letterSpacing:.03, display:"block", marginBottom:6 }}>{children}{opt && <span style={{ marginLeft:5, fontWeight:600, color:"#94a59b", textTransform:"none" }}>(optional)</span>}</label>;
  const Sel = ({ k, opts }) => <div style={{ position:"relative" }}><select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }} value={f[k]} onChange={e=>set(k,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select><Caret/></div>;

  return (
    <div className="gx-root gx-fade" style={{ position:"fixed", inset:0, zIndex:80, display:"flex", flexDirection:"column", background:"var(--surface)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 22px", borderBottom:"2px solid var(--line)", flex:"none", background:"#fff" }}>
        <span style={{ width:30,height:30,borderRadius:9,background:"var(--pop)",color:"#fff",display:"grid",placeItems:"center" }}><Plus size={18}/></span>
        <h2 className="gx-disp" style={{ fontSize:17, fontWeight:700, margin:0, flex:1 }}>Create &amp; Assign Task</h2>
        <button className="gx-btn gx-btn-ghost" style={{ border:"1px solid var(--line)" }} onClick={onClose}>Cancel</button>
        <button className="gx-btn gx-btn-dark" disabled={!valid} onClick={()=>onCreate(f)} style={{ opacity:valid?1:.5 }}><Plus size={15}/> Create &amp; assign</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
        <div style={{ maxWidth:500, display:"flex", flexDirection:"column", gap:14 }}>
          <div><Lbl>Property *</Lbl><div style={{ position:"relative" }}><select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30, fontWeight:700, color:PROP_COLOR[f.property] }} value={f.property} onChange={e=>set("property",e.target.value)}>{PROPERTIES.map(o=><option key={o}>{o}</option>)}</select><Caret/></div></div>
          <div><Lbl>Task name *</Lbl><input className="gx-input" autoFocus value={f.task} placeholder="e.g. Monsoon Cashback Emailer" onChange={e=>set("task",e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&valid) onCreate(f); }}/></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Lbl>Task type *</Lbl><Sel k="type" opts={TASK_TYPES}/></div>
            <div><Lbl>Priority *</Lbl><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{PRIORITY_LIST.map(p=>(<button key={p} className="gx-chip" onClick={()=>set("priority",p)} style={{ background:f.priority===p?PRIORITY[p].bg:"transparent", color:f.priority===p?PRIORITY[p].fg:"var(--ink-soft)", border:f.priority===p?"none":"1px solid var(--line)" }}><Flag size={11} fill={PRIORITY[p].dot} color={PRIORITY[p].dot}/>{p}</button>))}</div></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {/* ✅ PRODUCTION: owners from DB */}
            <div><Lbl>Business Owner *</Lbl><Sel k="businessOwner" opts={bizOwners}/></div>
            <div><Lbl>Assigned To *</Lbl><Sel k="assignee" opts={owners}/></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Lbl>Expected Date *</Lbl><input className="gx-input" type="date" value={f.expected} onChange={e=>set("expected",e.target.value)}/></div>
            <div><Lbl opt>Promise Date</Lbl><input className="gx-input" type="date" value={f.due} onChange={e=>set("due",e.target.value)}/></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  ADMIN · PMO  ───────────────────────────── */
function StatusBar({ items }) {
  const total = items.length || 1;
  const segs = PROJECT_STATUS_LIST.map(s=>({ s, n:items.filter(t=>t.projectStatus===s).length })).filter(x=>x.n>0);
  return <div style={{ display:"flex", height:7, borderRadius:99, overflow:"hidden", background:"#EEF4EF" }}>{segs.map(x=><div key={x.s} title={`${x.s}: ${x.n}`} style={{ width:`${x.n/total*100}%`, background:STATUS[x.s].dot }}/>)}</div>;
}

function Admin({ tasks, openDrawer, owners }) {
  const [mode, setMode] = useState("person");
  const [sel, setSel]   = useState(null);
  const [selProp, setSelProp] = useState(null);
  const [q, setQ]       = useState("");
  const [range, setRange] = useState("all");

  const rangeDays = RANGE_OPTS.find(r=>r.k===range)?.days;
  const rFrom = rangeDays ? plusDays(TODAY_ISO, -rangeDays) : "";
  const rTo   = rangeDays ? TODAY_ISO : "";
  const rInRange = (d)=> d ? ((!rFrom||d>=rFrom)&&(!rTo||d<=rTo)) : false;
  const taskInRange = (t)=>{ if(!rFrom&&!rTo) return true; const s=t.requested||t.due, e=t.expected||t.due; if(!s&&!e) return (t.effort||[]).some(x=>rInRange(x.date)); return (!rTo||(s||e)<=rTo)&&(!rFrom||(e||s)>=rFrom); };
  const effInRange  = (eff=[]) => (range==="all" ? eff : eff.filter(e=>rInRange(e.date)));
  const totalEffortR= (eff=[]) => effInRange(eff).reduce((s,e)=>s+(Number(e.hours)||0),0);

  const rangedTasks = useMemo(()=>tasks.filter(taskInRange),[tasks,range]);
  const weekFrom = plusDays(TODAY_ISO,-6);
  const stats = (items)=>({
    total: items.length,
    active: items.filter(t=>STATUS[t.projectStatus]?.group==="active").length,
    hold:   items.filter(t=>STATUS[t.projectStatus]?.group==="hold").length,
    done:   items.filter(t=>t.projectStatus==="Completed").length,
    overdue:items.filter(t=>agingDays(t)>0).length,
    hours:  items.reduce((s,t)=>s+totalEffortR(t.effort),0),
    weekHours: items.reduce((s,t)=>s+(t.effort||[]).filter(e=>e.date>=weekFrom&&e.date<=TODAY_ISO).reduce((a,e)=>a+(Number(e.hours)||0),0),0),
  });

  const propData = PROPERTIES.map(p => {
    const items = rangedTasks.filter(t=>t.property===p);
    const ownerHours = {};
    items.forEach(t=>{ ownerHours[t.owner]=(ownerHours[t.owner]||0)+totalEffortR(t.effort); });
    const topOwners = Object.entries(ownerHours).filter(([,h])=>h>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([o])=>o);
    const typeCount = {};
    items.forEach(t=>{ typeCount[t.type]=(typeCount[t.type]||0)+1; });
    const topTypes = Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t])=>t);
    return { p, items, ...stats(items), topOwners, topTypes };
  });

  const scopedTasks = selProp ? rangedTasks.filter(t=>t.property===selProp) : rangedTasks;
  // ✅ PRODUCTION: members derived from actual DB task owners, not hardcoded
  const members = useMemo(()=>Array.from(new Set(scopedTasks.map(t=>t.owner).filter(Boolean))).sort(),[scopedTasks]);
  const types   = useMemo(()=>Array.from(new Set(scopedTasks.map(t=>t.type).filter(Boolean))).sort(),[scopedTasks]);
  const keyOf   = (t)=> mode==="person"?t.owner : mode==="type"?t.type : t.projectStatus;
  const keys    = mode==="person"?members : mode==="type"?types : PROJECT_STATUS_LIST;
  const groups  = keys.map(key=>({ key, items: scopedTasks.filter(t=>keyOf(t)===key) }))
    .filter(g=> mode!=="status"||g.items.length>0)
    .filter(g=> q===""||g.key.toLowerCase().includes(q.toLowerCase()));
  if (mode!=="status") groups.sort((a,b)=> stats(b.items).hours - stats(a.items).hours);

  const team = stats(scopedTasks);
  const overdueTasks = scopedTasks.filter(t=>agingDays(t)>0).sort((a,b)=>agingDays(b)-agingDays(a));
  // ✅ PRODUCTION: idle check against actual members from DB
  const idle = members.filter(m=>{ const st=stats(scopedTasks.filter(t=>t.owner===m)); return st.active>0 && st.weekHours<1; });
  const selItems = sel ? scopedTasks.filter(t=>keyOf(t)===sel) : [];

  return (
    <div className="gx-fade" style={{ padding:"24px 30px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:14 }}>
        <h1 className="gx-disp" style={{ fontSize:26, fontWeight:700, margin:0 }}>Admin · PMO <span style={{ fontSize:14, fontWeight:600, color:"var(--ink-soft)" }}>(manager view)</span></h1>
        <p style={{ color:"var(--ink-soft)", fontSize:13.5, margin:"4px 0 0" }}>Property scoreboard — click any property to scope the team workload below.</p>
      </div>

      {/* PROPERTY SCOREBOARD */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
        {propData.map(({ p, items, total, hours, weekHours, active, hold, done, overdue, topOwners, topTypes })=>{
          const on = selProp===p;
          return (
            <div key={p} className="gx-card" onClick={()=>setSelProp(on?null:p)}
              style={{ cursor:"pointer", overflow:"hidden", transition:".15s", outline:on?`2px solid ${PROP_COLOR[p]}`:"2px solid transparent", boxShadow:on?`0 12px 28px -10px ${PROP_COLOR[p]}66`:"none", transform:on?"translateY(-2px)":"none" }}>
              <div style={{ height:4, background:PROP_COLOR[p] }}/>
              <div style={{ padding:"12px 14px 13px" }}>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
                  <span className="gx-disp" style={{ fontSize:19, fontWeight:800, color:PROP_COLOR[p] }}>{p}</span>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"var(--ink-soft)" }}>{total} task{total===1?"":"s"}</span>
                </div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, margin:"2px 0 9px" }}>
                  <span className="gx-disp" style={{ fontSize:22, fontWeight:700, color:"#067A8C" }}>{fmtHrs(hours)}</span>
                  <span style={{ fontSize:10.5, color:"var(--ink-soft)" }}>total · {fmtHrs(weekHours)} this week</span>
                </div>
                <StatusBar items={items}/>
                <div style={{ display:"flex", gap:5, marginTop:9, flexWrap:"wrap" }}>
                  {active>0  && <span className="gx-chip" style={{ background:"#E3EEFF", color:"#1A5FD0", fontSize:10.5, padding:"3px 8px" }}>{active} active</span>}
                  {overdue>0 && <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424", fontSize:10.5, padding:"3px 8px" }}>{overdue} late</span>}
                  {hold>0    && <span className="gx-chip" style={{ background:"#FBE0EC", color:"#B01457", fontSize:10.5, padding:"3px 8px" }}>{hold} hold</span>}
                  {done>0    && <span className="gx-chip" style={{ background:"#CDEBD6", color:"#0F6B33", fontSize:10.5, padding:"3px 8px" }}>{done} done</span>}
                  {total===0 && <span style={{ fontSize:11, color:"var(--ink-soft)" }}>no tasks yet</span>}
                </div>
                {total>0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, paddingTop:9, borderTop:"1px solid var(--line-soft)" }}>
                    <div style={{ display:"flex" }}>
                      {topOwners.map((o,i)=>(<div key={o} title={o} style={{ marginLeft:i?-6:0, border:"2px solid var(--surface)", borderRadius:99 }}><Avatar name={o} size={22}/></div>))}
                    </div>
                    <span style={{ fontSize:10.5, color:"var(--ink-soft)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{topTypes.join(" · ")||"—"}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEEDS ATTENTION */}
      {(overdueTasks.length>0 || idle.length>0) && (
        <div className="gx-card" style={{ padding:"14px 16px", marginBottom:16, borderColor:"#F3D2A6", background:"#FFFBF3" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <AlertTriangle size={16} color="#C77700"/><b className="gx-disp" style={{ fontSize:14.5, color:"#8A5300" }}>Needs attention{selProp?` · ${selProp}`:""}</b>
            {idle.length>0 && <span className="gx-chip" style={{ background:"#FFF1D6", color:"#9A5B00" }}>{idle.length} idle this week: {idle.join(", ")}</span>}
          </div>
          <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:2 }}>
            {overdueTasks.length===0 && <span style={{ fontSize:12.5, color:"var(--ink-soft)" }}>No overdue tasks.</span>}
            {overdueTasks.map(t=>(
              <div key={t.id} onClick={()=>openDrawer(t.id,"Update")} style={{ flex:"0 0 250px", background:"var(--surface)", border:"1px solid var(--line)", borderRadius:11, padding:"10px 12px", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                  <span style={{ fontSize:12.5, fontWeight:700, color:"#C42424" }}>{agingDays(t)}d late</span>
                  <StatusChip status={t.projectStatus}/>
                </div>
                <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  <span style={{ color:PROP_COLOR[t.property], fontWeight:700 }}>{t.property}</span> · {t.task}
                </div>
                <div style={{ fontSize:11.5, color:"var(--ink-soft)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.owner} · {t.update?.description||"no note logged"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WORKLOAD TOOLBAR */}
      <div className="gx-card" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:"#EEF4EF", borderRadius:10, padding:3 }}>
          {[["person","By Person"],["type","By Task Type"],["status","By Status"]].map(([k,l])=>(
            <button key={k} className="gx-btn" onClick={()=>{ setMode(k); setSel(null); }} style={{ padding:"7px 13px", fontSize:13, background: mode===k?"var(--surface)":"transparent", color: mode===k?"var(--ink)":"var(--ink-soft)", boxShadow: mode===k?"0 1px 3px rgba(0,0,0,.12)":"none" }}>{l}</button>
          ))}
        </div>
        <div style={{ position:"relative" }}><select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={range} onChange={e=>setRange(e.target.value)}>{RANGE_OPTS.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}</select><Caret/></div>
        <div style={{ position:"relative", flex:"0 0 220px" }}>
          <Search size={15} style={{ position:"absolute", left:11, top:10, color:"#94a59b" }}/>
          <input className="gx-input" style={{ paddingLeft:32 }} placeholder={`Search ${mode==="person"?"person":mode==="type"?"task type":"status"}…`} value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        {selProp && (
          <span className="gx-chip" style={{ background:PROP_COLOR[selProp]+"22", color:PROP_COLOR[selProp], fontWeight:700, fontSize:12, padding:"5px 10px" }}>
            Scoped to {selProp} <X size={12} style={{ cursor:"pointer", marginLeft:4 }} onClick={(e)=>{ e.stopPropagation(); setSelProp(null); }}/>
          </span>
        )}
        <div style={{ marginLeft:"auto", display:"flex", gap:18 }}>
          {[{ k:"Tasks", v:team.total },{ k:"Total hrs", v:fmtHrs(team.hours), c:"#067A8C" },{ k:"This week", v:fmtHrs(team.weekHours), c:team.weekHours>0?"#067A8C":"#C42424" },{ k:"Delayed", v:team.overdue, c:"#C42424" }].map(s=>(
            <div key={s.k} style={{ textAlign:"right" }}>
              <div className="gx-disp" style={{ fontSize:17, fontWeight:700, color:s.c||"var(--ink)" }}>{s.v}</div>
              <div style={{ fontSize:10.5, fontWeight:600, color:"var(--ink-soft)" }}>{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GROUP CARDS */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(290px,1fr))", gap:14, marginBottom:sel?16:0 }}>
        {groups.map(g=>{
          const st = stats(g.items); const on = sel===g.key;
          const propMix = PROPERTIES.map(p=>({ p, n:g.items.filter(t=>t.property===p).length })).filter(x=>x.n>0);
          return (
            <div key={g.key} className="gx-card" onClick={()=>setSel(on?null:g.key)} style={{ padding:16, cursor:"pointer", outline:on?"2px solid var(--pop)":"2px solid transparent", transition:".15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                {mode==="person" ? <Avatar name={g.key} size={36}/> : mode==="type" ? <span style={{ width:36,height:36,borderRadius:10,background:"#EAF1EB",display:"grid",placeItems:"center" }}><FileText size={17}/></span> : <StatusChip status={g.key}/>}
                <div style={{ minWidth:0, flex:1 }}>
                  <div className="gx-disp" style={{ fontSize:15, fontWeight:700 }}>{g.key}</div>
                  <div style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{st.total} task{st.total===1?"":"s"} · {fmtHrs(st.hours)}</div>
                </div>
                {mode==="person" && st.active>0 && st.weekHours<1 && <span className="gx-chip" style={{ background:"#FFF1D6", color:"#9A5B00" }}>⚠ idle</span>}
              </div>
              <StatusBar items={g.items}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
                {[["Active",st.active,"#2D7FF9"],["On hold",st.hold,"#E11D74"],["Done",st.done,"#15803D"],["Overdue",st.overdue,"#F5A623"]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:"center" }}>
                    <div className="gx-disp" style={{ fontSize:18, fontWeight:700, color:v?c:"var(--ink-soft)" }}>{v}</div>
                    <div style={{ fontSize:10, color:"var(--ink-soft)", fontWeight:600 }}>{l}</div>
                  </div>
                ))}
              </div>
              {propMix.length>0 && (
                <div style={{ display:"flex", gap:5, marginTop:10, paddingTop:9, borderTop:"1px solid var(--line-soft)", flexWrap:"wrap" }}>
                  {propMix.map(x=>(<span key={x.p} className="gx-chip" style={{ background:PROP_COLOR[x.p]+"22", color:PROP_COLOR[x.p], fontSize:10.5, padding:"3px 8px", fontWeight:700 }}><span style={{ width:6,height:6,borderRadius:99,background:PROP_COLOR[x.p] }}/>{x.p} · {x.n}</span>))}
                </div>
              )}
              {mode==="person" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, paddingTop:9, borderTop:"1px solid var(--line-soft)" }}>
                  <span style={{ fontSize:11.5, color:"var(--ink-soft)", fontWeight:600 }}>This week</span>
                  <span className="gx-mono" style={{ fontSize:13, fontWeight:700, color:st.weekHours>0?"#067A8C":"#C42424" }}>{fmtHrs(st.weekHours)}</span>
                </div>
              )}
            </div>
          );
        })}
        {groups.length===0 && <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No results.</div>}
      </div>

      {/* DRILL TABLE */}
      {sel && (
        <div className="gx-card gx-fade" style={{ overflow:"hidden", marginTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 16px", borderBottom:"1px solid var(--line)" }}>
            {mode==="person" ? <Avatar name={sel} size={26}/> : mode==="type" ? <span style={{ width:26,height:26,borderRadius:8,background:"#EAF1EB",display:"grid",placeItems:"center" }}><FileText size={14}/></span> : <StatusChip status={sel}/>}
            {mode!=="status" && <b className="gx-disp" style={{ fontSize:15 }}>{sel}</b>}
            <span className="gx-mono" style={{ fontSize:11, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:99 }}>{selItems.length} tasks · {fmtHrs(stats(selItems).hours)}</span>
            <button className="gx-btn gx-btn-ghost" style={{ marginLeft:"auto", padding:6 }} onClick={()=>setSel(null)}><X size={16}/></button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["No.","Property","Task",mode==="person"?"Task Type":"Owner","Project Status","Total Hrs","Aging"].map(h=><th key={h} className="gx-th">{h}</th>)}</tr></thead>
            <tbody>
              {selItems.map(t=>{ const ag=agingDays(t); return (
                <tr key={t.id} className="gx-row" style={{ cursor:"pointer" }} onClick={()=>openDrawer(t.id,"Update")}>
                  <td className="gx-td gx-mono" style={{ color:"var(--ink-soft)" }}>{taskNo(t)}</td>
                  <td className="gx-td"><span style={{ fontSize:11, fontWeight:700, color:PROP_COLOR[t.property], background:PROP_COLOR[t.property]+"22", padding:"3px 9px", borderRadius:7 }}>{t.property}</span></td>
                  <td className="gx-td" style={{ fontWeight:600 }}>{t.task}</td>
                  <td className="gx-td" style={{ fontSize:12.5 }}>{mode==="person" ? <span style={{ fontWeight:600, color:"var(--ink-soft)", background:"#EAF1EB", padding:"3px 9px", borderRadius:7 }}>{t.type}</span> : <span style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar name={t.owner} size={20}/>{t.owner}</span>}</td>
                  <td className="gx-td"><StatusChip status={t.projectStatus}/></td>
                  <td className="gx-td gx-mono" style={{ fontWeight:700, color:"#067A8C" }}>{fmtHrs(totalEffortR(t.effort))}</td>
                  <td className="gx-td">{ag>0 ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={11}/>{ag}d</span> : <span style={{ fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>On time</span>}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────  SHELL / APP  ───────────────────────────── */
const NAV = [
  { k:"dashboard", label:"Dashboard", icon:LayoutDashboard },
  { k:"board",     label:"Work Board", icon:Table2 },
  { k:"admin",     label:"Admin · PMO", icon:Settings },
];

export default function App() {
  const [authed,setAuthed]         = useState(false);
  const [currentUser,setCU]        = useState("");
  const [currentUserObj,setCUObj]  = useState(null);
  const [view,setView]             = useState("board");
  const [tasks,setTasks]           = useState([]);
  const [loading,setLoading]       = useState(true);
  const [openId,setOpenId]         = useState(null);
  const [openTab,setOpenTab]       = useState("Update");
  const [createOpen,setCreateOpen] = useState(false);

  // ✅ PRODUCTION: owners & bizOwners derived live from DB tasks — no hardcoding
  const owners    = useMemo(()=>Array.from(new Set(tasks.map(t=>t.owner).filter(Boolean))).sort(),[tasks]);
  const bizOwners = useMemo(()=>Array.from(new Set(tasks.map(t=>t.businessOwner).filter(Boolean))).sort(),[tasks]);

  /* ── Auth ── */
  useEffect(()=>{
    if (!supabase) { setAuthed(true); setCU("Demo"); setLoading(false); return; }
    supabase.auth.getSession().then(({ data })=>{
      if (data.session) {
        setAuthed(true);
        setCUObj(data.session.user);
        setCU(data.session.user.email?.split("@")[0] || "User");
      } else {
        setLoading(false);
      }
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e, session)=>{
      if (session) {
        setAuthed(true);
        setCUObj(session.user);
        setCU(session.user.email?.split("@")[0] || "User");
      } else {
        setAuthed(false);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  },[]);

  /* ── Fetch tasks ── */
  const fetchTasks = useCallback(async () => {
    if (!supabase) { setTasks([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("tasks")
      .select("*, effort_entries(*), comments(*), audit_log(*), task_files(*)")
      .order("updated_at", { ascending: false });
    if (!error && data) setTasks(data.map(dbToTask));
    setLoading(false);
  }, []);

  useEffect(()=>{ if (authed) fetchTasks(); },[authed, fetchTasks]);

  /* ── Realtime ── */
  useEffect(()=>{
    if (!supabase || !authed) return;
    const ch = supabase.channel("tasks-live")
      .on("postgres_changes",{ event:"*", schema:"public", table:"tasks" }, fetchTasks)
      .on("postgres_changes",{ event:"*", schema:"public", table:"effort_entries" }, fetchTasks)
      .on("postgres_changes",{ event:"*", schema:"public", table:"comments" }, fetchTasks)
      .on("postgres_changes",{ event:"*", schema:"public", table:"task_files" }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(ch);
  },[authed, fetchTasks]);

  /* ── Mutations ── */
  const patch = useCallback(async (id, updates) => {
    setTasks(ts=>ts.map(t=>t.id===id?{...t,...updates,updatedAt:"just now",updatedTs:Date.now()}:t));
    if (!supabase) return;
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
    if (updates.startedAt     !== undefined) dbPatch.started_at     = updates.startedAt ? new Date(updates.startedAt).toISOString() : null;
    if (Object.keys(dbPatch).length) {
      dbPatch.updated_at = new Date().toISOString();
      await supabase.from("tasks").update(dbPatch).eq("id", id);
    }
  }, []);

  const patchUpdate = useCallback(async (id, updates) => {
    setTasks(ts=>ts.map(t=>t.id===id?{...t,update:{...(t.update||{}),...updates},updatedAt:"just now",updatedTs:Date.now()}:t));
    if (!supabase) return;
    if (updates.description !== undefined) await supabase.from("tasks").update({ description: updates.description, updated_at: new Date() }).eq("id", id);
  }, []);

  const addEffort = useCallback(async (id, entry) => {
    setTasks(ts=>ts.map(t=>t.id===id?{...t,effort:[...(t.effort||[]),entry],updatedAt:"just now",updatedTs:Date.now()}:t));
    if (!supabase) return;
    await supabase.from("effort_entries").insert({
      task_id: id, date: entry.date, status: entry.status,
      hours: entry.hours, manual: entry.manual || false,
    });
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, []);

  const removeEffort = useCallback(async (id, idx) => {
    let removedId = null;
    setTasks(ts=>ts.map(t=>{
      if (t.id!==id) return t;
      const entry = (t.effort||[])[idx];
      if (entry?._id) removedId = entry._id;
      return { ...t, effort:(t.effort||[]).filter((_,i)=>i!==idx), updatedAt:"just now", updatedTs:Date.now() };
    }));
    if (!supabase) return;
    if (removedId) await supabase.from("effort_entries").delete().eq("id", removedId);
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, []);

  const addComment = useCallback(async (id, body) => {
    // ✅ PRODUCTION: role comes from actual user, not hardcoded "Team"
    const role = currentUserObj?.user_metadata?.role || "Team";
    const c = { a:currentUser, r:role, t:body, ts:new Date().toLocaleString("en-IN",{ day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) };
    setTasks(ts=>ts.map(t=>t.id===id?{...t,comments:[...(t.comments||[]),c],updatedAt:"just now",updatedTs:Date.now()}:t));
    if (!supabase) return;
    await supabase.from("comments").insert({ task_id:id, author:currentUser, role, body });
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, [currentUser, currentUserObj]);

  const nextId = async () => {
    if (!supabase) return "MKT-"+String(tasks.length+1).padStart(2,"0");
    const { count } = await supabase.from("tasks").select("id", { count:"exact", head:true });
    return "MKT-"+String((count||0)+1).padStart(2,"0");
  };

  const addTask = useCallback(async (f) => {
    const id = await nextId();
    const dbRow = taskToDb(f, id);
    const uiTask = dbToTask({ ...dbRow, business_owner:f.businessOwner, effort_status:"Discussion",
      project_status:"Discussion", lock_state:"unlocked", running:false, started_at:null,
      effort_entries:[], comments:[], audit_log:[], task_files:[],
      description:"", delivered:null, updated_at:new Date().toISOString(), created_at:new Date().toISOString() });
    setTasks(ts=>[uiTask,...ts]);
    setCreateOpen(false); setView("board"); setOpenId(id); setOpenTab("Update");
    if (!supabase) return;
    await supabase.from("tasks").insert(dbRow);
    await supabase.from("audit_log").insert([
      { task_id:id, action:"Created task", by_user:currentUser },
      { task_id:id, action:`Assigned to ${f.assignee||f.owner}`, by_user:currentUser },
    ]);
    fetchTasks();
  }, [tasks, currentUser, fetchTasks]);

  const openTask   = tasks.find(t=>t.id===openId) || null;
  const openDrawer = (id,tab="Update")=>{ setOpenId(id); setOpenTab(tab); };
  const logout     = async ()=>{ if (supabase) await supabase.auth.signOut(); setAuthed(false); setCU(""); };

  if (!authed) return <Login onIn={(name, userObj)=>{ setAuthed(true); if(name) setCU(name); if(userObj) setCUObj(userObj); }}/>;

  if (loading) return (
    <div className="gx-root" style={{ height:"100vh", display:"grid", placeItems:"center" }}>
      <style>{STYLES}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:600, color:"var(--ink-soft)" }}>Loading…</div>
      </div>
    </div>
  );

  return (
    <div className="gx-root" style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{STYLES}</style>
      <header style={{ flex:"none", height:58, borderBottom:"1px solid var(--line)", background:"var(--surface)", display:"flex", alignItems:"center", gap:18, padding:"0 24px" }}>
        <GyftrLogo fs={20}/>
        <span style={{ width:1, height:24, background:"var(--line)", margin:"0 2px" }}/>
        <nav style={{ display:"flex", alignItems:"center", gap:4 }}>{NAV.map(n=>{ const I=n.icon; return (<div key={n.k} className={"gx-navitem"+(view===n.k?" on":"")} onClick={()=>setView(n.k)}><I size={16}/> {n.label}</div>); })}</nav>
        <button className="gx-btn gx-btn-dark" style={{ marginLeft:"auto" }} onClick={()=>setCreateOpen(true)}><Plus size={16}/> Create task</button>
        <span style={{ width:1, height:24, background:"var(--line)" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Avatar name={currentUser} size={30}/>
          {/* ✅ PRODUCTION: name & team from real auth session */}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.1 }}>{currentUser}</div>
            <div style={{ fontSize:10.5, color:"var(--ink-soft)" }}>{currentUserObj?.user_metadata?.team||"Team"} · Manager</div>
          </div>
          <LogOut size={16} style={{ color:"#94a59b", cursor:"pointer", marginLeft:2 }} onClick={logout}/>
        </div>
      </header>

      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--paper)" }}>
        {view==="dashboard" && <Dashboard tasks={tasks} owners={owners} bizOwners={bizOwners} onCreate={()=>setCreateOpen(true)} openDrawer={openDrawer}/>}
        {view==="board"     && <Board tasks={tasks} patch={patch} addEffort={addEffort} openDrawer={openDrawer} owners={owners} bizOwners={bizOwners}/>}
        {view==="admin"     && <Admin tasks={tasks} openDrawer={openDrawer} owners={owners}/>}
      </main>

      {openTask && <Drawer task={openTask} tab={openTab} setTab={setOpenTab} onClose={()=>setOpenId(null)} patch={patch} patchUpdate={patchUpdate} addEffort={addEffort} removeEffort={removeEffort} addComment={addComment} owners={owners} currentUser={currentUser}/>}
      {createOpen && <CreateTaskModal tasks={tasks} onClose={()=>setCreateOpen(false)} onCreate={addTask} owners={owners} bizOwners={bizOwners}/>}
    </div>
  );
}
