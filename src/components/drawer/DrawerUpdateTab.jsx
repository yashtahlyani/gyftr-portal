/* ─── components/drawer/DrawerUpdateTab.jsx ─── */
import React, { useRef, useState } from "react";
import { Plus, X, CalendarDays, Link } from "lucide-react";
import { Caret } from "../ui";
import { OWNERS, CREATIVE_OWNERS, EFFORT_STATUS_LIST, PROJECT_STATUS_LIST } from "../../constants";
import { teamOf, fmtDate, fmtHrs, TODAY_ISO } from "../../utils";

export function DrawerUpdateTab({ task, patch, patchUpdate, stopTimerAndLog, addComment, isManager }) {
  const u = task.update || {};
  const ownerList = task.team === "Creative" ? CREATIVE_OWNERS : OWNERS;
  const descRef = useRef(null);
  const [linkUrl,  setLinkUrl]  = useState("");
  const [linkDesc, setLinkDesc] = useState("");

  const onProjectStatusChange = (s) => {
    if (s === "Completed" && task.running) {
      const runningMs = Date.now() - (task.startedAt || Date.now());
      const ok = window.confirm(
        `The timer for "${task.task}" is still running ` +
        `(${fmtHrs(runningMs / 3600000)} not yet logged).\n\n` +
        `OK — stop the timer, log this time, and mark the task Completed.\n` +
        `Cancel — leave the task unchanged so you can review the timer first.`
      );
      if (!ok) return;
      stopTimerAndLog(task, runningMs / 3600000);
    }
    const updates = { projectStatus: s };
    if (s === "Completed" && !task.delivered) updates.delivered = TODAY_ISO;
    patch(task.id, updates, `Project Status → ${s}`);
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

  const handleDescKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const val   = u.description || "";
      const newVal = val.substring(0, start) + "\t" + val.substring(end);
      patchUpdate(task.id, { description: newVal });
      requestAnimationFrame(() => {
        if (descRef.current) {
          descRef.current.selectionStart = descRef.current.selectionEnd = start + 1;
        }
      });
    }
  };

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const body = linkDesc.trim() ? `🔗 ${linkDesc.trim()}: ${url}` : `🔗 ${url}`;
    addComment(task.id, body, "Link");
    setLinkUrl("");
    setLinkDesc("");
  };

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Date Raised — always visible */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#F4F8F4", borderRadius:8, border:"1px solid var(--line)" }}>
        <CalendarDays size={14} style={{ color:"var(--pop-deep)", flex:"none" }}/>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Date Raised:</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:"var(--ink)" }}>
          {task.createdAt ? fmtDate(task.createdAt) : "—"}
        </span>
        <span className="gx-mono" style={{ fontSize:11, color:"var(--ink-soft)", marginLeft:4 }}>
          #{task.id}
        </span>
      </div>

      {/* Assigned To — manager only */}
      {isManager && (
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Assigned To</label>
          <div style={{ position:"relative" }}>
            <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }}
              value={task.owner||""} onChange={e=>patch(task.id,{ owner:e.target.value },`Reassigned to ${e.target.value}`)}>
              <option value="">Select…</option>
              {ownerList.map(o=><option key={o}>{o}</option>)}
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
            value={task.effortStatus||""} onChange={e=>patch(task.id,{ effortStatus:e.target.value },`Effort Status → ${e.target.value}`)}>
            {EFFORT_STATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
          </select><Caret/>
        </div>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Current phase of the content/creative work.</div>
      </div>

      {/* Project Status — auto-stops timer and sets delivered date when Completed */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Project Status</label>
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }}
            value={task.projectStatus||""} onChange={e=>onProjectStatusChange(e.target.value)}>
            {PROJECT_STATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
          </select><Caret/>
        </div>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>
          Setting to <b>Completed</b> will auto-stop any running timer and record today as the delivered date.
        </div>
      </div>

      {/* Delivered Date — everyone can fill */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>Delivered Date</label>
        <input className="gx-input" type="date" value={task.delivered||""}
          onChange={e=>patch(task.id,{ delivered:e.target.value },`Delivered date → ${e.target.value||"cleared"}`)}/>
        <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:5 }}>Fill in when the work has actually gone live.</div>
      </div>

      {/* Submit Update Link — all users */}
      <div className="gx-card" style={{ padding:14, background:"#F4F8F4", borderColor:"#d4e8d4" }}>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--pop-deep)", display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
          <Link size={13}/> Submit Update Link
        </label>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <input className="gx-input" placeholder="Description (optional) — e.g. Draft doc, Final creative…"
            value={linkDesc} onChange={e=>setLinkDesc(e.target.value)}/>
          <div style={{ display:"flex", gap:8 }}>
            <input className="gx-input" placeholder="Paste URL here — Google Doc, Sheet, Drive link…"
              value={linkUrl} onChange={e=>setLinkUrl(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitLink()} style={{ flex:1 }}/>
            <button className="gx-btn gx-btn-dark" onClick={submitLink} disabled={!linkUrl.trim()}
              style={{ flexShrink:0, opacity:linkUrl.trim()?1:.45 }}>
              <Plus size={14}/> Submit
            </button>
          </div>
        </div>
        <div style={{ fontSize:10.5, color:"var(--ink-soft)", marginTop:6 }}>
          Submitted links appear in the Comments tab — visible to the whole team.
        </div>
      </div>

      {/* Manager's note / brief — only the manager can edit; team reads it and replies via Comments */}
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          Note / Description
          {!isManager && <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:6, background:"#EAF1EB", color:"#586860", textTransform:"none" }}>Manager only</span>}
        </label>
        {isManager ? (
          <textarea
            ref={descRef}
            className="gx-input"
            rows={6}
            style={{ resize:"vertical", fontFamily:"var(--font-m)", whiteSpace:"pre-wrap", fontSize:12.5 }}
            placeholder={"Notes, brief, or reason for any delay…\n\nTip: Tab key inserts a tab for table formatting."}
            value={u.description||""}
            onChange={e=>patchUpdate(task.id,{ description:e.target.value })}
            onKeyDown={handleDescKeyDown}
          />
        ) : (
          <div
            className="gx-input"
            style={{ minHeight:120, fontFamily:"var(--font-m)", whiteSpace:"pre-wrap", fontSize:12.5, background:"#F4F8F4", color:"var(--ink)", overflowY:"auto" }}
          >
            {u.description
              ? u.description
              : <span style={{ color:"var(--ink-soft)", fontStyle:"italic" }}>No note added by the manager yet.</span>}
          </div>
        )}
        <div style={{ fontSize:10.5, color:"var(--ink-soft)", marginTop:4 }}>
          {isManager
            ? "Tip: paste tab-separated content (from Excel/Sheets) — spacing is preserved."
            : "Only the manager can edit this note. Use the Comments tab to respond or submit a link above."}
        </div>
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
