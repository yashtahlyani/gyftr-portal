/* ─── components/drawer/DrawerUpdateTab.jsx ─── */
import React from "react";
import { Plus, X, CalendarDays } from "lucide-react";
import { Caret } from "../ui";
import { OWNERS, EFFORT_STATUS_LIST, PROJECT_STATUS_LIST } from "../../constants";
import { teamOf, fmtDate } from "../../utils";

export function DrawerUpdateTab({ task, patch, patchUpdate, stopTimerAndLog, isManager }) {
  const u = task.update || {};

  const onProjectStatusChange = (s) => {
    if (s === "Completed" && task.running) {
      stopTimerAndLog(task, (Date.now() - task.startedAt) / 3600000);
    }
    patch(task.id, { projectStatus: s });
  };

  const onPickFile = (e) => {
    const list = Array.from(e.target.files||[]).map(f=>({
      n: f.name,
      s: f.size>=1048576 ? `${(f.size/1048576).toFixed(1)} MB` : `${Math.max(1,Math.round(f.size/1024))} KB`,
    }));
    if (list.length) patchUpdate(task.id, { files:[...(u.files||[]),...list] });
    e.target.value = "";
  };
  const removeFile = (i) => patchUpdate(task.id, { files:(u.files||[]).filter((_,k)=>k!==i) });

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Date Raised — read-only */}
      {task.createdAt && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#F4F8F4", borderRadius:8, border:"1px solid var(--line)" }}>
          <CalendarDays size={14} style={{ color:"var(--pop-deep)", flex:"none" }}/>
          <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Date Raised:</span>
          <span style={{ fontSize:12.5, fontWeight:700, color:"var(--ink)" }}>{fmtDate(task.createdAt)}</span>
        </div>
      )}

      {/* Assigned To — manager only */}
      {isManager && (
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Assigned To</label>
          <div style={{ position:"relative" }}>
            <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }}
              value={task.owner||""} onChange={e=>patch(task.id,{ owner:e.target.value })}>
              <option value="">Select…</option>
              {OWNERS.map(o=><option key={o}>{o}</option>)}
            </select><Caret/>
          </div>
          <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>
            Team auto-derives from the assignee's profile · currently <b style={{ color:"var(--ink)" }}>{teamOf(task)||"—"}</b>
          </div>
        </div>
      )}

      {/* Effort Status — everyone can change */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Effort Status</label>
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }}
            value={task.effortStatus||""} onChange={e=>patch(task.id,{ effortStatus:e.target.value })}>
            {EFFORT_STATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
          </select><Caret/>
        </div>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Current phase of the content/creative work.</div>
      </div>

      {/* Project Status — everyone can change; auto-stops timer if Completed */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Project Status</label>
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }}
            value={task.projectStatus||""} onChange={e=>onProjectStatusChange(e.target.value)}>
            {PROJECT_STATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
          </select><Caret/>
        </div>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Overall project delivery status — visible on the board and in reports. Setting to Completed will auto-stop any running timer.</div>
      </div>

      {/* Delivered Date — everyone can fill */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Delivered Date</label>
        <input className="gx-input" type="date" value={task.delivered||""}
          onChange={e=>patch(task.id,{ delivered:e.target.value })}/>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Fill in when the work has actually gone live.</div>
      </div>

      {/* Comment / Description — everyone */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Comment / Description</label>
        <textarea className="gx-input" rows={4} style={{ resize:"vertical", fontFamily:"var(--font-b)" }}
          placeholder="Notes, brief, or reason for any delay…"
          value={u.description||""} onChange={e=>patchUpdate(task.id,{ description:e.target.value })}/>
      </div>

      {/* Files */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Files</label>
        <div className="gx-card" style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>
          {(u.files||[]).length===0 && <div style={{ fontSize:12.5, color:"var(--ink-soft)" }}>No files attached yet.</div>}
          {(u.files||[]).map((f,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", background:"#F4F8F4", borderRadius:8 }}>
              <span style={{ fontSize:13 }}>📎</span>
              <span style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.n}</span>
              <span className="gx-mono" style={{ fontSize:11, color:"var(--ink-soft)" }}>{f.s}</span>
              <X size={13} style={{ cursor:"pointer", color:"#94a59b" }} onClick={()=>removeFile(i)}/>
            </div>
          ))}
          <label className="gx-btn gx-btn-ghost" style={{ border:"1px dashed var(--line)", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", padding:"8px 10px" }}>
            <Plus size={14}/> Add a file
            <input type="file" multiple onChange={onPickFile} style={{ display:"none" }}/>
          </label>
        </div>
      </div>

    </div>
  );
}
