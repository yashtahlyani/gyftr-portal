/* ─── components/admin/Admin.jsx ─── */
import React, { useState, useMemo } from "react";
import { Search, AlertTriangle, Clock, X, FileText } from "lucide-react";
import { Avatar, StatusChip, Caret } from "../ui";
import { PROPERTIES, PROJECT_STATUS_LIST, RANGE_OPTS } from "../../constants";
import { PROP_COLOR } from "../../constants";
import { STATUS } from "../../constants";
import { agingDays, fmtHrs, fmtDate, taskNo, totalEffort, plusDays, TODAY_ISO, dayDiff } from "../../utils";

/* ── Status proportion bar ── */
function StatusBar({ items }) {
  const total = items.length || 1;
  const segs  = PROJECT_STATUS_LIST.map(s=>({ s, n:items.filter(t=>t.projectStatus===s).length })).filter(x=>x.n>0);
  return (
    <div style={{ display:"flex", height:7, borderRadius:99, overflow:"hidden", background:"#EEF4EF" }}>
      {segs.map(x=><div key={x.s} title={`${x.s}: ${x.n}`} style={{ width:`${x.n/total*100}%`, background:STATUS[x.s].dot }}/>)}
    </div>
  );
}

export function Admin({ tasks, openDrawer }) {
  const [mode,    setMode]    = useState("person");
  const [sel,     setSel]     = useState(null);
  const [selProp, setSelProp] = useState(null);
  const [q,       setQ]       = useState("");
  const [range,   setRange]   = useState("all");

  const rangeDays = RANGE_OPTS.find(r=>r.k===range)?.days;
  const rFrom = rangeDays ? plusDays(TODAY_ISO,-rangeDays) : "";
  const rTo   = rangeDays ? TODAY_ISO : "";
  const rInRange     = (d)=> d ? ((!rFrom||d>=rFrom)&&(!rTo||d<=rTo)) : false;
  const taskInRange  = (t)=>{ if(!rFrom&&!rTo) return true; if(t.createdAt&&rInRange(t.createdAt)) return true; const s=t.requested||t.due, e=t.expected||t.due; if(!s&&!e) return (t.effort||[]).some(x=>rInRange(x.date)); return (!rTo||(s||e)<=rTo)&&(!rFrom||(e||s)>=rFrom); };
  const effInRange   = (eff=[]) => (range==="all" ? eff : eff.filter(e=>rInRange(e.date)));
  const totalEffortR = (eff=[]) => effInRange(eff).reduce((s,e)=>s+(Number(e.hours)||0),0);

  const rangedTasks = useMemo(()=>tasks.filter(taskInRange),[tasks,range]);
  const weekFrom    = plusDays(TODAY_ISO,-6);
  const stats = (items)=>({
    total:     items.length,
    active:    items.filter(t=>STATUS[t.projectStatus]?.group==="active").length,
    hold:      items.filter(t=>STATUS[t.projectStatus]?.group==="hold").length,
    done:      items.filter(t=>t.projectStatus==="Completed").length,
    overdue:   items.filter(t=>agingDays(t)>0).length,
    hours:     items.reduce((s,t)=>s+totalEffortR(t.effort),0),
    weekHours: items.reduce((s,t)=>s+(t.effort||[]).filter(e=>e.date>=weekFrom&&e.date<=TODAY_ISO).reduce((a,e)=>a+(Number(e.hours)||0),0),0),
  });

  const propData = PROPERTIES.map(p=>{
    const items = rangedTasks.filter(t=>t.property===p);
    const ownerHours = {};
    items.forEach(t=>{ ownerHours[t.owner]=(ownerHours[t.owner]||0)+totalEffortR(t.effort); });
    const topOwners = Object.entries(ownerHours).filter(([,h])=>h>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([o])=>o);
    const typeCount  = {};
    items.forEach(t=>{ (Array.isArray(t.type)?t.type:t.type?[t.type]:[]).forEach(ty=>{ typeCount[ty]=(typeCount[ty]||0)+1; }); });
    const topTypes   = Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t])=>t);
    return { p, items, ...stats(items), topOwners, topTypes };
  });

  const scopedTasks   = selProp ? rangedTasks.filter(t=>t.property===selProp) : rangedTasks;
  const members       = useMemo(()=>Array.from(new Set(scopedTasks.map(t=>t.owner).filter(Boolean))).sort(),[scopedTasks]);
  const types         = useMemo(()=>Array.from(new Set(scopedTasks.flatMap(t=>Array.isArray(t.type)?t.type:t.type?[t.type]:[]))).sort(),[scopedTasks]);
  const keyOf         = (t)=> mode==="person"?t.owner : t.projectStatus;
  const keys          = mode==="person"?members : PROJECT_STATUS_LIST;
  const groups        = (mode==="type"
    ? types
        .filter(ty=> q===""||ty.toLowerCase().includes(q.toLowerCase()))
        .map(key=>({ key, items:scopedTasks.filter(t=>(Array.isArray(t.type)?t.type:t.type?[t.type]:[]).includes(key)) }))
    : keys
        .map(key=>({ key, items:scopedTasks.filter(t=>keyOf(t)===key) }))
        .filter(g=> mode!=="status"||g.items.length>0)
        .filter(g=> q===""||g.key.toLowerCase().includes(q.toLowerCase()))
  );
  if (mode!=="status") groups.sort((a,b)=>stats(b.items).hours - stats(a.items).hours);

  const team         = stats(scopedTasks);
  const overdueTasks = scopedTasks.filter(t=>agingDays(t)>0).sort((a,b)=>agingDays(b)-agingDays(a));
  const idle         = members.filter(m=>{ const st=stats(scopedTasks.filter(t=>t.owner===m)); return st.active>0 && st.weekHours<1; });
  const selItems     = sel ? (mode==="type" ? scopedTasks.filter(t=>(Array.isArray(t.type)?t.type:t.type?[t.type]:[]).includes(sel)) : scopedTasks.filter(t=>keyOf(t)===sel)) : [];

  return (
    <div className="gx-fade" style={{ padding:"24px 30px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:14 }}>
        <h1 className="gx-disp" style={{ fontSize:26, fontWeight:700, margin:0 }}>Admin · PMO <span style={{ fontSize:14, fontWeight:600, color:"var(--ink-soft)" }}>(manager view)</span></h1>
        <p style={{ color:"var(--ink-soft)", fontSize:13.5, margin:"4px 0 0" }}>Property scoreboard up top — click any property to scope the team workload below to it.</p>
      </div>

      {/* PROPERTY SCOREBOARD */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {propData.map(({ p, items, total, hours, weekHours, active, hold, done, overdue, topOwners, topTypes })=>{
          const on = selProp===p;
          return (
            <div key={p} className="gx-card" onClick={()=>setSelProp(on?null:p)} style={{ cursor:"pointer", overflow:"hidden", transition:".15s", outline:on?`2px solid ${PROP_COLOR[p]}`:"2px solid transparent", boxShadow:on?`0 12px 28px -10px ${PROP_COLOR[p]}66`:"none", transform:on?"translateY(-2px)":"none" }}>
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
                      {topOwners.length ? topOwners.map((o,i)=>(
                        <div key={o} title={o} style={{ marginLeft:i?-6:0, border:"2px solid var(--surface)", borderRadius:99 }}><Avatar name={o} size={22}/></div>
                      )) : <span style={{ fontSize:11, color:"var(--ink-soft)" }}>no owners</span>}
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
      {(overdueTasks.length>0||idle.length>0) && (
        <div className="gx-card" style={{ padding:"14px 16px", marginBottom:16, borderColor:"#F3D2A6", background:"#FFFBF3" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <AlertTriangle size={16} color="#C77700"/>
            <b className="gx-disp" style={{ fontSize:14.5, color:"#8A5300" }}>Needs attention{selProp?` · ${selProp}`:""}</b>
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

      {/* TEAM WORKLOAD TOOLBAR */}
      <div className="gx-card" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:"#EEF4EF", borderRadius:10, padding:3 }}>
          {[["person","By Person"],["type","By Task Type"],["status","By Status"]].map(([k,l])=>(
            <button key={k} className="gx-btn" onClick={()=>{ setMode(k); setSel(null); }} style={{ padding:"7px 13px", fontSize:13, background:mode===k?"var(--surface)":"transparent", color:mode===k?"var(--ink)":"var(--ink-soft)", boxShadow:mode===k?"0 1px 3px rgba(0,0,0,.12)":"none" }}>{l}</button>
          ))}
        </div>
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={range} onChange={e=>setRange(e.target.value)}>
            {RANGE_OPTS.map(r=><option key={r.k} value={r.k}>{r.label}</option>)}
          </select><Caret/>
        </div>
        <div style={{ position:"relative", flex:"0 0 220px" }}>
          <Search size={15} style={{ position:"absolute", left:11, top:10, color:"#94a59b" }}/>
          <input className="gx-input" style={{ paddingLeft:32 }} placeholder={mode==="person"?"Search a person…":mode==="type"?"Search a task type…":"Search a status…"} value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        {selProp && (
          <span className="gx-chip" style={{ background:PROP_COLOR[selProp]+"22", color:PROP_COLOR[selProp], fontWeight:700, fontSize:12, padding:"5px 10px" }}>
            Scoped to {selProp} <X size={12} style={{ cursor:"pointer", marginLeft:4 }} onClick={e=>{ e.stopPropagation(); setSelProp(null); }}/>
          </span>
        )}
        <div style={{ marginLeft:"auto", display:"flex", gap:18 }}>
          {[
            { k:mode==="person"?"People":mode==="type"?"Task types":"Statuses", v:groups.length },
            { k:"Tasks",      v:team.total },
            { k:"Total hrs",  v:fmtHrs(team.hours), c:"#067A8C" },
            { k:"This week",  v:fmtHrs(team.weekHours), c:team.weekHours>0?"#067A8C":"#C42424" },
            { k:"Delayed",    v:team.overdue, c:"#C42424" },
          ].map(s=>(
            <div key={s.k} style={{ textAlign:"right" }}>
              <div className="gx-disp" style={{ fontSize:17, fontWeight:700, color:s.c||"var(--ink)" }}>{s.v}</div>
              <div style={{ fontSize:10.5, fontWeight:600, color:"var(--ink-soft)" }}>{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GROUP CARDS */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14, marginBottom:sel?16:0 }}>
        {groups.map(g=>{
          const st = stats(g.items); const on = sel===g.key;
          if (mode==="status") {
            const ow = Array.from(new Set(g.items.map(t=>t.owner)));
            return (
              <div key={g.key} className="gx-card" onClick={()=>setSel(on?null:g.key)} style={{ padding:16, cursor:"pointer", outline:on?"2px solid var(--pop)":"2px solid transparent", transition:".15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}><StatusChip status={g.key}/><span className="gx-mono" style={{ marginLeft:"auto", fontSize:11, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:99 }}>{st.total}</span></div>
                <div style={{ fontSize:11.5, color:"var(--ink-soft)", marginBottom:8 }}>{fmtHrs(st.hours)} logged · {ow.length} {ow.length===1?"person":"people"}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {g.items.slice(0,4).map(t=>(
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5 }}>
                      <span style={{ width:7, height:7, borderRadius:99, background:PROP_COLOR[t.property], flex:"none" }}/>
                      <Avatar name={t.owner} size={18}/>
                      <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.task}</span>
                      <span className="gx-mono" style={{ color:"#067A8C", fontWeight:600 }}>{fmtHrs(totalEffortR(t.effort))}</span>
                      {agingDays(t)>0 && <span style={{ width:7, height:7, borderRadius:99, background:"#EF4444" }} title={`${agingDays(t)}d late`}/>}
                    </div>
                  ))}
                  {g.items.length>4 && <div style={{ fontSize:11.5, fontWeight:600, color:"var(--pop)" }}>+{g.items.length-4} more →</div>}
                </div>
              </div>
            );
          }
          const low      = st.active>0 && st.weekHours<1;
          const propMix  = PROPERTIES.map(p=>({ p, n:g.items.filter(t=>t.property===p).length })).filter(x=>x.n>0);
          return (
            <div key={g.key} className="gx-card" onClick={()=>setSel(on?null:g.key)} style={{ padding:16, cursor:"pointer", outline:on?"2px solid var(--pop)":"2px solid transparent", transition:".15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                {mode==="person" ? <Avatar name={g.key} size={36}/> : <span style={{ width:36, height:36, borderRadius:10, background:"#EAF1EB", display:"grid", placeItems:"center" }}><FileText size={17}/></span>}
                <div style={{ minWidth:0, flex:1 }}>
                  <div className="gx-disp" style={{ fontSize:15, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.key}</div>
                  <div style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{st.total} task{st.total===1?"":"s"} · {fmtHrs(st.hours)} total</div>
                </div>
                {low && <span className="gx-chip" style={{ background:"#FFF1D6", color:"#9A5B00" }} title="Active tasks but no hours this week">⚠ idle</span>}
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
                  {propMix.map(x=>(
                    <span key={x.p} className="gx-chip" style={{ background:PROP_COLOR[x.p]+"22", color:PROP_COLOR[x.p], fontSize:10.5, padding:"3px 8px", fontWeight:700 }}>
                      <span style={{ width:6, height:6, borderRadius:99, background:PROP_COLOR[x.p] }}/>{x.p} · {x.n}
                    </span>
                  ))}
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
        {groups.length===0 && <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No {mode==="person"?"people":mode==="type"?"task types":"statuses"} match.</div>}
      </div>

      {/* DRILL TABLE */}
      {sel && (
        <div className="gx-card gx-fade" style={{ overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 16px", borderBottom:"1px solid var(--line)" }}>
            {mode==="person" ? <Avatar name={sel} size={26}/> : mode==="type" ? <span style={{ width:26, height:26, borderRadius:8, background:"#EAF1EB", display:"grid", placeItems:"center" }}><FileText size={14}/></span> : <StatusChip status={sel}/>}
            {mode!=="status" && <b className="gx-disp" style={{ fontSize:15 }}>{sel}</b>}
            <span className="gx-mono" style={{ fontSize:11, color:"var(--ink-soft)", background:"#EAF1EB", padding:"2px 8px", borderRadius:99 }}>{selItems.length} tasks · {fmtHrs(stats(selItems).hours)}</span>
            <button className="gx-btn gx-btn-ghost" style={{ marginLeft:"auto", padding:6 }} onClick={()=>setSel(null)}><X size={16}/></button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>{["No.","Property","Task",mode==="person"?"Task Type":"Owner","Project Status","Total Hrs","Aging"].map(h=><th key={h} className="gx-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {selItems.map(t=>{ const ag=agingDays(t); return (
                <tr key={t.id} className="gx-row" style={{ cursor:"pointer" }} onClick={()=>openDrawer(t.id,"Update")}>
                  <td className="gx-td gx-mono" style={{ color:"var(--ink-soft)" }}>{taskNo(t)}</td>
                  <td className="gx-td"><span style={{ fontSize:11, fontWeight:700, color:PROP_COLOR[t.property], background:PROP_COLOR[t.property]+"22", padding:"3px 9px", borderRadius:7 }}>{t.property}</span></td>
                  <td className="gx-td" style={{ fontWeight:600 }}>{t.task}</td>
                  <td className="gx-td" style={{ fontSize:12.5 }}>{mode==="person" ? <span style={{ fontWeight:600, color:"var(--ink-soft)", background:"#EAF1EB", padding:"3px 9px", borderRadius:7 }}>{(Array.isArray(t.type)?t.type:t.type?[t.type]:[]).join(", ")||"—"}</span> : <span style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar name={t.owner} size={20}/>{t.owner}</span>}</td>
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
