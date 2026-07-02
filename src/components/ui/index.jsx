/* ─── components/ui/index.jsx ─── */
import React, { useState, useEffect } from "react";
import {
  ChevronDown, Flag, Plus, Play, Square,
  Check, Lock, Unlock,
} from "lucide-react";
import { STATUS, PRIORITY, OWNERS, EFFORT_STATUS_LIST, PROJECT_STATUS_LIST } from "../../constants";
import { initials, avatarColor, fmtHrs } from "../../utils";

/* ── Avatar ── */
export const Avatar = ({ name, size=22 }) => (
  <span className="gx-avatar" title={name} style={{ width:size, height:size, fontSize:size*0.4, background:avatarColor(name) }}>
    {initials(name)}
  </span>
);

/* ── StatusChip ── */
export const StatusChip = ({ status }) => {
  const s = STATUS[status] || { bg:"#eee", fg:"#555", dot:"#999" };
  return (
    <span className="gx-chip" style={{ background:s.bg, color:s.fg }}>
      <span style={{ width:7, height:7, borderRadius:99, background:s.dot }}/>
      {status||"—"}
    </span>
  );
};

/* ── PriorityChip ── */
export const PriorityChip = ({ p }) => {
  const s = PRIORITY[p];
  if (!s) return <span className="gx-chip" style={{ background:"#eee", color:"#666" }}>—</span>;
  return (
    <span className="gx-chip" style={{ background:s.bg, color:s.fg }}>
      <Flag size={11} fill={s.dot} color={s.dot}/>{p}
    </span>
  );
};

/* ── ChipMenu — click a chip to pop a dropdown picker ── */
export function ChipMenu({ trigger, options, value, onPick, render, width=200 }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-block" }}>
      <span style={{ cursor:"pointer" }} onClick={() => setOpen(o=>!o)}>{trigger}</span>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:40 }}/>
          <div className="gx-card gx-fade" style={{ position:"absolute", zIndex:50, marginTop:6, padding:6, width, boxShadow:"0 18px 50px -12px rgba(0,0,0,.3)" }}>
            {options.map(o => (
              <div key={o} className="gx-menuitem" style={{ background:o===value?"#F1F6F1":"transparent" }}
                onClick={() => { onPick(o); setOpen(false); }}>
                {render(o)}
              </div>
            ))}
          </div>
        </>
      )}
    </span>
  );
}

/* ── TextCell — inline editable text ── */
export function TextCell({ value, onCommit, placeholder, bold }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <input className="gx-cellinput" value={v} placeholder={placeholder}
      style={{ fontWeight: bold?600:400 }}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (v !== (value??"")) onCommit(v); }}
      onKeyDown={e => { if (e.key==="Enter") e.currentTarget.blur(); }}
    />
  );
}

/* ── DateCell — inline editable date ── */
export function DateCell({ value, onCommit }) {
  return (
    <input type="date" className="gx-cellinput gx-mono" value={value||""} onChange={e => onCommit(e.target.value)}
      style={{ minWidth:104, fontSize:11.5 }}
    />
  );
}

/* ── EffortAddCell — inline hours quick-add ── */
export function EffortAddCell({ onAdd }) {
  const [h, setH] = useState("");
  const add = () => { const n=parseFloat(h); if(n>0){ onAdd(n); setH(""); } };
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      <input className="gx-mono" type="number" step="0.5" min="0" placeholder="h" value={h}
        onChange={e => setH(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()}
        title="Add hours manually"
        style={{ width:36, textAlign:"center", border:"1px solid var(--line)", borderRadius:6, padding:"5px 3px", fontFamily:"var(--font-m)", fontSize:12, outline:"none" }}
      />
      <button className="gx-btn" onClick={add} title="Add hours" style={{ background:"#EAF1EB", color:"var(--ink-soft)", padding:"5px 6px", fontSize:11.5, fontWeight:700, display:"inline-flex", alignItems:"center" }}>
        <Plus size={12}/>
      </button>
    </div>
  );
}

/* ── TimerCell — live running timer with hr+min display ── */
export function TimerCell({ running, startedAt, onStart, onStop, disabled, paused, pausedMs }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick(x=>x+1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (running) {
    const anchor = startedAt || Date.now();
    const sec    = Math.max(0, Math.floor((Date.now() - anchor) / 1000));
    const hh     = Math.floor(sec / 3600);
    const mm     = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const ss     = String(sec % 60).padStart(2, "0");
    const disp   = hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
    return (
      <button className="gx-btn" onClick={() => onStop((Date.now() - anchor) / 3600000)}
        style={{ background:"#FDE2E2", color:"#C42424", padding:"6px 9px", fontSize:12, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
        <Square size={11} fill="#C42424"/> {disp}
      </button>
    );
  }
  if (disabled) {
    return (
      <span style={{ fontSize:11.5, color:"#94a59b", fontStyle:"italic", padding:"6px 2px" }}>Completed</span>
    );
  }
  if (paused) {
    const sec = Math.max(0, Math.floor((pausedMs || 0) / 1000));
    const hh  = Math.floor(sec / 3600);
    const mm  = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const ss  = String(sec % 60).padStart(2, "0");
    const disp = hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
    return (
      <button className="gx-btn" onClick={onStart}
        style={{ background:"#FEF3C7", color:"#92400E", padding:"6px 9px", fontSize:12, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
        <Play size={12} fill="#92400E"/> {disp}
      </button>
    );
  }
  return (
    <button className="gx-btn" onClick={onStart}
      style={{ background:"var(--pop-soft)", color:"var(--pop-deep)", padding:"6px 11px", fontSize:12.5, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
      <Play size={12} fill="var(--pop-deep)"/> Start
    </button>
  );
}

/* ── LockCell ── */
export const LockCell = ({ state, onToggle }) => {
  const map = {
    locked:    { icon:<Lock size={15}/>,   color:"#94a59b", bg:"transparent"  },
    unlocked:  { icon:<Unlock size={15}/>, color:"#15803D", bg:"#E1F5E8"     },
    requested: { icon:<Lock size={15}/>,   color:"#C42424", bg:"#FDE2E2"     },
  };
  const m = map[state] || map.locked;
  return (
    <span onClick={onToggle} title={`Lock state: ${state}`}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:8, background:m.bg, color:m.color, cursor:onToggle?"pointer":"default", transition:".12s" }}>
      {m.icon}
    </span>
  );
};

/* ── Caret (dropdown indicator) ── */
export const Caret = () => (
  <ChevronDown size={13} style={{ position:"absolute", right:6, top:9, color:"#94a59b", pointerEvents:"none" }}/>
);

/* ── SelectWithCaret — wrapper for styled select ── */
export function SelectWithCaret({ value, onChange, options, style={} }) {
  return (
    <div style={{ position:"relative" }}>
      <select className="gx-input" style={{ appearance:"none", cursor:"pointer", paddingRight:30, ...style }}
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
      <Caret/>
    </div>
  );
}

/* ── StatusSelect — used in Drawer Update tab to let employees change statuses ── */
export function StatusSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", display:"block", marginBottom:6 }}>{label}</label>
      <SelectWithCaret value={value} onChange={onChange} options={options}/>
    </div>
  );
}
