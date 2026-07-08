/* ─── components/dashboard/Dashboard.jsx ─── */
import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { Plus, ChevronDown, Clock, CalendarDays, X } from "lucide-react";
import { Avatar, StatusChip } from "../ui";
import { PROPERTIES, STATUS_LIST, TASK_TYPES, PROJECT_STATUS_LIST, STATUS, PROP_COLOR } from "../../constants";
import { typeColor, fmtDate, fmtHrs, agingDays, totalEffort, taskNo, TODAY_ISO } from "../../utils";

/* ── Helpers ── */
const fmtH = (h) => {
  const n = Number(h) || 0;
  if (n === 0) return "0h";
  const hrs  = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};
const yTickH = (v) => `${v}h`;

// Effort of tasks without a task type goes into this bucket
const UNTYPED = "General";
const UNTYPED_COLOR = "#94a59b";
const typeColorSafe = (t) => t === UNTYPED ? UNTYPED_COLOR : typeColor(t);

/* ── Task-type legend item ── */
function TypeLegend({ types, sel, onToggle, onAll }) {
  return (
    <div style={{ flex:"0 0 190px", borderLeft:"1px solid var(--line)", paddingLeft:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:800, color:"var(--ink-soft)", textTransform:"uppercase", letterSpacing:.05 }}>Task Types</span>
        <span style={{ fontSize:10.5, fontWeight:700, color:"var(--pop)", cursor:"pointer" }}
          onClick={onAll}>{sel.length===types.length?"Clear":"All"}</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:280, overflowY:"auto" }}>
        {types.map(t => {
          const on = sel.includes(t);
          return (
            <div key={t} onClick={()=>onToggle(t)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"3px 5px", borderRadius:6, cursor:"pointer", background:on?"#F1F6F1":"transparent" }}>
              <span style={{ width:11, height:11, borderRadius:3, flex:"none",
                background:on?typeColorSafe(t):"transparent",
                border:on?"none":"1.5px solid #c4cfc7" }}/>
              <span style={{ fontSize:11.5, fontWeight:600, color:on?"var(--ink)":"var(--ink-soft)",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ tasks, onCreate, openDrawer, canCreate }) {
  const [drill,          setDrill]          = useState(null);
  const [selProps,       setSelProps]       = useState(PROPERTIES.slice());
  const [selTypes,       setSelTypes]       = useState(TASK_TYPES.slice());
  const [chartTypes,     setChartTypes]     = useState([...TASK_TYPES, UNTYPED]);
  const [propMenuOpen,   setPropMenuOpen]   = useState(false);
  const [typeMenuOpen,   setTypeMenuOpen]   = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [dateFrom,       setDateFrom]       = useState(""); // default: all time
  const [dateTo,         setDateTo]         = useState(""); // default: all time
  const [fStatus,        setFStatus]        = useState(STATUS_LIST.slice());
  const [fOwner,         setFOwner]         = useState("All");

  const from = dateFrom;
  const to   = dateTo;

  const owners    = useMemo(()=>Array.from(new Set(tasks.map(t=>t.owner).filter(Boolean))),[tasks]);
  const hasFilter = !!(dateFrom||dateTo)||fStatus.length!==STATUS_LIST.length||fOwner!=="All"||selProps.length!==PROPERTIES.length||selTypes.length!==TASK_TYPES.length;

  const clearAll = () => {
    setDateFrom(""); setDateTo("");
    setFStatus(STATUS_LIST.slice()); setFOwner("All");
    setSelProps(PROPERTIES.slice()); setSelTypes(TASK_TYPES.slice());
    setChartTypes([...TASK_TYPES, UNTYPED]); setDrill(null);
  };
  const setToday = () => { setDateFrom(TODAY_ISO); setDateTo(TODAY_ISO); };

  // True if effort entry date falls within the selected range
  const inRange   = (d) => d ? ((!from || d >= from) && (!to || d <= to)) : false;

  // Return effort entries for a task filtered to the selected date range.
  // Used for charts and effort totals — always date-aware.
  const effEntries = (t) => (from || to)
    ? (t.effort || []).filter(e => inRange(e.date))
    : (t.effort || []);

  const effTotal = (t) => effEntries(t).reduce((a,e) => a + (Number(e.hours) || 0), 0);

  const tArr = (t) => Array.isArray(t.type) ? t.type : t.type ? [t.type] : [];
  const allProps = selProps.length === PROPERTIES.length;
  const allTypes = selTypes.length === TASK_TYPES.length;

  // KPI cards + drill table: filter by property / status / type / owner only.
  // Date filter applies to EFFORT totals and charts — not to which tasks appear.
  const filtered = useMemo(() => tasks.filter(t =>
    (allProps || selProps.includes(t.property)) &&
    (allTypes || tArr(t).some(ty => selTypes.includes(ty)) || tArr(t).length === 0) &&
    fStatus.includes(t.projectStatus) &&
    (fOwner === "All" || t.owner === fOwner)
  ), [tasks, selProps, selTypes, fStatus, fOwner]);

  const isActive  = (t) => STATUS[t.projectStatus]?.group === "active";
  const isHold    = (t) => STATUS[t.projectStatus]?.group === "hold";
  const isDone    = (t) => t.projectStatus === "Completed";
  const isOverdue = (t) => agingDays(t) > 0;
  const totalAll  = filtered.reduce((s,t) => s + effTotal(t), 0);

  const cards = [
    { k:"total",   label:"Total Tasks",  value:filtered.length,                   sub:"click to see all",       rows:()=>filtered },
    { k:"active",  label:"In Progress",  value:filtered.filter(isActive).length,  c:"#2D7FF9", sub:"active stages",    rows:()=>filtered.filter(isActive)  },
    { k:"hold",    label:"On Hold",      value:filtered.filter(isHold).length,    c:"#E11D74", sub:"hold / deferred",  rows:()=>filtered.filter(isHold)    },
    { k:"done",    label:"Completed",    value:filtered.filter(isDone).length,    c:"#15803D", sub:"closed out",       rows:()=>filtered.filter(isDone)    },
    { k:"overdue", label:"Overdue",      value:filtered.filter(isOverdue).length, c:"#F5A623", sub:"past due",         rows:()=>filtered.filter(isOverdue) },
    { k:"effort",  label:"Total Effort", value:fmtH(totalAll),                   c:"#067A8C", sub:"hours · click for split", rows:()=>[...filtered].sort((a,b)=>effTotal(b)-effTotal(a)) },
  ];
  const active    = cards.find(c => c.k === drill);
  const drillRows = active ? active.rows() : [];

  /* ── Status pie ── */
  const statusData = PROJECT_STATUS_LIST
    .map(s => ({ name:s, value:filtered.filter(t=>t.projectStatus===s).length, fill:STATUS[s].dot }))
    .filter(d => d.value > 0);

  /* ── Overdue by property bar ── */
  const overdueByProp = PROPERTIES
    .filter(p => selProps.includes(p))
    .map(p => ({ name:p, count:filtered.filter(t=>t.property===p&&agingDays(t)>0).length, fill:PROP_COLOR[p] }))
    .filter(d => d.count > 0);

  /* ── Chart data builder ──
     Hours are attributed to the task's first matching type.
     Tasks with no type assigned go into the UNTYPED ("General") bucket so
     their hours are NEVER silently dropped from the charts.                  */
  const buildChartData = (keyFn) => {
    const map = {};
    filtered.forEach(t => {
      const taskTypes = tArr(t).filter(ty => chartTypes.includes(ty));
      let bucket;
      if (tArr(t).length === 0) {
        // Task has no type at all → General bucket (always visible)
        bucket = UNTYPED;
      } else if (taskTypes.length > 0) {
        // Task has types and at least one matches the chart filter
        bucket = taskTypes[0];
      } else {
        // Task has types but all are filtered out by the user → skip
        return;
      }
      const key = keyFn(t);
      if (!key) return;
      if (!map[key]) map[key] = { _key: key };
      map[key][bucket] = (map[key][bucket] || 0) + effTotal(t);
    });
    return map;
  };

  /* Hours per DATE */
  const dateMap  = buildChartData(t => {
    // Need per-entry attribution, not per-task total
    return null; // handled separately below
  });
  // Re-build date chart with per-entry granularity
  const dateMapReal = {};
  filtered.forEach(t => {
    const taskTypes = tArr(t).filter(ty => chartTypes.includes(ty));
    let bucket;
    if (tArr(t).length === 0)        bucket = UNTYPED;
    else if (taskTypes.length > 0)   bucket = taskTypes[0];
    else                             return;
    effEntries(t).forEach(e => {
      if (!dateMapReal[e.date]) dateMapReal[e.date] = { date: e.date };
      dateMapReal[e.date][bucket] = (dateMapReal[e.date][bucket] || 0) + (Number(e.hours) || 0);
    });
  });
  const dateData = Object.values(dateMapReal)
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, name: fmtDate(d.date) }));

  // All type buckets that actually appear in date chart data
  const allChartBuckets = [...TASK_TYPES, UNTYPED];
  const typesInDateData = allChartBuckets.filter(t =>
    chartTypes.includes(t) && dateData.some(d => (d[t] || 0) > 0)
  );

  /* Hours per PROPERTY */
  const propMapReal = {};
  filtered.forEach(t => {
    const taskTypes = tArr(t).filter(ty => chartTypes.includes(ty));
    let bucket;
    if (tArr(t).length === 0)        bucket = UNTYPED;
    else if (taskTypes.length > 0)   bucket = taskTypes[0];
    else                             return;
    const p = t.property;
    if (!p) return;
    if (!propMapReal[p]) propMapReal[p] = { name: p };
    effEntries(t).forEach(e => {
      propMapReal[p][bucket] = (propMapReal[p][bucket] || 0) + (Number(e.hours) || 0);
    });
  });
  const propHoursData    = PROPERTIES.filter(p => selProps.includes(p) && propMapReal[p]).map(p => propMapReal[p]);
  const typesInPropHours = allChartBuckets.filter(t =>
    chartTypes.includes(t) && propHoursData.some(d => (d[t] || 0) > 0)
  );

  // All buckets visible in the legend (types that appear in filtered tasks)
  const legendTypes = [
    ...TASK_TYPES.filter(t => filtered.some(task => tArr(task).includes(t))),
    ...(filtered.some(t => tArr(t).length === 0) ? [UNTYPED] : []),
  ];

  const toggleType  = (t) => setSelTypes(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t]);
  const toggleChart = (t) => setChartTypes(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t]);
  const toggleProp  = (p) => setSelProps(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p]);
  const toggleStat  = (s) => setFStatus(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s]);

  /* ── Custom tooltip for hour charts ── */
  const HourTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s,p) => s + (p.value || 0), 0);
    return (
      <div style={{ background:"#fff", border:"1px solid var(--line)", borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 8px 24px -8px rgba(0,0,0,.2)" }}>
        <div style={{ fontWeight:700, marginBottom:6 }}>{label}</div>
        {payload.filter(p => p.value > 0).reverse().map(p => (
          <div key={p.dataKey} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
            <span style={{ width:10, height:10, borderRadius:3, background:p.fill, flex:"none" }}/>
            <span style={{ color:"var(--ink-soft)" }}>{p.dataKey}:</span>
            <span style={{ fontWeight:700 }}>{fmtH(p.value)}</span>
          </div>
        ))}
        {payload.length > 1 && <div style={{ borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6, fontWeight:700 }}>Total: {fmtH(total)}</div>}
      </div>
    );
  };

  const PropTick = ({ x, y, payload }) => (
    <text x={x} y={y+14} textAnchor="middle" fontSize={13} fontWeight={800} fill={PROP_COLOR[payload.value]||"#586860"}>{payload.value}</text>
  );

  const dateLabel = !from && !to ? "All time"
    : from === to                ? `${fmtDate(from)}`
    : from && to                 ? `${fmtDate(from)} → ${fmtDate(to)}`
    : from                       ? `From ${fmtDate(from)}`
    :                              `Until ${fmtDate(to)}`;

  return (
    <div className="gx-fade" style={{ padding:"24px 30px", overflowY:"auto", height:"100%" }}>

      {/* Title */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 className="gx-disp" style={{ fontSize:26, fontWeight:700, margin:0 }}>Dashboard &amp; Reporting</h1>
          <p style={{ color:"var(--ink-soft)", fontSize:13.5, margin:"4px 0 0" }}>
            Showing: <b style={{ color:"var(--pop-deep)" }}>{dateLabel}</b>
            {from === TODAY_ISO && to === TODAY_ISO && <span style={{ marginLeft:8, fontSize:12, background:"#CDEBD6", color:"#0F6B33", padding:"2px 8px", borderRadius:6, fontWeight:700 }}>Today · CEO view</span>}
          </p>
        </div>
        {canCreate && <button className="gx-btn gx-btn-dark" onClick={onCreate}><Plus size={16}/> Create task</button>}
      </div>

      {/* Filter bar */}
      <div className="gx-card" style={{ padding:"12px 14px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>

        {/* ── Date pickers ── */}
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"#F4F8F4", border:"1px solid var(--line)", borderRadius:9, padding:"6px 10px" }}>
          <CalendarDays size={14} style={{ color:"var(--pop-deep)", flexShrink:0 }}/>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="From date"
            style={{ border:"none", background:"transparent", fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", outline:"none", minWidth:120 }}
          />
          <span style={{ fontSize:12, color:"var(--ink-soft)", fontWeight:600 }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="To date"
            style={{ border:"none", background:"transparent", fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", outline:"none", minWidth:120 }}
          />
          {(dateFrom || dateTo) && (
            <span title="Clear dates" onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{ cursor:"pointer", color:"#94a59b", display:"flex", alignItems:"center" }}>
              <X size={13}/>
            </span>
          )}
        </div>

        {/* Quick: Today */}
        <button className="gx-btn gx-btn-ghost"
          onClick={setToday}
          style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5, fontWeight:700,
            background: (dateFrom===TODAY_ISO&&dateTo===TODAY_ISO) ? "var(--pop-soft)" : "transparent",
            color:      (dateFrom===TODAY_ISO&&dateTo===TODAY_ISO) ? "var(--pop-deep)" : "var(--ink-soft)" }}>
          Today
        </button>

        {/* Property filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setPropMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Property: <b style={{ marginLeft:3 }}>{selProps.length===PROPERTIES.length?"All":selProps.length===0?"None":selProps.length===1?selProps[0]:`${selProps.length} of ${PROPERTIES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {propMenuOpen && (<>
            <div onClick={()=>setPropMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:220, maxHeight:340, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Property</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setSelProps(selProps.length===PROPERTIES.length?[]:PROPERTIES.slice())}>{selProps.length===PROPERTIES.length?"Clear":"All"}</span>
              </div>
              {PROPERTIES.map(p=>{ const on=selProps.includes(p); return (
                <div key={p} onClick={()=>toggleProp(p)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:12, height:12, borderRadius:3, background:on?PROP_COLOR[p]:"transparent", border:on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:on?PROP_COLOR[p]:"var(--ink-soft)" }}>{p}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Task type filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setTypeMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Task types: <b style={{ marginLeft:3 }}>{selTypes.length===TASK_TYPES.length?"All":`${selTypes.length} of ${TASK_TYPES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {typeMenuOpen && (<>
            <div onClick={()=>setTypeMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:230, maxHeight:340, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Task type</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setSelTypes(selTypes.length===TASK_TYPES.length?[]:TASK_TYPES.slice())}>{selTypes.length===TASK_TYPES.length?"Clear":"All"}</span>
              </div>
              {TASK_TYPES.map(t=>{ const on=selTypes.includes(t); return (
                <div key={t} onClick={()=>toggleType(t)} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:11, height:11, borderRadius:3, background:on?typeColor(t):"transparent", border:on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color:on?"var(--ink)":"var(--ink-soft)" }}>{t}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Status filter */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={()=>setStatusMenuOpen(o=>!o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Status: <b style={{ marginLeft:3 }}>{fStatus.length===STATUS_LIST.length?"All":`${fStatus.length} of ${STATUS_LIST.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {statusMenuOpen && (<>
            <div onClick={()=>setStatusMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:220, boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Status</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={()=>setFStatus(fStatus.length===STATUS_LIST.length?[]:STATUS_LIST.slice())}>{fStatus.length===STATUS_LIST.length?"Clear":"All"}</span>
              </div>
              {STATUS_LIST.map(s=>{ const on=fStatus.includes(s); return (
                <div key={s} onClick={()=>toggleStat(s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:11, height:11, borderRadius:3, background:on?STATUS[s].dot:"transparent", border:on?"none":"1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color:on?"var(--ink)":"var(--ink-soft)" }}>{s}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Owner */}
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={fOwner} onChange={e=>setFOwner(e.target.value)}>
            <option value="All">Owner: All</option>
            {owners.map(o=><option key={o}>{o}</option>)}
          </select>
          <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:10, color:"var(--ink-soft)" }}>▼</span>
        </div>

        {hasFilter && <button className="gx-btn gx-btn-ghost" onClick={clearAll} style={{ fontSize:12, color:"#C42424", border:"1px solid #F3C2C2" }}>Clear all</button>}
      </div>

      {/* KPI cards */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:14 }}>
        {cards.map(c=>(
          <div key={c.k} className="gx-card" onClick={()=>setDrill(drill===c.k?null:c.k)}
            style={{ padding:"14px 16px", cursor:"pointer", outline:drill===c.k?"2px solid var(--pop)":"2px solid transparent", transition:".12s" }}>
            <div className="gx-disp" style={{ fontSize:28, fontWeight:800, color:c.c||"var(--ink)", lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:12.5, fontWeight:700, marginTop:4 }}>{c.label}</div>
            <div style={{ fontSize:11, color:"var(--ink-soft)", marginTop:2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Drill table */}
      {drill && (
        <div className="gx-card gx-fade" style={{ marginBottom:14, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <b style={{ fontSize:13 }}>{active?.label} — {drillRows.length} tasks</b>
            <button className="gx-btn gx-btn-ghost" style={{ padding:"4px 8px", fontSize:12 }} onClick={()=>setDrill(null)}>Close ×</button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["No.","Property","Task","Owner","Project Status","Effort","Aging"].map(h=><th key={h} className="gx-th">{h}</th>)}</tr></thead>
              <tbody>
                {drillRows.map(t=>{ const ag=agingDays(t); return (
                  <tr key={t.id} className="gx-row" style={{ cursor:"pointer" }} onClick={()=>openDrawer(t.id,"Update")}>
                    <td className="gx-td gx-mono" style={{ color:"var(--ink-soft)" }}>{taskNo(t)}</td>
                    <td className="gx-td"><span style={{ fontWeight:700, color:PROP_COLOR[t.property] }}>{t.property}</span></td>
                    <td className="gx-td" style={{ fontWeight:600 }}>{t.task}</td>
                    <td className="gx-td"><div style={{ display:"flex", alignItems:"center", gap:6 }}><Avatar name={t.owner} size={18}/>{t.owner}</div></td>
                    <td className="gx-td"><StatusChip status={t.projectStatus}/></td>
                    <td className="gx-td gx-mono" style={{ fontWeight:700, color:"#067A8C" }}>{fmtH(effTotal(t))}</td>
                    <td className="gx-td">{ag>0?<span className="gx-chip" style={{ background:"#FDE2E2",color:"#C42424" }}><Clock size={11}/>{ag}d</span>:<span style={{ fontSize:12,color:"var(--pop-deep)",fontWeight:600 }}>On time</span>}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Row 1: Status pie + Overdue by property ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

        {/* Status pie */}
        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Tasks by status</h3>
          <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 8px" }}>Project status distribution · {dateLabel}</p>
          {statusData.length ? (
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <ResponsiveContainer width={180} height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[v,n]} contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {statusData.map(d=>(
                  <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:99, background:d.fill, flex:"none" }}/>
                    <span style={{ fontSize:12.5, fontWeight:600, color:"var(--ink)", minWidth:140 }}>{d.name}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:"var(--ink)", marginLeft:"auto" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ height:200, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No data.</div>}
        </div>

        {/* Overdue by property */}
        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Overdue tasks per property</h3>
          <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 8px" }}>Tasks past their due date, grouped by property</p>
          {overdueByProp.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overdueByProp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                <XAxis dataKey="name"
                  tick={({ x,y,payload })=><text x={x} y={y+14} fontSize={12.5} fontWeight={800} fill={PROP_COLOR[payload.value]||"#586860"} textAnchor="middle">{payload.value}</text>}
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{ borderRadius:10, border:"1px solid #E1EAE3", fontSize:12 }} formatter={v=>[v,"Tasks"]}/>
                <Bar dataKey="count" radius={[7,7,0,0]}>{overdueByProp.map((d,i)=><Cell key={i} fill={d.fill}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height:200, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No overdue tasks 🎉</div>}
        </div>
      </div>

      {/* ── Hours per date · stacked by task type ── */}
      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:14 }}>
        <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Total hours per date · by task type</h3>
        <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 12px" }}>Effort logged over time — toggle task types on the right · {dateLabel}</p>
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {dateData.length && typesInDateData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:"#586860" }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={56}/>
                  <YAxis tickFormatter={yTickH} tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<HourTooltip/>}/>
                  {typesInDateData.map((t,i,arr)=>(
                    <Bar key={t} dataKey={t} stackId="d" fill={typeColorSafe(t)} radius={i===arr.length-1?[5,5,0,0]:[0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>
                No effort logged in current selection.
              </div>
            )}
          </div>
          <TypeLegend
            types={[...legendTypes]}
            sel={chartTypes}
            onToggle={toggleChart}
            onAll={()=>setChartTypes(chartTypes.length===([...TASK_TYPES,UNTYPED]).length?[]:([...TASK_TYPES,UNTYPED]))}
          />
        </div>
      </div>

      {/* ── Hours per property · stacked by task type ── */}
      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:14 }}>
        <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Total hours per property · by task type</h3>
        <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 12px" }}>Effort by property — toggle task types on the right · {dateLabel}</p>
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {propHoursData.length && typesInPropHours.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={propHoursData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                  <XAxis dataKey="name" tick={<PropTick/>} axisLine={false} tickLine={false} interval={0} height={36}/>
                  <YAxis tickFormatter={yTickH} tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<HourTooltip/>}/>
                  {typesInPropHours.map((t,i,arr)=>(
                    <Bar key={t} dataKey={t} stackId="ph" fill={typeColorSafe(t)} radius={i===arr.length-1?[5,5,0,0]:[0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>
                No effort logged in current selection.
              </div>
            )}
          </div>
          <TypeLegend
            types={[...legendTypes]}
            sel={chartTypes}
            onToggle={toggleChart}
            onAll={()=>setChartTypes(chartTypes.length===([...TASK_TYPES,UNTYPED]).length?[]:([...TASK_TYPES,UNTYPED]))}
          />
        </div>
      </div>

    </div>
  );
}
