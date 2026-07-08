/* ─── components/dashboard/Dashboard.jsx ─── */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { Plus, ChevronDown, Clock, CalendarDays } from "lucide-react";
import { Avatar, StatusChip } from "../ui";
import { PROPERTIES, STATUS_LIST, TASK_TYPES, PROJECT_STATUS_LIST, STATUS, PROP_COLOR } from "../../constants";
import { typeColor, fmtDate, fmtHrs, agingDays, taskNo, TODAY_ISO } from "../../utils";
import { supabase } from "../../lib/supabase";

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

// Tasks with no type assigned go into this bucket on the charts
const UNTYPED       = "General";
const UNTYPED_COLOR = "#94a59b";
const tColor = (t) => t === UNTYPED ? UNTYPED_COLOR : typeColor(t);
const tArr   = (t) => Array.isArray(t.type) ? t.type : t.type ? [t.type] : [];

/* ── Type legend ── */
function TypeLegend({ types, sel, onToggle, onAll }) {
  return (
    <div style={{ flex:"0 0 180px", borderLeft:"1px solid var(--line)", paddingLeft:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:800, color:"var(--ink-soft)", textTransform:"uppercase" }}>Task Types</span>
        <span style={{ fontSize:10.5, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={onAll}>
          {sel.length === types.length ? "Clear" : "All"}
        </span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:280, overflowY:"auto" }}>
        {types.map(t => {
          const on = sel.includes(t);
          return (
            <div key={t} onClick={() => onToggle(t)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"3px 5px", borderRadius:6, cursor:"pointer", background:on?"#F1F6F1":"transparent" }}>
              <span style={{ width:11, height:11, borderRadius:3, flex:"none", background:on?tColor(t):"transparent", border:on?"none":"1.5px solid #c4cfc7" }}/>
              <span style={{ fontSize:11.5, fontWeight:600, color:on?"var(--ink)":"var(--ink-soft)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Hour tooltip ── */
function HourTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
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
      {payload.length > 1 && (
        <div style={{ borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6, fontWeight:700 }}>Total: {fmtH(total)}</div>
      )}
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
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [fStatus,        setFStatus]        = useState(STATUS_LIST.slice());
  const [fOwner,         setFOwner]         = useState("All");

  // Tick every 30 s so live running-timer hours update in the KPI and charts
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Direct effort_entries query — bypasses the task join so RLS or row-limit issues don't hide data
  const [rawEntries, setRawEntries] = useState([]);
  const fetchRef = useRef(0);

  const tasksSig = tasks.map(t => t.updatedTs).join(",");

  useEffect(() => {
    if (!supabase) return;
    const run = ++fetchRef.current;
    const go = async () => {
      let q = supabase.from("effort_entries").select("task_id, date, hours, status");
      if (dateFrom) q = q.gte("date", dateFrom);
      if (dateTo)   q = q.lte("date", dateTo);
      const { data, error } = await q;
      if (error) console.error("[Dashboard] effort_entries query failed:", error.message, error.details);
      if (run === fetchRef.current) setRawEntries(data || []);
    };
    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, tasksSig]);

  // Index raw entries by task_id for O(1) lookup
  const entriesByTask = useMemo(() => {
    const map = {};
    rawEntries.forEach(e => {
      if (!map[e.task_id]) map[e.task_id] = [];
      map[e.task_id].push(e);
    });
    return map;
  }, [rawEntries]);

  const owners = useMemo(() => Array.from(new Set(tasks.map(t => t.owner).filter(Boolean))), [tasks]);

  /* ── Date helpers — defined early so useMemos below can reference them ── */
  const hasDate = !!(dateFrom || dateTo);

  const inRange = (d) => !d ? false : (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);

  // Read from localStorage cache — available even when Supabase SELECT is blocked
  const cachedEntries = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem("gyftr_effort_log") || "[]");
      return hasDate
        ? all.filter(e => inRange((e.date || "").slice(0, 10)))
        : all;
    } catch(_) { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, tasksSig]);

  const cachedByTask = useMemo(() => {
    const map = {};
    cachedEntries.forEach(e => {
      if (!map[e.task_id]) map[e.task_id] = [];
      map[e.task_id].push(e);
    });
    return map;
  }, [cachedEntries]);

  // Merge all three sources: direct DB query, localStorage cache, and task-join data.
  // Take whichever has the most entries — covers RLS blocks, optimistic updates, and cross-device sync.
  const committedEntries = (t) => {
    const direct = entriesByTask[t.id] || [];
    const cached = cachedByTask[t.id] || [];
    const joined = (t.effort || []).filter(e =>
      hasDate ? inRange((e.date || "").slice(0, 10)) : true
    );
    return [direct, cached, joined].reduce((best, src) => src.length > best.length ? src : best, []);
  };

  // Hours from committed entries
  const committedHours = (t) => committedEntries(t).reduce((s, e) => s + (Number(e.hours) || 0), 0);

  // Live hours from a running timer — only counted when the timer start date is inside the filter range
  const timerStartDate = (t) => {
    if (!t.startedAt) return null;
    const _s = new Date(t.startedAt);
    return `${_s.getFullYear()}-${String(_s.getMonth()+1).padStart(2,"0")}-${String(_s.getDate()).padStart(2,"0")}`;
  };
  const liveHours = (t) => {
    if (!t.running || !t.startedAt) return 0;
    if (hasDate && !inRange(timerStartDate(t))) return 0;
    return Math.max(0, (Date.now() - t.startedAt) / 3600000);
  };

  // Total = committed + live
  const totalHours = (t) => committedHours(t) + liveHours(t);

  /* ── Base filter: property / type / status / owner (no date — charts handle dates internally) ── */
  const allProps = selProps.length === PROPERTIES.length;
  const allTypes = selTypes.length === TASK_TYPES.length;

  const filtered = useMemo(() => tasks.filter(t =>
    (allProps || selProps.includes(t.property)) &&
    (allTypes || tArr(t).some(ty => selTypes.includes(ty)) || tArr(t).length === 0) &&
    fStatus.includes(t.projectStatus) &&
    (fOwner === "All" || t.owner === fOwner)
  ), [tasks, selProps, selTypes, fStatus, fOwner, allProps, allTypes]);

  /* ── KPI filter: adds date awareness on top of filtered (for counts only) ── */
  const kpiTasks = useMemo(() => {
    if (!hasDate) return filtered;
    return filtered.filter(t => {
      const direct = entriesByTask[t.id] || [];
      const cached = cachedByTask[t.id] || [];
      const joined = (t.effort || []).filter(e => inRange((e.date || "").slice(0, 10)));
      return (
        direct.length > 0 || cached.length > 0 || joined.length > 0 ||
        t.running ||
        inRange(t.due) || inRange(t.expected) || inRange(t.requested)
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, hasDate, dateFrom, dateTo, entriesByTask, cachedByTask]);

  /* ── KPI data ── */
  const isActive  = (t) => STATUS[t.projectStatus]?.group === "active";
  const isHold    = (t) => STATUS[t.projectStatus]?.group === "hold";
  const isDone    = (t) => t.projectStatus === "Completed";
  const isOverdue = (t) => agingDays(t) > 0;

  const grandTotal = filtered.reduce((s, t) => s + totalHours(t), 0);

  const dateLabel = !dateFrom && !dateTo ? "All time"
    : dateFrom === dateTo               ? fmtDate(dateFrom)
    : dateFrom && dateTo               ? `${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`
    : dateFrom                         ? `From ${fmtDate(dateFrom)}`
    :                                    `Until ${fmtDate(dateTo)}`;

  const cards = [
    { k:"total",   label:"Total Tasks",  value:kpiTasks.length,                   sub:"click to see all",         rows:() => kpiTasks },
    { k:"active",  label:"In Progress",  value:kpiTasks.filter(isActive).length,  c:"#2D7FF9", sub:"active",      rows:() => kpiTasks.filter(isActive)  },
    { k:"hold",    label:"On Hold",      value:kpiTasks.filter(isHold).length,    c:"#E11D74", sub:"hold",        rows:() => kpiTasks.filter(isHold)    },
    { k:"done",    label:"Completed",    value:kpiTasks.filter(isDone).length,    c:"#15803D", sub:"closed",      rows:() => kpiTasks.filter(isDone)    },
    { k:"overdue", label:"Overdue",      value:kpiTasks.filter(isOverdue).length, c:"#F5A623", sub:"past due",    rows:() => kpiTasks.filter(isOverdue) },
    { k:"effort",  label:"Total Effort", value:fmtH(grandTotal),                  c:"#067A8C", sub:hasDate ? dateLabel : "all time", rows:() => [...kpiTasks].sort((a, b) => totalHours(b) - totalHours(a)) },
  ];

  const active    = cards.find(c => c.k === drill);
  const drillRows = active ? active.rows() : [];

  /* ── Task lookup for chart attribution ── */
  const taskLookup = useMemo(() => {
    const m = {};
    tasks.forEach(t => { m[t.id] = t; });
    return m;
  }, [tasks]);

  /* ── Charts ── */
  // Status pie + overdue use kpiTasks so they match the KPI counts
  const statusData = PROJECT_STATUS_LIST
    .map(s => ({ name:s, value:kpiTasks.filter(t => t.projectStatus === s).length, fill:STATUS[s].dot }))
    .filter(d => d.value > 0);

  const overdueByProp = PROPERTIES
    .filter(p => selProps.includes(p))
    .map(p => ({ name:p, count:kpiTasks.filter(t => t.property === p && agingDays(t) > 0).length, fill:PROP_COLOR[p] }))
    .filter(d => d.count > 0);

  // Attribute each task's effort to its first matching task type (or UNTYPED)
  const bucketOf = (t) => {
    const matching = tArr(t).filter(ty => chartTypes.includes(ty));
    if (matching.length > 0) return matching[0];
    if (tArr(t).length === 0) return UNTYPED;
    return null;
  };

  // Union all three effort sources to avoid any single source missing data:
  // 1. rawEntries — direct date-filtered DB query (may be blocked by RLS for some roles)
  // 2. cachedEntries — localStorage writes from this device (survives RLS SELECT blocks)
  // 3. joined t.effort — entries fetched via task join (different RLS code path)
  // Deduplicate by task_id+date+hours so a stopped timer doesn't count twice.
  const effortSource = useMemo(() => {
    const seen = new Set();
    const result = [];
    const add = (task_id, date, hours, status) => {
      const k = `${task_id}|${date}|${hours}`;
      if (seen.has(k)) return;
      seen.add(k);
      result.push({ task_id, date, hours, status });
    };
    rawEntries.forEach(e => add(e.task_id, e.date, e.hours, e.status));
    cachedEntries.forEach(e => add(e.task_id, e.date, e.hours, e.status));
    filtered.forEach(t =>
      (t.effort || [])
        .filter(e => !hasDate || inRange((e.date || "").slice(0, 10)))
        .forEach(e => add(t.id, e.date, e.hours, e.status))
    );
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawEntries, cachedEntries, filtered, hasDate, dateFrom, dateTo]);

  // Hours per date + hours per property — built directly from effortSource
  const dateMap = {};
  const propMap = {};

  effortSource.forEach(e => {
    if (!e.date || !(Number(e.hours) > 0)) return;
    const t = taskLookup[e.task_id];
    if (!t) return;
    if (!(allProps || selProps.includes(t.property))) return;
    if (!(allTypes || tArr(t).some(ty => selTypes.includes(ty)) || tArr(t).length === 0)) return;
    if (!fStatus.includes(t.projectStatus)) return;
    if (fOwner !== "All" && t.owner !== fOwner) return;
    const bucket = bucketOf(t);
    if (!bucket) return;
    if (!dateMap[e.date]) dateMap[e.date] = { date: e.date };
    dateMap[e.date][bucket] = (dateMap[e.date][bucket] || 0) + Number(e.hours);
    if (t.property) {
      if (!propMap[t.property]) propMap[t.property] = { name: t.property };
      propMap[t.property][bucket] = (propMap[t.property][bucket] || 0) + Number(e.hours);
    }
  });

  // Add live running timer hours
  filtered.forEach(t => {
    const live = liveHours(t);
    if (!(live > 0.008)) return;
    const sd     = timerStartDate(t);
    const bucket = bucketOf(t);
    if (!sd || !bucket) return;
    if (!dateMap[sd]) dateMap[sd] = { date: sd };
    dateMap[sd][bucket] = (dateMap[sd][bucket] || 0) + live;
    if (t.property) {
      if (!propMap[t.property]) propMap[t.property] = { name: t.property };
      propMap[t.property][bucket] = (propMap[t.property][bucket] || 0) + live;
    }
  });

  const dateData        = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, name: fmtDate(d.date) }));
  const allBuckets      = [...TASK_TYPES, UNTYPED];
  const typesInDateData = allBuckets.filter(b => chartTypes.includes(b) && dateData.some(d => (d[b] || 0) > 0));

  const propData        = PROPERTIES.filter(p => selProps.includes(p) && propMap[p]).map(p => propMap[p]);
  const typesInPropData = allBuckets.filter(b => chartTypes.includes(b) && propData.some(d => (d[b] || 0) > 0));

  // Legend shows types present in effortSource (or filtered tasks when no date)
  const legendTypes = [
    ...TASK_TYPES.filter(ty =>
      effortSource.some(e => { const t = taskLookup[e.task_id]; return t && tArr(t).includes(ty); }) ||
      filtered.some(t => tArr(t).includes(ty))
    ),
    ...(filtered.some(t => tArr(t).length === 0) ? [UNTYPED] : []),
  ];

  /* ── Handlers ── */
  const toggleType  = (t) => setSelTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleChart = (t) => setChartTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleProp  = (p) => setSelProps(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleStat  = (s) => setFStatus(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const clearAll    = () => { setDateFrom(""); setDateTo(""); setFStatus(STATUS_LIST.slice()); setFOwner("All"); setSelProps(PROPERTIES.slice()); setSelTypes(TASK_TYPES.slice()); setChartTypes([...TASK_TYPES, UNTYPED]); setDrill(null); };
  const setToday    = () => { setDateFrom(TODAY_ISO); setDateTo(TODAY_ISO); };

  const hasFilter = hasDate || fStatus.length !== STATUS_LIST.length || fOwner !== "All" || !allProps || !allTypes;

  const PropTick = ({ x, y, payload }) => (
    <text x={x} y={y + 14} textAnchor="middle" fontSize={12} fontWeight={800} fill={PROP_COLOR[payload.value] || "#586860"}>{payload.value}</text>
  );

  return (
    <div className="gx-fade" style={{ padding:"24px 30px", overflowY:"auto", height:"100%" }}>

      {/* Title */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 className="gx-disp" style={{ fontSize:26, fontWeight:700, margin:0 }}>Dashboard &amp; Reporting</h1>
          <p style={{ color:"var(--ink-soft)", fontSize:13, margin:"4px 0 0" }}>
            Showing effort for: <b style={{ color:"var(--pop-deep)" }}>{dateLabel}</b>
            {rawEntries.length > 0 && (
              <span style={{ marginLeft:10, fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>
                · {rawEntries.length} effort {rawEntries.length === 1 ? "entry" : "entries"} found
              </span>
            )}
          </p>
        </div>
        {canCreate && <button className="gx-btn gx-btn-dark" onClick={onCreate}><Plus size={16}/> Create task</button>}
      </div>

      {/* ── Filter bar ── */}
      <div className="gx-card" style={{ padding:"12px 14px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>

        {/* Date range — always visible, two plain pickers */}
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"#F4F8F4", border:"1px solid var(--line)", borderRadius:9, padding:"5px 10px" }}>
          <CalendarDays size={14} style={{ color:"var(--pop-deep)", flexShrink:0 }}/>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ border:"none", background:"transparent", fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", outline:"none", width:130 }}
            title="From date"/>
          <span style={{ fontSize:12, color:"var(--ink-soft)", fontWeight:600, userSelect:"none" }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ border:"none", background:"transparent", fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", outline:"none", width:130 }}
            title="To date"/>
        </div>

        {/* Quick-select buttons */}
        {[
          { label:"Today",     action: setToday,                                              active: dateFrom === TODAY_ISO && dateTo === TODAY_ISO },
          { label:"All time",  action: () => { setDateFrom(""); setDateTo(""); },             active: !dateFrom && !dateTo },
        ].map(b => (
          <button key={b.label} className="gx-btn gx-btn-ghost" onClick={b.action}
            style={{ border:"1px solid var(--line)", padding:"6px 12px", fontSize:12.5, fontWeight:700,
              background: b.active ? "var(--pop-soft)" : "transparent",
              color:      b.active ? "var(--pop-deep)" : "var(--ink-soft)" }}>
            {b.label}
          </button>
        ))}

        {/* Property */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={() => setPropMenuOpen(o => !o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Property: <b style={{ marginLeft:3 }}>{allProps ? "All" : selProps.length === 0 ? "None" : selProps.length === 1 ? selProps[0] : `${selProps.length} of ${PROPERTIES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {propMenuOpen && (<>
            <div onClick={() => setPropMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:220, maxHeight:340, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Property</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={() => setSelProps(allProps ? [] : PROPERTIES.slice())}>{allProps ? "Clear" : "All"}</span>
              </div>
              {PROPERTIES.map(p => { const on = selProps.includes(p); return (
                <div key={p} onClick={() => toggleProp(p)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:12, height:12, borderRadius:3, background:on ? PROP_COLOR[p] : "transparent", border:on ? "none" : "1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:on ? PROP_COLOR[p] : "var(--ink-soft)" }}>{p}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Task type */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={() => setTypeMenuOpen(o => !o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Task types: <b style={{ marginLeft:3 }}>{allTypes ? "All" : `${selTypes.length} of ${TASK_TYPES.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {typeMenuOpen && (<>
            <div onClick={() => setTypeMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:230, maxHeight:340, overflowY:"auto", boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Task type</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={() => setSelTypes(allTypes ? [] : TASK_TYPES.slice())}>{allTypes ? "Clear" : "All"}</span>
              </div>
              {TASK_TYPES.map(t => { const on = selTypes.includes(t); return (
                <div key={t} onClick={() => toggleType(t)} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:11, height:11, borderRadius:3, background:on ? typeColor(t) : "transparent", border:on ? "none" : "1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color:on ? "var(--ink)" : "var(--ink-soft)" }}>{t}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Status */}
        <div style={{ position:"relative" }}>
          <button className="gx-btn gx-btn-ghost" onClick={() => setStatusMenuOpen(o => !o)} style={{ border:"1px solid var(--line)", padding:"7px 11px", fontSize:12.5 }}>
            Status: <b style={{ marginLeft:3 }}>{fStatus.length === STATUS_LIST.length ? "All" : `${fStatus.length} of ${STATUS_LIST.length}`}</b>
            <ChevronDown size={13} style={{ marginLeft:3 }}/>
          </button>
          {statusMenuOpen && (<>
            <div onClick={() => setStatusMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
            <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:10, width:220, boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <b style={{ fontSize:11, color:"var(--ink-soft)", textTransform:"uppercase" }}>Status</b>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer" }} onClick={() => setFStatus(fStatus.length === STATUS_LIST.length ? [] : STATUS_LIST.slice())}>{fStatus.length === STATUS_LIST.length ? "Clear" : "All"}</span>
              </div>
              {STATUS_LIST.map(s => { const on = fStatus.includes(s); return (
                <div key={s} onClick={() => toggleStat(s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px", borderRadius:6, cursor:"pointer" }}>
                  <span style={{ width:11, height:11, borderRadius:3, background:on ? STATUS[s].dot : "transparent", border:on ? "none" : "1.5px solid #c4cfc7", flex:"none" }}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color:on ? "var(--ink)" : "var(--ink-soft)" }}>{s}</span>
                </div>
              );})}
            </div>
          </>)}
        </div>

        {/* Owner */}
        <div style={{ position:"relative" }}>
          <select className="gx-input" style={{ paddingRight:30, appearance:"none", cursor:"pointer", fontWeight:600, minWidth:140 }} value={fOwner} onChange={e => setFOwner(e.target.value)}>
            <option value="All">Owner: All</option>
            {owners.map(o => <option key={o}>{o}</option>)}
          </select>
          <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:10, color:"var(--ink-soft)" }}>▼</span>
        </div>

        {hasFilter && <button className="gx-btn gx-btn-ghost" onClick={clearAll} style={{ fontSize:12, color:"#C42424", border:"1px solid #F3C2C2" }}>Clear all</button>}
      </div>

      {/* ── KPI cards ── */}
      <div className="gx-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:14 }}>
        {cards.map(c => (
          <div key={c.k} className="gx-card" onClick={() => setDrill(drill === c.k ? null : c.k)}
            style={{ padding:"14px 16px", cursor:"pointer", outline:drill === c.k ? "2px solid var(--pop)" : "2px solid transparent", transition:".12s" }}>
            <div className="gx-disp" style={{ fontSize:28, fontWeight:800, color:c.c || "var(--ink)", lineHeight:1 }}>{c.value}</div>
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
            <button className="gx-btn gx-btn-ghost" style={{ padding:"4px 8px", fontSize:12 }} onClick={() => setDrill(null)}>Close ×</button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["No.","Property","Task","Owner","Status","Effort","Aging"].map(h => <th key={h} className="gx-th">{h}</th>)}</tr></thead>
              <tbody>
                {drillRows.map(t => { const ag = agingDays(t); const live = liveHours(t); return (
                  <tr key={t.id} className="gx-row" style={{ cursor:"pointer" }} onClick={() => openDrawer(t.id, "Update")}>
                    <td className="gx-td gx-mono" style={{ color:"var(--ink-soft)" }}>{taskNo(t)}</td>
                    <td className="gx-td"><span style={{ fontWeight:700, color:PROP_COLOR[t.property] }}>{t.property}</span></td>
                    <td className="gx-td" style={{ fontWeight:600 }}>{t.task}</td>
                    <td className="gx-td"><div style={{ display:"flex", alignItems:"center", gap:6 }}><Avatar name={t.owner} size={18}/>{t.owner}</div></td>
                    <td className="gx-td"><StatusChip status={t.projectStatus}/></td>
                    <td className="gx-td gx-mono" style={{ fontWeight:700, color:"#067A8C" }}>
                      {fmtH(totalHours(t))}{live > 0.01 && <span style={{ fontSize:10, color:"#C42424", marginLeft:4 }}>●live</span>}
                    </td>
                    <td className="gx-td">{ag > 0 ? <span className="gx-chip" style={{ background:"#FDE2E2", color:"#C42424" }}><Clock size={11}/>{ag}d</span> : <span style={{ fontSize:12, color:"var(--pop-deep)", fontWeight:600 }}>On time</span>}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Status pie + Overdue bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Tasks by status</h3>
          <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 8px" }}>Project status distribution</p>
          {statusData.length ? (
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <ResponsiveContainer width={180} height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius:10, fontSize:12 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {statusData.map(d => (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:99, background:d.fill, flex:"none" }}/>
                    <span style={{ fontSize:12.5, fontWeight:600, minWidth:140 }}>{d.name}</span>
                    <span style={{ fontSize:13, fontWeight:800, marginLeft:"auto" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ height:200, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No data.</div>}
        </div>

        <div className="gx-card" style={{ padding:"18px 20px" }}>
          <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Overdue tasks per property</h3>
          <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 8px" }}>Tasks past their due date</p>
          {overdueByProp.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overdueByProp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                <XAxis dataKey="name" tick={({ x, y, payload }) => <text x={x} y={y+14} fontSize={12} fontWeight={800} fill={PROP_COLOR[payload.value]||"#586860"} textAnchor="middle">{payload.value}</text>} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{ borderRadius:10, fontSize:12 }} formatter={v => [v, "Tasks"]}/>
                <Bar dataKey="count" radius={[7,7,0,0]}>{overdueByProp.map((d, i) => <Cell key={i} fill={d.fill}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height:200, display:"grid", placeItems:"center", fontSize:13, color:"var(--ink-soft)" }}>No overdue tasks 🎉</div>}
        </div>
      </div>

      {/* ── Hours per date ── */}
      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:14 }}>
        <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Hours logged per day · by task type</h3>
        <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 12px" }}>Effort by day · {dateLabel}</p>
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {dateData.length > 0 && typesInDateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:"#586860" }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={56}/>
                  <YAxis tickFormatter={v => `${v}h`} tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<HourTooltip/>}/>
                  {typesInDateData.map((t, i, arr) => (
                    <Bar key={t} dataKey={t} stackId="d" fill={tColor(t)} radius={i === arr.length - 1 ? [5,5,0,0] : [0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"grid", placeItems:"center", textAlign:"center", color:"var(--ink-soft)", fontSize:13 }}>
                No effort logged for {dateLabel}.
              </div>
            )}
          </div>
          <TypeLegend types={legendTypes} sel={chartTypes} onToggle={toggleChart}
            onAll={() => setChartTypes(chartTypes.length === [...TASK_TYPES,UNTYPED].length ? [] : [...TASK_TYPES,UNTYPED])}/>
        </div>
      </div>

      {/* ── Hours per property ── */}
      <div className="gx-card" style={{ padding:"18px 20px", marginBottom:14 }}>
        <h3 className="gx-disp" style={{ fontSize:15, fontWeight:700, margin:"0 0 2px" }}>Hours per property · by task type</h3>
        <p style={{ fontSize:12, color:"var(--ink-soft)", margin:"0 0 12px" }}>Effort by property · {dateLabel}</p>
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {propData.length > 0 && typesInPropData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={propData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF4EF" vertical={false}/>
                  <XAxis dataKey="name" tick={<PropTick/>} axisLine={false} tickLine={false} interval={0} height={36}/>
                  <YAxis tickFormatter={v => `${v}h`} tick={{ fontSize:11, fill:"#94a59b" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<HourTooltip/>}/>
                  {typesInPropData.map((t, i, arr) => (
                    <Bar key={t} dataKey={t} stackId="ph" fill={tColor(t)} radius={i === arr.length - 1 ? [5,5,0,0] : [0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"grid", placeItems:"center", textAlign:"center", color:"var(--ink-soft)", fontSize:13 }}>
                No effort logged for {dateLabel}.
              </div>
            )}
          </div>
          <TypeLegend types={legendTypes} sel={chartTypes} onToggle={toggleChart}
            onAll={() => setChartTypes(chartTypes.length === [...TASK_TYPES,UNTYPED].length ? [] : [...TASK_TYPES,UNTYPED])}/>
        </div>
      </div>

    </div>
  );
}
