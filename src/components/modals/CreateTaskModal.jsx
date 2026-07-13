/* ─── components/modals/CreateTaskModal.jsx ─── */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, Table2, ChevronDown } from "lucide-react";
import { Avatar, Caret } from "../ui";
import {
  PROPERTIES, CREATIVE_PROPERTIES,
  TASK_TYPES,
  OWNERS, CREATIVE_OWNERS,
  BUSINESS_OWNERS, CREATIVE_BUSINESS_OWNERS,
  PRIORITY_LIST,
  PROP_COLOR, CREATIVE_PROP_COLOR,
} from "../../constants";
import { totalEffort, fmtHrs, fmtDate, dayDiff, plusDays, TODAY_ISO, typeColor } from "../../utils";

function TypeMultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (t) => onChange(sel.includes(t) ? sel.filter(x=>x!==t) : [...sel, t]);
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div
        className="gx-input"
        onClick={() => setOpen(o=>!o)}
        style={{ cursor:"pointer", userSelect:"none", minHeight:38, display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, paddingTop:5, paddingBottom:5 }}
      >
        {sel.length === 0
          ? <span style={{ color:"var(--ink-soft)", fontSize:13 }}>Select task type(s)…</span>
          : sel.map(t => <span key={t} style={{ background:"var(--pop-soft)", color:"var(--pop-deep)", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:600 }}>{t}</span>)}
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, zIndex:300, background:"var(--surface)", border:"1px solid var(--line)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.12)", minWidth:220, maxHeight:260, overflowY:"auto", padding:6 }}>
          {TASK_TYPES.map(tt => (
            <label key={tt} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", cursor:"pointer", borderRadius:6, fontSize:12.5, background:sel.includes(tt)?"var(--pop-soft)":"transparent" }}>
              <input type="checkbox" checked={sel.includes(tt)} onChange={()=>toggle(tt)} style={{ accentColor:"var(--pop-deep)" }}/>
              {tt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateTaskModal({ tasks, onClose, onCreate, userTeam = "Content" }) {
  const isCreative   = userTeam === "Creative";
  const propList     = isCreative ? CREATIVE_PROPERTIES  : PROPERTIES;
  const ownerList    = isCreative ? CREATIVE_OWNERS      : OWNERS;
  const bizOwners    = isCreative ? CREATIVE_BUSINESS_OWNERS : BUSINESS_OWNERS;
  const propColorMap = isCreative ? CREATIVE_PROP_COLOR  : PROP_COLOR;
  /* ── Form state ── */
  const [f, setF] = useState({
    property:      propList[0],
    task:          "",
    type:          [],
    businessOwner: bizOwners[0],
    assignee:      ownerList[0],
    expected:      TODAY_ISO,
    due:           plusDays(TODAY_ISO,7),
    priority:      "Medium",
  });
  const set   = (k,v) => setF(p=>({...p,[k]:v}));
  const valid = f.task.trim() && f.property && f.type.length > 0 && f.businessOwner && f.assignee && f.expected;

  const Lbl = ({ children, opt }) => (
    <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", letterSpacing:.03, display:"block", marginBottom:6 }}>
      {children}{opt && <span style={{ marginLeft:5, fontWeight:600, color:"#94a59b", textTransform:"none", letterSpacing:0 }}>(optional)</span>}
    </label>
  );
  const Sel = ({ k, opts }) => (
    <div style={{ position:"relative" }}>
      <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30 }} value={f[k]} onChange={e=>set(k,e.target.value)}>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select><Caret/>
    </div>
  );

  /* ── Availability panel state ── */
  const AV_DAYS = [{ k:1, l:"Today" },{ k:3, l:"3d" },{ k:7, l:"7d" },{ k:15, l:"15d" },{ k:0, l:"All" }];
  const [avDays,       setAvDays]       = useState(7);
  const [selProps,     setSelProps]     = useState(propList.slice());
  const [propMenuOpen, setPropMenuOpen] = useState(false);
  const [selTypes,     setSelTypes]     = useState(TASK_TYPES.slice());
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const toggleProp = (p)=>setSelProps(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p]);
  const toggleType = (t)=>setSelTypes(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t]);

  const tArr = (t) => Array.isArray(t.type) ? t.type : t.type ? [t.type] : [];
  const avCutoff = avDays ? plusDays(TODAY_ISO,avDays) : null;
  const pool = useMemo(()=>tasks.filter(t=>{
    if (t.projectStatus==="Completed"||t.projectStatus==="Deferred") return false;
    if (!tArr(t).some(ty=>selTypes.includes(ty))) return false;
    if (!selProps.includes(t.property)) return false;
    if (avCutoff) { const d=t.due||t.expected||""; if(!d) return true; if(d>avCutoff) return false; }
    return true;
  }),[tasks,selTypes,selProps,avDays]);

  const activeCols = useMemo(()=>{ const seen=new Set(pool.flatMap(t=>tArr(t))); return TASK_TYPES.filter(t=>seen.has(t)&&selTypes.includes(t)); },[pool,selTypes]);
  const heat = (n)=>{ if(n===0) return { bg:"transparent", fg:"#b0bfb6" }; if(n===1) return { bg:"#E8F5E9", fg:"#2E7D32" }; if(n===2) return { bg:"#C8E6C9", fg:"#1B5E20" }; if(n<=4) return { bg:"#FFF3E0", fg:"#E65100" }; return { bg:"#FFEBEE", fg:"#C62828" }; };
  const sNear = (dues)=>{ if(!dues.length) return ""; const sorted=[...dues].sort(); const d=dayDiff(TODAY_ISO,sorted[0]); if(d<0) return `${Math.abs(d)}d late`; if(d===0) return "today"; return `in ${d}d`; };
  const dueColor = (d)=>{ if(!d) return "#b0bfb6"; const diff=dayDiff(TODAY_ISO,d); if(diff<0) return "#C42424"; if(diff<=1) return "#E65100"; return "#15803D"; };
  const buildRow = (items)=>{ const byType={}; activeCols.forEach(c=>{ byType[c]={ n:0, dues:[] }; }); let totalTasks=0,totalHrs=0,allDues=[]; items.forEach(t=>{ tArr(t).forEach(ty=>{ if(byType[ty]){ byType[ty].n++; if(t.due) byType[ty].dues.push(t.due); } }); totalTasks++; totalHrs+=totalEffort(t.effort); if(t.due) allDues.push(t.due); }); allDues.sort(); return { byType, totalTasks, totalHrs, nearestDue:allDues[0]||"" }; };
  const memberData = ownerList.map(owner=>{ const memberTasks=pool.filter(t=>t.owner===owner); const propRows=selProps.map(prop=>({ prop, ...buildRow(memberTasks.filter(t=>t.property===prop)) })); return { owner, propRows, total:buildRow(memberTasks) }; });
  const grandTotal = buildRow(pool);

  return (
    <div className="gx-root gx-fade" style={{ position:"fixed", inset:0, zIndex:80, display:"flex", flexDirection:"column", background:"var(--surface)" }}>
      <style>{/* no extra styles needed */}</style>

      {/* Header */}
      <div style={{ flex:"none", padding:"18px 24px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", gap:12 }}>
        <h2 className="gx-disp" style={{ fontSize:20, fontWeight:700, margin:0, flex:1 }}>Create new task</h2>
        <button className="gx-btn gx-btn-ghost" style={{ padding:8 }} onClick={onClose}><X size={18}/></button>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* LEFT: form */}
        <div style={{ flex:"0 0 340px", padding:"22px 24px", overflowY:"auto", borderRight:"1px solid var(--line)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div><Lbl>Property *</Lbl><Sel k="property" opts={propList}/></div>
            <div>
              <Lbl>Task name *</Lbl>
              <textarea className="gx-input" rows={3} style={{ resize:"none", fontFamily:"var(--font-b)" }} placeholder="Describe the deliverable clearly…" value={f.task} onChange={e=>set("task",e.target.value)}/>
            </div>
            <div><Lbl>Task type *</Lbl><TypeMultiSelect value={f.type} onChange={v=>set("type",v)}/></div>
            <div><Lbl>Priority</Lbl><Sel k="priority" opts={PRIORITY_LIST}/></div>
            <div><Lbl>Business Owner *</Lbl><Sel k="businessOwner" opts={bizOwners}/></div>
            <div><Lbl>Assigned To *</Lbl><Sel k="assignee" opts={ownerList}/></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><Lbl>Expected Date *</Lbl><input className="gx-input" type="date" value={f.expected} onChange={e=>set("expected",e.target.value)}/></div>
              <div><Lbl opt>Promise Date</Lbl><input className="gx-input" type="date" value={f.due} onChange={e=>set("due",e.target.value)}/></div>
            </div>
            <button className="gx-btn gx-btn-dark" disabled={!valid} style={{ width:"100%", justifyContent:"center", padding:12, opacity:valid?1:.45 }}
              onClick={()=>valid&&onCreate(f)}>
              Create task →
            </button>
          </div>
        </div>

        {/* RIGHT: availability matrix */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#F9FBF9" }}>
          {/* Filter bar */}
          <div style={{ padding:"12px 18px", borderBottom:"1px solid var(--line)", flex:"none", display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
            <Table2 size={15} color="var(--pop-deep)"/>
            <span style={{ fontSize:14, fontWeight:700 }}>Team Availability</span>
            <span style={{ fontSize:12, color:"var(--ink-soft)", marginRight:4 }}>{pool.length} active</span>

            <div style={{ position:"relative" }}>
              <button className="gx-btn gx-btn-ghost" onClick={()=>setPropMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"5px 10px", fontSize:11.5 }}>
                Property: <b>{selProps.length===propList.length?"All":selProps.length}</b><ChevronDown size={12} style={{ marginLeft:3 }}/>
              </button>
              {propMenuOpen && (<>
                <div onClick={()=>setPropMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
                <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:5, padding:9, width:190, boxShadow:"0 14px 40px -10px rgba(0,0,0,.3)" }}>
                  {propList.map(p=>{ const on=selProps.includes(p); return (
                    <div key={p} onClick={()=>toggleProp(p)} style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 4px", borderRadius:5, cursor:"pointer" }}>
                      <span style={{ width:12, height:12, borderRadius:3, background:on?propColorMap[p]:"transparent", border:on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                      <span style={{ fontSize:12, fontWeight:700, color:on?propColorMap[p]:"var(--ink-soft)" }}>{p}</span>
                    </div>
                  );})}
                </div>
              </>)}
            </div>

            <div style={{ position:"relative" }}>
              <button className="gx-btn gx-btn-ghost" onClick={()=>setTypeMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"5px 10px", fontSize:11.5 }}>
                Types: <b>{selTypes.length===TASK_TYPES.length?"All":selTypes.length}</b><ChevronDown size={12} style={{ marginLeft:3 }}/>
              </button>
              {typeMenuOpen && (<>
                <div onClick={()=>setTypeMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
                <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:5, padding:9, width:220, maxHeight:300, overflowY:"auto", boxShadow:"0 14px 40px -10px rgba(0,0,0,.3)" }}>
                  {TASK_TYPES.map(t=>{ const on=selTypes.includes(t); return (
                    <div key={t} onClick={()=>toggleType(t)} style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 4px", borderRadius:5, cursor:"pointer" }}>
                      <span style={{ width:12, height:12, borderRadius:3, background:on?typeColor(t):"transparent", border:on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:on?"var(--ink)":"var(--ink-soft)" }}>{t}</span>
                    </div>
                  );})}
                </div>
              </>)}
            </div>

            <div style={{ display:"flex", background:"#EEF4EF", borderRadius:8, padding:2 }}>
              {AV_DAYS.map(d=>(
                <button key={d.k} className="gx-btn" onClick={()=>setAvDays(d.k)} style={{ padding:"4px 9px", fontSize:11, background:avDays===d.k?"var(--surface)":"transparent", color:avDays===d.k?"var(--ink)":"var(--ink-soft)", boxShadow:avDays===d.k?"0 1px 3px rgba(0,0,0,.1)":"none" }}>{d.l}</button>
              ))}
            </div>

            <div style={{ marginLeft:"auto", display:"flex", gap:14 }}>
              <div style={{ textAlign:"right" }}><div className="gx-disp" style={{ fontSize:15, fontWeight:700 }}>{pool.length}</div><div style={{ fontSize:10, color:"var(--ink-soft)" }}>Tasks</div></div>
              <div style={{ textAlign:"right" }}><div className="gx-disp" style={{ fontSize:15, fontWeight:700, color:"#067A8C" }}>{fmtHrs(grandTotal.totalHrs)}</div><div style={{ fontSize:10, color:"var(--ink-soft)" }}>Effort</div></div>
            </div>
          </div>

          {/* Matrix */}
          <div style={{ flex:1, overflow:"auto", padding:"10px 18px 16px" }}>
            {activeCols.length===0 ? (
              <div style={{ textAlign:"center", padding:40, color:"var(--ink-soft)" }}>No active tasks match the current filters. Team is free!</div>
            ) : (
              <table className="gx-board" style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th className="gx-th" style={{ position:"sticky", left:0, background:"#F9FBF9", zIndex:2, width:130 }}>Member</th>
                    <th className="gx-th" style={{ position:"sticky", left:130, background:"#F9FBF9", zIndex:2, width:80 }}>Property</th>
                    {activeCols.map(c=><th key={c} className="gx-th" style={{ textAlign:"center", fontSize:10.5, minWidth:64 }}>{c}</th>)}
                    <th className="gx-th" style={{ textAlign:"center", minWidth:48, background:"#F4F8F4" }}>Tasks</th>
                    <th className="gx-th" style={{ textAlign:"center", minWidth:48, background:"#EAF7F9" }}>Hrs</th>
                    <th className="gx-th" style={{ textAlign:"center", minWidth:78, background:"#FFF8E1" }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {memberData.map((m,mi)=>{
                    const isSel = m.owner===f.assignee;
                    return (
                      <React.Fragment key={m.owner}>
                        {m.propRows.map((pr,pi)=>{
                          const isPropSel = pr.prop===f.property;
                          return (
                            <tr key={pr.prop} className="gx-row" style={{ background:isSel&&isPropSel?"#E1F5E818":pi%2===0?"transparent":"#FAFCFA" }}>
                              {pi===0 && (
                                <td className="gx-td" rowSpan={selProps.length+1} style={{ position:"sticky", left:0, background:isSel?"#E8F5EC":"#F9FBF9", zIndex:1, verticalAlign:"top", borderRight:"2px solid var(--line)", borderLeft:isSel?"3px solid var(--pop)":"none" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0" }}>
                                    <Avatar name={m.owner} size={26}/>
                                    <div>
                                      <div style={{ fontWeight:isSel?800:600, fontSize:12.5, color:isSel?"var(--pop-deep)":"var(--ink)" }}>{m.owner}</div>
                                      {isSel && <span style={{ marginLeft:0, fontSize:9, color:"var(--pop)", fontWeight:700 }}>▸ assigning</span>}
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td className="gx-td" style={{ position:"sticky", left:130, background:isPropSel?"#F0F6E8":pi%2===0?"#F9FBF9":"#FAFCFA", zIndex:1, borderRight:"1px solid var(--line)" }}>
                                <span style={{ fontWeight:700, fontSize:11.5, color:propColorMap[pr.prop] }}>{pr.prop}</span>
                                {isPropSel && <span style={{ marginLeft:4, fontSize:9, color:"var(--pop)", fontWeight:700 }}>◀</span>}
                              </td>
                              {activeCols.map(c=>{ const cell=pr.byType[c]||{n:0,dues:[]}; const h=heat(cell.n); return (
                                <td key={c} className="gx-td" style={{ textAlign:"center", background:h.bg }} title={cell.n>0?`${cell.n} · ${sNear(cell.dues)}`:""}>
                                  {cell.n>0 ? <span style={{ fontWeight:700, fontSize:12.5, color:h.fg }}>{cell.n}</span> : <span style={{ color:"#d0ddd4" }}>—</span>}
                                </td>
                              );})}
                              <td className="gx-td" style={{ textAlign:"center", background:"#F4F8F4", fontWeight:700, fontSize:12.5 }}>{pr.totalTasks||<span style={{ color:"#d0ddd4" }}>—</span>}</td>
                              <td className="gx-td gx-mono" style={{ textAlign:"center", background:"#EAF7F9", fontWeight:600, fontSize:11.5, color:"#067A8C" }}>{pr.totalHrs>0?fmtHrs(pr.totalHrs):<span style={{ color:"#b0d4dc" }}>—</span>}</td>
                              <td className="gx-td gx-mono" style={{ textAlign:"center", background:"#FFF8E1", fontSize:10.5 }}>
                                {(()=>{ const d=pr.nearestDue; if(!d) return <span style={{ color:"#d0ddd4" }}>—</span>; return <span style={{ fontWeight:700, color:dueColor(d) }}>{fmtDate(d)}<br/><span style={{ fontSize:9, opacity:.75 }}>{sNear([d])}</span></span>; })()}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Member total */}
                        <tr style={{ background:isSel?"#DDE8DE":"#EEF4EF" }}>
                          <td className="gx-td" style={{ position:"sticky", left:130, background:isSel?"#DDE8DE":"#EEF4EF", zIndex:1, borderRight:"1px solid var(--line)" }}>
                            <span style={{ fontWeight:800, fontSize:11, textTransform:"uppercase" }}>Total</span>
                          </td>
                          {activeCols.map(c=>{ const cell=m.total.byType[c]||{n:0}; const h=heat(cell.n); return (
                            <td key={c} className="gx-td" style={{ textAlign:"center", background:cell.n>0?h.bg:isSel?"#DDE8DE":"#EEF4EF", fontWeight:800, fontSize:12.5, color:cell.n>0?h.fg:"#c4cfc7" }}>{cell.n||"—"}</td>
                          );})}
                          <td className="gx-td" style={{ textAlign:"center", background:"#D0E4D1", fontWeight:800, fontSize:13 }}>{m.total.totalTasks}</td>
                          <td className="gx-td gx-mono" style={{ textAlign:"center", background:"#D5EEF3", fontWeight:700, fontSize:12, color:"#067A8C" }}>{fmtHrs(m.total.totalHrs)}</td>
                          <td className="gx-td gx-mono" style={{ textAlign:"center", background:"#FFF0C2", fontWeight:700, fontSize:11, color:dueColor(m.total.nearestDue) }}>{m.total.nearestDue?fmtDate(m.total.nearestDue):"—"}</td>
                        </tr>
                        {mi<memberData.length-1 && <tr><td colSpan={activeCols.length+5} style={{ height:3, background:"var(--line)" }}/></tr>}
                      </React.Fragment>
                    );
                  })}
                  {/* Grand total */}
                  <tr style={{ background:"#1e3a29" }}>
                    <td className="gx-td" colSpan={2} style={{ position:"sticky", left:0, background:"#1e3a29", zIndex:1, fontWeight:800, fontSize:11, color:"#fff", textTransform:"uppercase" }}>Grand Total</td>
                    {activeCols.map(c=>{ const cell=grandTotal.byType[c]||{n:0}; return (
                      <td key={c} className="gx-td" style={{ textAlign:"center", fontWeight:800, fontSize:13, color:"#fff" }}>{cell.n||"—"}</td>
                    );})}
                    <td className="gx-td" style={{ textAlign:"center", fontWeight:800, fontSize:14, color:"#A3E635" }}>{grandTotal.totalTasks}</td>
                    <td className="gx-td gx-mono" style={{ textAlign:"center", fontWeight:700, fontSize:13, color:"#67E8F9" }}>{fmtHrs(grandTotal.totalHrs)}</td>
                    <td className="gx-td gx-mono" style={{ textAlign:"center", fontWeight:700, fontSize:11, color:"#FFF59D" }}>{grandTotal.nearestDue?fmtDate(grandTotal.nearestDue):"—"}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Legend */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 18px", borderTop:"1px solid var(--line)", fontSize:10.5, color:"var(--ink-soft)" }}>
            <span>Load:</span>
            {[{n:1,l:"Light"},{n:2,l:"OK"},{n:3,l:"Busy"},{n:5,l:"Heavy"}].map(x=>{ const h=heat(x.n); return (
              <span key={x.n} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                <span style={{ width:11, height:11, borderRadius:3, background:h.bg, border:"1px solid "+h.fg+"33" }}/>
                <span style={{ fontWeight:600, color:h.fg }}>{x.l}</span>
              </span>
            );})}
            <span style={{ marginLeft:"auto" }}>The <b style={{ color:"var(--pop-deep)" }}>selected assignee</b> and <b>property</b> are highlighted ◀</span>
          </div>
        </div>
      </div>
    </div>
  );
}
