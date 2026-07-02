/* ─── components/board/Board.jsx ─── */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Download, Lock, Timer, Clock, Pencil, Play, Square, Flag, Unlock, RefreshCw, EyeOff, Eye } from "lucide-react";
import {
  StatusChip, PriorityChip, ChipMenu, TextCell, DateCell, EffortAddCell, TimerCell, LockCell, Avatar, Caret,
} from "../ui";
import {
  PROPERTIES, PROJECT_STATUS_LIST, EFFORT_STATUS_LIST, OWNERS, BUSINESS_OWNERS,
  PRIORITY_LIST, PRIORITY, STATUS, TASK_TYPES, CURRENT_USER,
} from "../../constants";
import { PROP_COLOR } from "../../constants";
import { totalEffort, fmtHrs, fmtDate, taskNo, agingDays, exportBoardCSV, TODAY_ISO } from "../../utils";

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

function TypeSelect({ value, onChange }) {
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
          {TASK_TYPES.map(tt => (
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

const INACTIVITY_MS = 20 * 60 * 1000; // 20 min
const HB_KEY = (id) => `gyftr_hb_${id}`;

export function Board({ tasks, patch, addEffort, stopTimerAndLog, openDrawer, role, onRefresh }) {
  const isManager = role === "manager";
  const [q,             setQ]             = useState("");
  const [fProp,         setFProp]         = useState("All");
  const [fStatus,       setFStatus]       = useState("All");
  const [fAssignee,     setFAssignee]     = useState("All");
  const [fPri,          setFPri]          = useState("All");
  const [fBizOwner,     setFBizOwner]     = useState("All");
  const [hideCompleted, setHideCompleted] = useState(true);
  const [pauseBanner,   setPauseBanner]   = useState([]); // task names shown in banner

  // paused state: { [taskId]: accumulatedMs }
  const [pausedMap, setPausedMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gyftr_paused_map") || "{}"); }
    catch { return {}; }
  });

  // Keep refs so the visibilitychange handler never closes over stale values
  const tasksRef    = useRef(tasks);
  const patchRef    = useRef(patch);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { patchRef.current = patch;  }, [patch]);

  // Persist pausedMap to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("gyftr_paused_map", JSON.stringify(pausedMap));
  }, [pausedMap]);

  // Heartbeat: stamp localStorage every 60 s for every running timer
  useEffect(() => {
    const write = () =>
      tasks.filter(t => t.running).forEach(t => localStorage.setItem(HB_KEY(t.id), String(Date.now())));
    write();
    const id = setInterval(write, 60_000);
    return () => clearInterval(id);
  }, [tasks]);

  // On visibility restore, freeze any timer whose heartbeat gap > 20 min
  useEffect(() => {
    const checkGaps = () => {
      if (document.hidden) return;
      const now   = Date.now();
      const names = [];
      tasksRef.current.filter(t => t.running).forEach(t => {
        const lastHb = Number(localStorage.getItem(HB_KEY(t.id)) || 0);
        if (!lastHb || (now - lastHb) < INACTIVITY_MS) return;
        const accumulatedMs = Math.max(0, lastHb - (t.startedAt || lastHb));
        // Freeze: stop timer in DB without logging effort
        patchRef.current(t.id, { running: false, startedAt: null });
        localStorage.removeItem(HB_KEY(t.id));
        setPausedMap(prev => ({ ...prev, [t.id]: accumulatedMs }));
        names.push(t.task || "task");
      });
      if (names.length) setPauseBanner(names);
    };
    document.addEventListener("visibilitychange", checkGaps);
    return () => document.removeEventListener("visibilitychange", checkGaps);
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

  const startTimer = (id) => {
    const accMs = pausedMap[id] || 0;
    // Resume from frozen point by back-dating startedAt by accumulated ms
    patch(id, { running: true, startedAt: Date.now() - accMs });
    setPausedMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const stopTimer  = (t,h) => {
    setPausedMap(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    stopTimerAndLog(t, h);
  };
  const cycleLock = (t) => {
    const s    = t.lockState || "locked";
    const next = s==="unlocked" ? "locked" : "unlocked";
    patch(t.id, { lockState: next });
  };

  const handleComplete = (t, s) => {
    const updates = { projectStatus: s };
    if (s === "Completed") {
      if (!t.delivered) updates.delivered = TODAY_ISO;
      if (t.running) stopTimerAndLog(t, (Date.now() - t.startedAt) / 3600000);
      if (pausedMap[t.id]) setPausedMap(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    }
    patch(t.id, updates, `Project Status → ${s}`);
  };

  const pendingRequests = tasks.filter(t => t.lockState==="requested").length;

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Auto-pause banner */}
      {pauseBanner.length > 0 && (
        <div style={{ background:"#FEF3C7", borderBottom:"1px solid #F59E0B", padding:"10px 24px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#92400E" }}>
            ⏸ Timer paused while you were away —{" "}
            <b>{pauseBanner.join(", ")}</b>.{" "}
            Click <b>Resume</b> on the task to continue.
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
          { val:fProp,     set:setFProp,     label:"Property",   opts:PROPERTIES,         prefix:"Property"   },
          { val:fStatus,   set:setFStatus,   label:"Status",     opts:PROJECT_STATUS_LIST, prefix:"Status"     },
          { val:fAssignee, set:setFAssignee, label:"Assigned to",opts:OWNERS,              prefix:"Assigned to"},
          { val:fBizOwner, set:setFBizOwner, label:"Biz Owner",  opts:BUSINESS_OWNERS,    prefix:"Biz Owner"  },
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
                        ? <select className="gx-sel" style={{ fontWeight:700, color:PROP_COLOR[t.property] }} value={t.property} onChange={e=>patch(t.id,{property:e.target.value})}>
                            {PROPERTIES.map(p=><option key={p}>{p}</option>)}
                          </select>
                        : <span style={{ fontWeight:700, color:PROP_COLOR[t.property] }}>{t.property}</span>}
                    </td>

                    {/* Task */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {isManager
                            ? <TextCell value={t.task} bold onCommit={v=>patch(t.id,{task:v})} placeholder="Task name…"/>
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
                        ? <TypeSelect value={t.type} onChange={v => patch(t.id, { type: v })}/>
                        : <span style={{ fontSize:12 }}>{toTypeArr(t.type).join(", ") || "—"}</span>}
                    </td>

                    {/* Assigned To */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <Avatar name={t.owner} size={20}/>
                        {isManager
                          ? <select className="gx-sel" value={t.owner||""} onChange={e=>patch(t.id,{owner:e.target.value})}>
                              {OWNERS.map(o=><option key={o}>{o}</option>)}
                            </select>
                          : <span>{t.owner}</span>}
                      </div>
                    </td>

                    {/* Business Owner */}
                    <td className="gx-td">
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <Avatar name={t.businessOwner} size={20}/>
                        {isManager
                          ? <select className="gx-sel" value={t.businessOwner||""} onChange={e=>patch(t.id,{businessOwner:e.target.value})}>
                              {BUSINESS_OWNERS.map(o=><option key={o}>{o}</option>)}
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
                        ? <DateCell value={t.due} onCommit={v=>patch(t.id,{due:v})}/>
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
                        paused={!!pausedMap[t.id]} pausedMs={pausedMap[t.id] || 0}
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
                        <EffortAddCell onAdd={h=>addEffort(t.id,{ date:TODAY_ISO, status:t.effortStatus, hours:h, manual:true })}/>
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
                        onPick={p=>patch(t.id,{priority:p})}
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
        </div>
      </div>
    </div>
  );
}
