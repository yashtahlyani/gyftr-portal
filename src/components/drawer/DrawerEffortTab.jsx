/* ─── components/drawer/DrawerEffortTab.jsx ─── */
import React, { useState } from "react";
import { Plus, Check, Lock, Unlock, X } from "lucide-react";
import { StatusChip } from "../ui";
import { EFFORT_STATUS_LIST } from "../../constants";
import { totalEffort, fmtHrs, fmtDate, TODAY_ISO } from "../../utils";

export function DrawerEffortTab({ task, patch, addEffort, removeEffort, isManager }) {
  const [eDate,   setEDate]   = useState(TODAY_ISO);
  const [eStatus, setEStatus] = useState(task?.effortStatus || "Discussion");
  const [eHrs,    setEHrs]    = useState("");

  const total = totalEffort(task.effort);
  const lockS = task.lockState || "locked";

  const submitEffort = () => {
    const n = parseFloat(eHrs);
    if (n > 0) { addEffort(task.id, { date:eDate, status:eStatus, hours:n, manual:true }); setEHrs(""); }
  };

  return (
    <div className="gx-fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Total card */}
      <div className="gx-card" style={{ padding:14, background:"#EAF7F9", borderColor:"#BEE6EC" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#067A8C", textTransform:"uppercase", letterSpacing:.03 }}>Total effort</div>
        <div className="gx-disp" style={{ fontSize:28, fontWeight:700, color:"#067A8C", marginTop:4 }}>{fmtHrs(total)}</div>
        <div style={{ fontSize:12, color:"#067A8C" }}>across {(task.effort||[]).length} entries</div>
      </div>

      {/* Lock state strip */}
      <div className="gx-card" style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:9,
        background: lockS==="unlocked"?"#E1F5E8":lockS==="requested"?"#FDE2E2":"#EAF1EB",
        borderColor: lockS==="unlocked"?"#BFE3CB":lockS==="requested"?"#F3C2C2":"var(--line)" }}>
        {lockS==="unlocked" ? <Unlock size={14} color="#15803D"/> : <Lock size={14} color={lockS==="requested"?"#C42424":"#586860"}/>}
        <div style={{ flex:1, fontSize:12.5, fontWeight:600, color: lockS==="unlocked"?"#15803D":lockS==="requested"?"#C42424":"#586860" }}>
          {lockS==="unlocked"  && "Promise date editable — team can change it."}
          {lockS==="locked"    && "Promise date locked — request manager to change it."}
          {lockS==="requested" && "Promise date unlock requested — awaiting manager approval."}
        </div>
        {/* Employee: can only Request unlock when locked */}
        {lockS==="locked"    && !isManager && <button className="gx-btn gx-btn-dark" style={{ padding:"5px 10px", fontSize:11.5 }} onClick={()=>patch(task.id,{ lockState:"requested" })}>Request</button>}
        {/* Manager only: Grant or Lock */}
        {lockS==="requested" && isManager  && <button className="gx-btn" style={{ padding:"5px 10px", fontSize:11.5, background:"#15803D", color:"#fff" }} onClick={()=>patch(task.id,{ lockState:"unlocked" })}><Check size={13}/> Grant</button>}
        {lockS==="unlocked"  && isManager  && <button className="gx-btn gx-btn-ghost" style={{ padding:"5px 10px", fontSize:11.5, border:"1px solid var(--line)" }} onClick={()=>patch(task.id,{ lockState:"locked" })}>Lock</button>}
      </div>

      {/* Effort log */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:8 }}>
          Effort log <span style={{ marginLeft:8, fontWeight:600, color:"#C42424", textTransform:"none", letterSpacing:0 }}>(manual entries shown in red)</span>
        </div>
        {(task.effort||[]).length ? (
          <div className="gx-card" style={{ overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>{["Date","Status","Time","Source",""].map(c=><th key={c} className="gx-th">{c}</th>)}</tr>
              </thead>
              <tbody>
                {[...(task.effort||[])].map((e,i) => {
                  const m = !!e.manual;
                  return (
                    <tr key={i} className="gx-row" style={{ background:m?"#FFF4F4":"transparent" }}>
                      <td className="gx-td gx-mono" style={{ fontSize:12.5, color:m?"#C42424":"inherit" }}>{fmtDate(e.date)}</td>
                      <td className="gx-td"><StatusChip status={e.status}/></td>
                      <td className="gx-td gx-mono" style={{ fontSize:12.5, fontWeight:700, color:m?"#C42424":"#067A8C" }}>{fmtHrs(e.hours)}</td>
                      <td className="gx-td" style={{ fontSize:11.5, fontWeight:700, color:m?"#C42424":"var(--ink-soft)" }}>{m?"Manual":"Timer"}</td>
                      <td className="gx-td" style={{ textAlign:"right", borderRight:"none" }}>
                        {m ? <X size={14} style={{ color:"#C42424", cursor:"pointer" }} onClick={()=>removeEffort(task.id,i)}/> : null}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background:"#F4F8F4" }}>
                  <td className="gx-td" style={{ fontWeight:700, fontSize:12.5 }} colSpan={2}>Total Effort</td>
                  <td className="gx-td gx-mono" style={{ fontWeight:700, fontSize:13.5, color:"#067A8C" }}>{fmtHrs(total)}</td>
                  <td className="gx-td"/><td className="gx-td" style={{ borderRight:"none" }}/>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No effort logged yet.</div>
        )}
      </div>

      {/* Manual add */}
      <div className="gx-card" style={{ padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:10 }}>
          Add effort manually <span style={{ marginLeft:6, color:"#C42424", textTransform:"none" }}>(entries shown in red)</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 130px" }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Date</label>
            <input className="gx-input" type="date" style={{ marginTop:4 }} value={eDate} onChange={e=>setEDate(e.target.value)}/>
          </div>
          <div style={{ flex:"1 1 150px" }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Status</label>
            <select className="gx-input" style={{ marginTop:4, appearance:"none", cursor:"pointer", paddingRight:30 }}
              value={eStatus} onChange={e=>setEStatus(e.target.value)}>
              {EFFORT_STATUS_LIST.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex:"0 0 80px" }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--ink-soft)" }}>Hours</label>
            <input className="gx-input gx-mono" type="number" step="0.25" min="0" placeholder="e.g. 1.5" style={{ marginTop:4 }}
              value={eHrs} onChange={e=>setEHrs(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitEffort()}/>
          </div>
          <button className="gx-btn gx-btn-dark" onClick={submitEffort}><Plus size={15}/> Add</button>
        </div>
      </div>

    </div>
  );
}
