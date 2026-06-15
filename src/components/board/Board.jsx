/* ─── components/board/Board.jsx ─── */
import React, { useState, useMemo } from "react";
import { Search, Download, Lock, Timer, Clock, Pencil, Play, Square, Flag, Unlock } from "lucide-react";
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

export function Board({ tasks, patch, addEffort, openDrawer, role }) {
  const isManager = role === "manager";
  const [q,         setQ]         = useState("");
  const [fProp,     setFProp]     = useState("All");
  const [fStatus,   setFStatus]   = useState("All");
  const [fAssignee, setFAssignee] = useState("All");
  const [fPri,      setFPri]      = useState("All");
  const [fBizOwner, setFBizOwner] = useState("All");

  const rows = useMemo(() =>
    tasks
      .filter(t =>
        (fProp==="All"     || t.property===fProp)
        && (fStatus==="All"  || t.projectStatus===fStatus)
        && (fAssignee==="All"|| t.owner===fAssignee)
        && (fBizOwner==="All"|| t.businessOwner===fBizOwner)
        && (fPri==="All"     || t.priority===fPri)
        && (q===""           || (t.task+t.id+t.type+t.property+(t.owner||"")+(t.businessOwner||"")).toLowerCase().includes(q.toLowerCase()))
      )
      .sort((a,b) => (b.updatedTs||0)-(a.updatedTs||0))
  , [tasks, q, fProp, fStatus, fAssignee, fBizOwner, fPri]);

  const startTimer = (id)  => patch(id, { running:true, startedAt:Date.now() });
  const stopTimer  = (t,h) => {
    addEffort(t.id, { date:TODAY_ISO, status:t.effortStatus, hours:Math.round(h*100)/100 });
    patch(t.id, { running:false, startedAt:null });
  };
  const cycleLock = (t) => {
    const s    = t.lockState || "locked";
    const next = s==="unlocked" ? "locked" : "unlocked";
    patch(t.id, { lockState: next });
  };

  const pendingRequests = tasks.filter(t => t.lockState==="requested").length;

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

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
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:"var(--ink-soft)" }}>{rows.length} of {tasks.length}</span>
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
              {rows.map(t => {
                const ag     = agingDays(t);
                const total  = totalEffort(t.effort);
                const lockS  = t.lockState || "locked";
                const canEditPromise = lockS==="unlocked";
                return (
                  <tr key={t.id} className="gx-row">
                    {/* No. */}
                    <td className="gx-td gx-mono" style={{ fontWeight:600, color:"var(--ink-soft)", textAlign:"center" }}>{taskNo(t)}</td>

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
                        <button className="gx-btn gx-btn-ghost" title="Open update panel"
                          onClick={()=>openDrawer(t.id,"Update")} style={{ padding:"5px 5px", flex:"none" }}>
                          <Pencil size={13}/>
                        </button>
                      </div>
                    </td>

                    {/* Task type */}
                    <td className="gx-td" style={{ position:"relative" }}>
                      {isManager
                        ? <select className="gx-sel" value={t.type} onChange={e=>patch(t.id,{type:e.target.value})}>
                            {TASK_TYPES.map(c=><option key={c}>{c}</option>)}
                          </select>
                        : <span>{t.type}</span>}
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

                    {/* Effort Status — chip menu for manager, plain chip for employee (employee changes via drawer) */}
                    <td className="gx-td">
                      {isManager
                        ? <ChipMenu trigger={<StatusChip status={t.effortStatus}/>} options={EFFORT_STATUS_LIST} value={t.effortStatus}
                            onPick={s=>patch(t.id,{effortStatus:s})}
                            render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>
                        : <ChipMenu trigger={<StatusChip status={t.effortStatus}/>} options={EFFORT_STATUS_LIST} value={t.effortStatus} onPick={s=>patch(t.id,{effortStatus:s})} render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>}
                    </td>

                    {/* Project Status — chip menu for manager, plain chip for employee (employee changes via drawer) */}
                    <td className="gx-td">
                      {isManager
                        ? <ChipMenu trigger={<StatusChip status={t.projectStatus}/>} options={PROJECT_STATUS_LIST} value={t.projectStatus}
                            onPick={s=>patch(t.id,{ projectStatus:s })}
                            render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>
                       : <ChipMenu trigger={<StatusChip status={t.projectStatus}/>} options={PROJECT_STATUS_LIST} value={t.projectStatus} onPick={s=>patch(t.id,{projectStatus:s})} render={s=><><span style={{ width:8,height:8,borderRadius:99,background:STATUS[s].dot }}/>{s}</>}/>}
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

                    {/* Timer */}
                    <td className="gx-td">
                      <TimerCell running={t.running} startedAt={t.startedAt}
                        onStart={()=>startTimer(t.id)} onStop={(h)=>stopTimer(t,h)}/>
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
            </tbody>
          </table>
        </div>

        <div style={{ fontSize:11.5, color:"var(--ink-soft)", marginTop:10, paddingLeft:2 }}>
          Tip: the <b>pencil</b> next to a task name opens its update panel where you can also change <b>effort & project status</b>.
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
