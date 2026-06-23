/* ─── components/drawer/DrawerCommentsTab.jsx ─── */
import React, { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Avatar } from "../ui";

const ROLE_STYLE = {
  manager: { bg: "#E8F0FE", fg: "#1A56DB", label: "Manager" },
  Manager: { bg: "#E8F0FE", fg: "#1A56DB", label: "Manager" },
};
const getRoleStyle = (r) =>
  ROLE_STYLE[r] || { bg: "#EAF1EB", fg: "#0F6B33", label: r || "Team" };

export function DrawerCommentsTab({ task, addComment, role }) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    const userRole = role === "manager" ? "Manager" : "Team";
    addComment(task.id, draft.trim(), userRole);
    setDraft("");
  };

  const comments = task.comments || [];

  return (
    <>
      {/* Log area */}
      <div style={{ display:"flex", flexDirection:"column", gap:0, flex:1, overflowY:"auto", padding:"16px 22px" }}>
        {comments.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"40px 0", color:"var(--ink-soft)" }}>
            <MessageSquare size={28} strokeWidth={1.4}/>
            <span style={{ fontSize:13 }}>No comments yet. Be the first to post.</span>
          </div>
        )}
        {comments.map((c, i) => {
          const rs = getRoleStyle(c.r);
          return (
            <div key={i} style={{ display:"flex", gap:10, padding:"12px 0", borderBottom: i < comments.length - 1 ? "1px solid var(--line)" : "none" }}>
              <Avatar name={c.a} size={32}/>
              <div style={{ flex:1, minWidth:0 }}>
                {/* Header row */}
                <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{c.a}</span>
                  <span style={{ fontSize:10.5, fontWeight:700, padding:"2px 8px", borderRadius:6, background:rs.bg, color:rs.fg }}>
                    {rs.label}
                  </span>
                  <span style={{ fontSize:11, color:"#94a59b", marginLeft:"auto" }}>{c.ts}</span>
                </div>
                {/* Comment body — read-only */}
                <div style={{ fontSize:13, lineHeight:1.55, color:"var(--ink)", background:"#F4F8F4", border:"1px solid var(--line)", borderRadius:"4px 12px 12px 12px", padding:"8px 12px", wordBreak:"break-word" }}>
                  {c.t}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input — pinned at bottom */}
      <div data-comment-input style={{ padding:"12px 22px", borderTop:"1px solid var(--line)", display:"flex", gap:8, flex:"none" }}>
        <input
          className="gx-input"
          placeholder="Add a comment…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button className="gx-btn gx-btn-dark" style={{ padding:"9px 12px", flex:"none" }} onClick={submit}>
          <Send size={15}/>
        </button>
      </div>
    </>
  );
}
