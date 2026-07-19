/* ─── components/board/Board.jsx ─── */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Download, Lock, Timer, Clock, Pencil, Play, Square, Flag, Unlock, RefreshCw, EyeOff, Eye } from "lucide-react";
import {
  StatusChip, PriorityChip, ChipMenu, TextCell, DateCell, EffortAddCell, TimerCell, LockCell, Avatar, Caret,
} from "../ui";
import {
  PROPERTIES, CREATIVE_PROPERTIES,
  PROJECT_STATUS_LIST, EFFORT_STATUS_LIST,
  OWNERS, CREATIVE_OWNERS,
  BUSINESS_OWNERS, CREATIVE_BUSINESS_OWNERS,
  PRIORITY_LIST, PRIORITY, STATUS, TASK_TYPES, CREATIVE_TASK_TYPES, CURRENT_USER,
} from "../../constants";
import { PROP_COLOR, CREATIVE_PROP_COLOR } from "../../constants";
import { totalEffort, fmtHrs, fmtDate, taskNo, agingDays, exportBoardCSV, TODAY_ISO, todayISO } from "../../utils";

const COLS = [
  { k:"no",            label:"No.",            w:36  },
  { k:"raised",        label:"Raised",          w:80  },
  { k:"property",      label:"Property",        w:78  },
  { k:"task",          label:"Task",            w:204 },
  { k:"type",          label:"Task Type",       w:114 },
  { k:"assignee",      label:"Assigned To",     w:122 },
  { k:"bizOwner",      label:"Business Owner",  w:122 },
  { k:"effortStatus",  label:"Effort Status",   w:130 },
  { k:"projectStatus", label:"Project Status",  w:138 },
  { k:"lock",          label:"Lock",            w:46  },
  { k:"promise",       label:"Promised",        w:96  },
  { k:"delivered",     label:"Delivered",       w:96  },
  { k:"timer",         label:"Timer",           w:90  },
  { k:"total",         label:"Total Hrs",       w:130 },
  { k:"aging",         label:"Aging",           w:64  },
  { k:"priority",      label:"Priority",        w:94  },
  { k:"updated",       label:"Updated",         w:64  },
];
const TABLE_W = COLS.reduce((s,c)=>s+c.w,0) + 16;

const toTypeArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

function TypeSelect({ value, onChange, taskTypes }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const sel = toTypeArr(value);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (t) => {
    const next = sel.includes(t) ? sel.filter(x => x !== t) : [...sel, t];
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div
        className="gx-sel"
        onClick={() => setOpen(o => !o)}
        style={{ cursor:"pointer", userSelect:"none", fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:110 }}
        title={sel.join(", ")}
      >
        {sel.length === 0 ? <span style={{ color:"var(--ink-soft)" }}>—</span> : sel.join(", ")}
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, zIndex:300, background:"var(--surface)", border:"1px solid var(--line)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.12)", minWidth:190, maxHeight:260, overflowY:"auto", padding:6 }}>
          {taskTypes.map(tt => (
            <label key={tt} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", cursor:"pointer", borderRadius:6, fontSize:12.5, background:sel.includes(tt)?"var(--pop-soft)":"transparent" }}>
              <input type="checkbox" checked={sel.includes(tt)} onChange={() => toggle(tt)} style={{ accentColor:"var(--pop-deep)" }}/>
              {tt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Test hatch: append ?idletest=<seconds> to the URL to shorten the inactivity
// window (e.g. ?idletest=30 → pause after 30s idle, check every 5s). Only the
// person using that URL is affected; everyone else keeps the normal 20 min.
const IDLE_TEST_SEC = Number(new URLSearchParams(window.location.search).get("idletest"));
const INACTIVITY_MS = IDLE_TEST_SEC > 0 ? IDLE_TEST_SEC * 1000 : 90 * 60 * 1000;
const HB_KEY = (id) => `gyftr_hb_${id}`;

export function Board({ tasks, patch, addEffort, stopTimerAndLog, openDrawer, role, onRefresh, userTeam = "Content" }) {
  const isManager = role === "manager" || role === "super_admin";
  const isCreative   = userTeam === "Creative";
  const propList     = isCreative ? CREATIVE_PROPERTIES   : PROPERTIES;
  const ownerList    = isCreative ? CREATIVE_OWNERS       : OWNERS;
  const bizOwnerList = isCreative ? CREATIVE_BUSINESS_OWNERS : BUSINESS_OWNERS;
  const propColorMap = isCreative ? CREATIVE_PROP_COLOR   : PROP_COLOR;
  const taskTypes    = isCreative ? CREATIVE_TASK_TYPES   : TASK_TYPES;
  const [q,             setQ]             = useState("");
  const [fProp,         setFProp]         = useState("All");
  const [fStatus,       setFStatus]       = useState("All");
  const [fAssignee,     setFAssignee]     = useState("All");
  const [fPri,          setFPri]          = useState("All");
  const [fBizOwner,     setFBizOwner]     = useState("All");
  const [hideCompleted, setHideCompleted] = useState(true);
  const [pauseBanner,   setPauseBanner]   = useState([]); // task names shown in banner

  // Keep refs so handlers never close over stale values
  const tasksRef           = useRef(tasks);
  const patchRef           = useRef(patch);
  const stopTimerAndLogRef = useRef(stopTimerAndLog);
  const lastTickRef        = useRef(Date.now()); // tracks when setInterval last fired
  const lastActivityRef    = useRef(Date.now()); // tracks last user interaction in browser
  useEffect(() => { tasksRef.current = tasks;                     }, [tasks]);
  useEffect(() => { patchRef.current = patch;                     }, [patch]);
  useEffect(() => { stopTimerAndLogRef.current = stopTimerAndLog; }, [stopTimerAndLog]);

  // Update lastActivityRef on any user interaction so we know when they were last active.
  useEffect(() => {
    const touch = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", touch);
    window.addEventListener("keydown",   touch);
    window.addEventListener("click",     touch);
    window.addEventListener("scroll",    touch);
    return () => {
      window.removeEventListener("mousemove", touch);
      window.removeEventListener("keydown",   touch);
      window.removeEventListener("click",     touch);
      window.removeEventListener("scroll",    touch);
    };
  }, []);

  // Auto-stop a running timer and log hours to DB.
  // `activeUntil` is the timestamp up to which the user was actively working
  // (i.e. when the laptop went to sleep, not when it woke up).
  const freezeTimer = (t, activeUntil) => {
    const accumulatedMs = Math.max(0, activeUntil - (t.startedAt || activeUntil));
    const hours = Math.round((accumulatedMs / 3600000) * 100) / 100;
    if (hours >= (1 / 60)) {
      stopTimerAndLogRef.current(t, hours);
    } else {
      patchRef.current(t.id, { running: false, startedAt: null });
    }
    localStorage.removeItem(HB_KEY(t.id));
    return t.task || "task";
  };

  // Heartbeat: stamp localStorage every 60 s for every running timer.
  // Also detects laptop sleep by checking if the interval fired late —
  // a large gap means JS was frozen (system suspend / sleep screen).
  // NOTE: we do NOT track mouse/keyboard activity inside the tab.
  // The timer should only stop when the laptop itself goes to sleep,
  // not just because the user is working in another application.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const gap = now - lastTickRef.current;
      lastTickRef.current = now;

      // Case 1: JS was frozen (laptop slept / tab froze) — gap between ticks is huge.
      if (gap > INACTIVITY_MS) {
        const names = [];
        tasksRef.current.filter(t => t.running).forEach(t => {
          if (!localStorage.getItem(HB_KEY(t.id))) return;
          names.push(freezeTimer(t, now - gap));
        });
        if (names.length) setPauseBanner(names);
      }

      // Case 2: Laptop stayed ON but user hasn't touched the browser in INACTIVITY_MS.
      // Credit time up to when they were last active, not now.
      const idleMs = now - lastActivityRef.current;
      if (idleMs > INACTIVITY_MS) {
        const names = [];
        tasksRef.current.filter(t => t.running).forEach(t => {
          if (!localStorage.getItem(HB_KEY(t.id))) return;
          names.push(freezeTimer(t, lastActivityRef.current));
        });
        if (names.length) setPauseBanner(names);
      }

      // Write heartbeat so the visibility handler can detect gaps too.
      tasksRef.current.filter(t => t.running)
        .forEach(t => localStorage.setItem(HB_KEY(t.id), String(now)));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Safety net: when the tab becomes visible again (or the window regains focus),
  // check if the heartbeat gap exceeded INACTIVITY_MS.  This catches the case
  // where the browser was minimised / another tab was active during the sleep.
  useEffect(() => {
    const checkGaps = () => {
      if (document.hidden) return;
      const now   = Date.now();
      const names = [];
      tasksRef.current.filter(t => t.running).forEach(t => {
        const lastHb = Number(localStorage.getItem(HB_KEY(t.id)) || 0);
        if (!lastHb || (now - lastHb) < INACTIVITY_MS) return;
        names.push(freezeTimer(t, lastHb));
      });
      if (names.length) setPauseBanner(names);
    };
    document.addEventListener("visibilitychange", checkGaps);
    window.addEventListener("focus", checkGaps);
    return () => {
      document.removeEventListener("visibilitychange", checkGaps);
      window.removeEventListener("focus", checkGaps);
    };
  }, []);

  const rows = useMemo(() =>
    tasks
      .filter(t =>
        (fProp==="All"       || t.property===fProp)
        && (fStatus==="All"  || t.projectStatus===fStatus)
        && (fAssignee==="All"|| t.owner===fAssignee)
        && (fBizOwner==="All"|| t.businessOwner===fBizOwner)
        && (fPri==="All"     || t.priority===fPri)
        && (!hideCompleted   || t.projectStatus!=="Completed")
        && (q===""           || (t.task+t.id+toTypeArr(t.type).join(" ")+t.property+(t.owner||"")+(t.businessOwner||"")).toLowerCase().includes(q.toLowerCase()))
      )
      .sort((a,b) => (b.updatedTs||0) - (a.updatedTs||0))
  , [tasks, q, fProp, fStatus, fAssignee, fBizOwner, fPri, hideCompleted]);

  const completedCount = useMemo(() => tasks.filter(t => t.projectStatus === "Completed").length, [tasks]);

  const startTimer = (id) => patch(id, { running: true, startedAt: Date.now() });

  const stopTimer = (t, h) => stopTimerAndLog(t, h);

  const cycleLock = (t) => {
    const s    = t.lockState || "locked";
    const next = s==="unlocked" ? "locked" : "unlocked";
    patch(t.id, { lockState: next }, `Promise date ${next==="locked"?"locked":"unlocked"}`);
  };

  const handleComplete = (t, s) => {
    if (s === "Completed") {
      const runningMs = t.running ? Date.now() - (t.startedAt || Date.now()) : 0;
      if (runningMs > 0) {
        const ok = window.confirm(
          `The timer for "${t.task}" is still running ` +
          `(${fmtHrs(runningMs / 3600000)} not yet logged).\n\n` +
          `OK — stop the timer, log this time, and mark the task Completed.\n` +
          `Cancel — leave the task unchanged so you can review the timer first.`
        );
        if (!ok) return;
        stopTimerAndLog(t, runningMs / 3600000);
      }
      const updates = { projectStatus: s };
      if (!t.delivered) updates.delivered = todayISO();
      patch(t.id, updates, `Project Status → ${s}`);
      return;
    }
    patch(t.id, { projectStatus: s }, `Project Status → ${s}`);
  };

  const pendingRequests = tasks.filter(t => t.lockState==="requested").length;

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Auto-stop banner */}
      {pauseBanner.length > 0 && (
        <div style={{ background:"#FEF3C7", borderBottom:"1px solid #F59E0B", padding:"10px 24px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#92400E" }}>
            ⏹ Timer auto-stopped &amp; hours logged —{" "}
            <b>{pauseBanner.join(", ")}</b>.{" "}
            Click <b>Start</b> on the task to track more time.
          </span>
          <button onClick={() => setPauseBanner([])}
            style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#92400E", fontSize:20, fontWeight:700, lineHeight:1, padding:"0 4px" }}>
            ×
          </button>
        </div>
      )}

      {/* Page title */}
      <div style={{ padding:"18px 24px 10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <h1 className="gx-disp" style={{ fontSize:23, fontWeight:700, margin:0 }}>
            Work Board <span style={{ fontSize:13, fontWeight:600, color:"var(--ink-soft)" }}>· {isManager ? "manager view" : "employee view"}</span>
          </h1>
          {pendingRequests > 0 && (
            <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424", fontWeight:700, fontSize:12 }}>
              <Lock size={12}/> {pendingRequests} promise date unlock{pendingRequests>1?"s":""}
            </span>
          )}
        </div>
        <p style={{ color:"var(--ink-soft)", fontSize:13, margin:"3px 0 0" }}>
          {isManager
            ? "Assign work, track effort with Start/Stop, and grant manual-change permissions. Sorted by most recently updated."
            : "View your assigned tasks, update statuses, track effort with Start/Stop, and request promise date changes."}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"0 24px 12px", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:"0 0 220px" }}>
          <Search size={15} style={{ position:"absolute", left:11, top:10, color:"#94a59b" }}/>
          <input className="gx-input" style={{ paddingLeft:32 }} placeholder="Search task, owner…"
            value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        {[
          { val:fProp,     set:setFProp,     label:"Property",   opts:propList,           prefix:"Property"   },
          { val:fStatus,   set:setFStatus,   label:"Status",     opts:PROJECT_STATUS_LIST, prefix:"Status"     },
          { val:fAssignee, set:setFAssignee, label:"Assigned to",opts:ownerList,           prefix:"Assigned to"},
          { val:fBizOwner, set:setFBizOwner, label:"Biz Owner",  opts:bizOwnerList,       prefix:"Biz Owner"  },
          { val:fPri,      set:setFPri,      label:"Priority",   opts:PRIORITY_LIST,      prefix:"Priority"   },
        ].map(({ val, set, label, opts, prefix }) => (
          <div key={prefix} style={{ position:"relative" }}>
            <select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:136 }}
              value={val} onChange={e=>set(e.target.value)}>
              <option value="All">{prefix}: All</option>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select><Caret/>
          </div>
        ))}

        {/* Hide/Show completed toggle */}
        <button
          className="gx-btn gx-btn-ghost"
          onClick={() => setHideCompleted(h => !h)}
          title={hideCompleted ? "Show completed tasks" : "Hide completed tasks"}
          style={{ border:"1px solid var(--line)", padding:"5px 10px", fontSize:11.5, display:"flex", alignItems:"center", gap:5,
            color: hideCompleted ? "var(--ink-soft)" : "var(--pop-deep)",
            background: hideCompleted ? "transparent" : "var(--pop-soft)" }}>
          {hideCompleted ? <EyeOff size={13}/> : <Eye size={13}/>}
          {hideCompleted ? `Completed (${completedCount})` : "Hide Completed"}
        </button>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:"var(--ink-soft)" }}>{rows.length} of {tasks.length}</span>
          {onRefresh && (
            <button className="gx-btn gx-btn-ghost" onClick={onRefresh} title="Refresh tasks" style={{ padding:"6px 8px" }}>
              <RefreshCw size={14}/>
            </button>
          )}
          <button className="gx-btn gx-btn-dark" onClick={()=>exportBoardCSV(rows)} title="Export current view to CSV">
            <Download size={15}/> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:"auto", padding:"0 24px 24px" }}>
        <div className="gx-card" style={{ overflow:"visible", minWidth:TABLE_W, width:"100%", maxWidth:TABLE_W }}>
          <table className="gx-board" style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
            <colgroup>{COLS.map(c=><col key={c.k} style={{ width:c.w }}/>)}</colgroup>
            <thead><tr>{COLS.map(c=><th key={c.k} className="gx-th">{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((t, rowIdx) => {
                const ag     = agingDays(t);
                const total  = totalEffort(t.effort);
                const lockS  = t.lockState || "locked";
                const canEditPromise = lockS==="unlocked";
                const isCompleted = t.projectStatus === "Completed";
                return (
                  <tr key={t.id} className="gx-row">
                    {/* No. — sequential row number, task ID on hover */}
                    <td className="gx-td gx-mono" title={`Task ID: ${t.id}`} style={{ fontWeight:600, color:"var(--ink-soft)", textAlign:"center" }}>{rowIdx + 1}</td>

                    {/* Raised */}
                    <td className="gx-td gx-mono" style={{ fontSize:11.5, color:"var(--ink-soft)" }}>
                      {t.createdAt ? fmtDate(t.createdAt) : "—"}
                    </td>

                    {/* Property */}
                    <td className="gx-td" style={{ position:"relative" }}>
                      {isManager
                        ? <select className="gx-sel" style={{ fontWeight:700, color:propColorMap[t.property] }} value={t.property} onChange={e=>patch(t.id,{property:e.target.value},`Property → ${e.target.value}`)}>
                            {propList.map(p=><option key={p}>{p}</option>)}
                          </select>
                        : <span style={{ fontWeight:700, color:propColorMap[t.property] }}>{t.property}</span>}
                    </td>

                    {/* Task */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {isManager
                            ? <TextCell value={t.task} bold onCommit={v=>patch(t.id,{task:v},"Edited task name")} placeholder="Task name…"/>
                            : <span style={{ fontWeight:600, color:"var(--ink)" }}>{t.task}</span>}
                        </div>
                        <button className="gx-btn" title="Open update panel"
                          onClick={()=>openDrawer(t.id,"Update")}
                          style={{ padding:"5px 7px", flex:"none", background:"var(--pop-soft)", color:"var(--pop-deep)" }}>
                          <Pencil size={13}/>
                        </button>
                      </div>
                    </td>

                    {/* Task type */}
                    <td className="gx-td" style={{ position:"relative" }}>
                      {isManager
                        ? <TypeSelect value={t.type} onChange={v => patch(t.id, { type: v }, "Edited task type")} taskTypes={taskTypes}/>
                        : <span style={{ fontSize:12 }}>{toTypeArr(t.type).join(", ") || "—"}</span>}
                    </td>

                    {/* Assigned To */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <Avatar name={t.owner} size={20}/>
                        {isManager
                          ? <select className="gx-sel" value={t.owner||""} onChange={e=>patch(t.id,{owner:e.target.value},`Reassigned to ${e.target.value}`)}>
                              {ownerList.map(o=><option key={o}>{o}</option>)}
                            </select>
                          : <span>{t.owner}</span>}
                      </div>
                    </td>

                    {/* Business Owner */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <Avatar name={t.businessOwner} size={20}/>
                        {isManager
                          ? <select className="gx-sel" value={t.businessOwner||""} onChange={e=>patch(t.id,{businessOwner:e.target.value},`Business owner → ${e.target.value}`)}>
                              {bizOwnerList.map(o=><option key={o}>{o}</option>)}
                            </select>
                          : <span>{t.businessOwner}</span>}
                      </div>
                    </td>

                    {/* Effort Status */}
                    <td className="gx-td">
                      <ChipMenu trigger={<StatusChip status={t.effortStatus}/>} options={EFFORT_STATUS_LIST} value={t.effortStatus}
                        onPick={s=>patch(t.id,{effortStatus:s},`Effort Status → ${s}`)}
                        render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>
                    </td>

                    {/* Project Status */}
                    <td className="gx-td">
                      <ChipMenu trigger={<StatusChip status={t.projectStatus}/>} options={PROJECT_STATUS_LIST} value={t.projectStatus}
                        onPick={s => handleComplete(t, s)}
                        render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>
                    </td>

                    {/* Lock */}
                    <td className="gx-td" style={{ textAlign:"center" }}>
                      <LockCell state={lockS} onToggle={isManager ? ()=>cycleLock(t) : undefined}/>
                    </td>

                    {/* Promise date */}
                    <td className="gx-td">
                      {isManager && canEditPromise
                        ? <DateCell value={t.due} onCommit={v=>patch(t.id,{due:v},`Promise date → ${v||"cleared"}`)}/>
                        : <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:t.due?"var(--ink)":"#94a59b" }}>{t.due?fmtDate(t.due):"—"}</span>
                            {lockS==="requested" && <span style={{ fontSize:9.5, fontWeight:700, color:"#C42424" }}>req</span>}
                            {lockS==="locked"    && <Lock size={10} color="#94a59b"/>}
                          </div>}
                    </td>

                    {/* Delivered */}
                    <td className="gx-td">
                      {t.delivered
                        ? <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:"#0F6B33" }}>{fmtDate(t.delivered)}</span>
                        : <span style={{ fontSize:11.5, color:"#94a59b", fontStyle:"italic" }}>—</span>}
                    </td>

                    {/* Timer — disabled on completed tasks */}
                    <td className="gx-td">
                      <TimerCell running={t.running} startedAt={t.startedAt} disabled={isCompleted}
                        onStart={isCompleted ? undefined : ()=>startTimer(t.id)}
                        onStop={(h)=>stopTimer(t,h)}/>
                    </td>

                    {/* Total hours */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button className="gx-btn" onClick={()=>openDrawer(t.id,"Effort")} title="View effort breakdown"
                          style={{ background:"transparent", color:"var(--pop-deep)", fontWeight:700, fontSize:13, display:"inline-flex", alignItems:"center", gap:3, padding:"3px 2px" }}>
                          <Timer size={13}/>{fmtHrs(total)}
                        </button>
                        <EffortAddCell onAdd={h=>addEffort(t.id,{ date:todayISO(), status:t.effortStatus, hours:h, manual:true })}/>
                      </div>
                    </td>

                    {/* Aging */}
                    <td className="gx-td">
                      {ag > 0
                        ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={11}/>{ag}d</span>
                        : <span style={{ fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>On time</span>}
                    </td>

                    {/* Priority */}
                    <td className="gx-td">
                      <ChipMenu trigger={<PriorityChip p={t.priority}/>} options={PRIORITY_LIST} value={t.priority} width={150}
                        onPick={p=>patch(t.id,{priority:p},`Priority → ${p}`)}
                        render={p=><><Flag size={12} fill={PRIORITY[p].dot} color={PRIORITY[p].dot}/>{p}</>}/>
                    </td>

                    {/* Updated */}
                    <td className="gx-td" style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{t.updatedAt}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} style={{ textAlign:"center", padding:"32px 0", color:"var(--ink-soft)", fontSize:13 }}>
                    {hideCompleted && completedCount > 0
                      ? `No active tasks · ${completedCount} completed task${completedCount>1?"s":""} hidden — click "Completed (${completedCount})" above to show`
                      : "No tasks match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize:11.5, color:"var(--ink-soft)", marginTop:10, paddingLeft:2 }}>
          Tip: the <b>pencil</b> next to a task name opens its update panel where you can also change <b>effort &amp; project status</b>.
          The <b>lock</b> column controls whether the <b>promise date</b> can be changed —{" "}
          <span style={{ color:"#15803D", fontWeight:700 }}>green</span> = editable,{" "}
          <span style={{ color:"#586860", fontWeight:700 }}>grey</span> = locked,{" "}
          <span style={{ color:"#C42424", fontWeight:700 }}>red</span> = team has requested an unlock.
          Manual hour entries always appear in <span style={{ color:"#C42424", fontWeight:700 }}>red</span> in the effort breakdown.
          The timer <b>auto-stops if the laptop sleeps for 30+ min</b> and logs the hours automatically — start it again to continue tracking.
        </div>
      </div>
    </div>
  );
}
