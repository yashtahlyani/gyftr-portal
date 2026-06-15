/* ─── components/drawer/DrawerCommentsTab.jsx ─── */
import React, { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "../ui";

export function DrawerCommentsTab({ task, addComment }) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (draft.trim()) { addComment(task.id, draft.trim()); setDraft(""); }
  };

  return (
    <>
      <div style={{ display:"flex", flexDirection:"column", gap:13, flex:1, overflowY:"auto" }}>
        {(task.comments||[]).length === 0 && (
          <div style={{ fontSize:13, color:"var(--ink-soft)" }}>No comments yet.</div>
        )}
        {(task.comments||[]).map((c,i) => (
          <div key={i} style={{ display:"flex", gap:10 }}>
            <Avatar name={c.a} size={30}/>
            <div style={{ background:"#F4F8F4", border:"1px solid var(--line)", borderRadius:"4px 12px 12px 12px", padding:"9px 12px", flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <b style={{ fontSize:12.5 }}>{c.a}</b>
                <span style={{ fontSize:10.5, fontWeight:700, color:"#1A5FD0", background:"#E3EEFF", padding:"1px 7px", borderRadius:6 }}>{c.r}</span>
                <span style={{ marginLeft:"auto", fontSize:11, color:"#94a59b" }}>{c.ts}</span>
              </div>
              <div style={{ fontSize:13, lineHeight:1.45 }}>{c.t}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Comment input — pinned at bottom via Drawer layout */}
      <div data-comment-input style={{ padding:"12px 22px", borderTop:"1px solid var(--line)", display:"flex", gap:8 }}>
        <input className="gx-input" placeholder="Add a comment…" value={draft}
          onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") submit(); }}/>
        <button className="gx-btn gx-btn-dark" style={{ padding:"9px 12px" }} onClick={submit}>
          <Send size={15}/>
        </button>
      </div>
    </>
  );
}
