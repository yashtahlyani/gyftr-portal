/* ─── components/drawer/Drawer.jsx ─── */
import React from "react";
import { X, Timer, Clock, Trash2 } from "lucide-react";
import { StatusChip, PriorityChip, Avatar } from "../ui";
import { DrawerUpdateTab }   from "./DrawerUpdateTab";
import { DrawerEffortTab }   from "./DrawerEffortTab";
import { DrawerCommentsTab } from "./DrawerCommentsTab";
import { DrawerActivityTab } from "./DrawerActivityTab";
import { totalEffort, fmtHrs, fmtDate, taskNo, teamOf, agingDays } from "../../utils";

const TABS = ["Update","Effort","Comments","Activity"];

export function Drawer({ task, tab, setTab, onClose, patch, patchUpdate, addEffort, removeEffort, stopTimerAndLog, addComment, deleteTask, isManager, role }) {
  if (!task) return null;

  const total      = totalEffort(task.effort);
  const aging      = agingDays(task);
  const isComments = tab === "Comments";

  return (
    <>
      <div className="gx-scrim" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,36,25,.3)", zIndex:60 }}/>
      <div className="gx-drawer gx-root" style={{ position:"fixed", top:0, right:0, height:"100vh", width:540, maxWidth:"96vw", background:"var(--surface)", zIndex:70, boxShadow:"-30px 0 60px -30px rgba(0,0,0,.4)", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span className="gx-mono" style={{ fontSize:12, fontWeight:600, color:"var(--ink-soft)" }}>#{taskNo(task)}</span>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--pop-deep)", background:"var(--pop-soft)", padding:"2px 8px", borderRadius:7 }}>{task.property}</span>
            <span style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:7 }}>{teamOf(task)} · {(Array.isArray(task.type)?task.type:task.type?[task.type]:[]).join(", ")||"—"}</span>
            <PriorityChip p={task.priority}/>
            <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
              {isManager && (
                <button className="gx-btn gx-btn-ghost" style={{ padding:7, color:"#C42424" }}
                  title="Delete task"
                  onClick={() => {
                    if (window.confirm(`Delete task #${taskNo(task)}? This cannot be undone.`)) {
                      onClose();
                      deleteTask(task.id);
                    }
                  }}>
                  <Trash2 size={16}/>
                </button>
              )}
              <button className="gx-btn gx-btn-ghost" style={{ padding:7 }} onClick={onClose}><X size={18}/></button>
            </div>
          </div>
          <h2 className="gx-disp" style={{ fontSize:20, fontWeight:700, margin:"10px 0 10px" }}>{task.task}</h2>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <StatusChip status={task.projectStatus}/>
            <span className="gx-chip" style={{ background:"#EAF7F9", color:"#067A8C" }}><Timer size={12}/>{fmtHrs(total)} logged</span>
            {aging>0 && <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={12}/>{aging}d late</span>}
            {task.owner && <span className="gx-chip" style={{ background:"var(--pop-soft)", color:"var(--pop-deep)" }}><Avatar name={task.owner} size={14}/> Assigned to {task.owner}</span>}
          </div>
          <div className="gx-mono" style={{ fontSize:11.5, color:"var(--ink-soft)", marginTop:9 }}>
            Raised {task.createdAt ? fmtDate(task.createdAt) : "—"} · Expected by business {fmtDate(task.expected||task.requested)} · Promise {fmtDate(task.due)}
            {task.delivered ? <> · <span style={{ color:"#0F6B33", fontWeight:700 }}>Delivered {fmtDate(task.delivered)}</span></> : null}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"0 22px", borderBottom:"1px solid var(--line)", flex:"none" }}>
          {TABS.map(t => (
            <span key={t} className={"gx-tab"+(tab===t?" on":"")} onClick={()=>setTab(t)}>{t}</span>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:"auto", padding:isComments?"0":"20px 22px", display:"flex", flexDirection:"column" }}>
          {tab==="Update" && (
            <div style={{ padding:"20px 22px" }}>
              <DrawerUpdateTab task={task} patch={patch} patchUpdate={patchUpdate} stopTimerAndLog={stopTimerAndLog} isManager={isManager}/>
            </div>
          )}
          {tab==="Effort" && (
            <div style={{ padding:"20px 22px" }}>
              <DrawerEffortTab task={task} patch={patch} addEffort={addEffort} removeEffort={removeEffort} isManager={isManager}/>
            </div>
          )}
          {tab==="Comments" && (
            <DrawerCommentsTab task={task} addComment={addComment} role={role}/>
          )}
          {tab==="Activity" && (
            <div style={{ padding:"20px 22px" }}>
              <DrawerActivityTab task={task}/>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
