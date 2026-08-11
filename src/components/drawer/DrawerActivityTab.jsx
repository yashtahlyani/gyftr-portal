/* ─── components/drawer/DrawerActivityTab.jsx ─── */
import React from "react";

export function DrawerActivityTab({ task }) {
  return (
    <div style={{ position:"relative", paddingLeft:18 }}>
      <div style={{ position:"absolute", left:5, top:6, bottom:6, width:2, background:"var(--line)" }}/>
      {(task.audit||[]).length === 0 && (
        <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No activity recorded yet.</div>
      )}
      {(task.audit||[]).map((a,i) => (
        <div key={i} style={{ position:"relative", marginBottom:16 }}>
          <span style={{ position:"absolute", left:-17, top:3, width:10, height:10, borderRadius:99, background:"var(--pop)", border:"2px solid #fff" }}/>
          <div style={{ fontSize:13, fontWeight:600 }}>{a.x}</div>
          <div style={{ fontSize:11.5, color:"var(--ink-soft)" }}>{a.by} · {a.ts}</div>
        </div>
      ))}
    </div>
  );
}
