/* ─── components/admin/TeamDirectory.jsx ───
 * Super-admin panel for the `users` table. Changing someone's team or role
 * used to mean editing hardcoded arrays in src/constants/index.js and
 * redeploying the frontend — it happens here now and takes effect on reload.
 */
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Avatar, Caret } from "../ui";
import { useDirectory } from "../../lib/DirectoryProvider";
import { apiFetch } from "../../lib/api";

const ROLES = ["super_admin", "manager", "user"];
const TEAMS = ["Content", "Creative", "Admin"];

// DB values are historical; these are the tier names the business uses.
const ROLE_LABEL = { super_admin: "Super Admin", manager: "Admin", user: "Employee" };
const ROLE_HELP  = {
  super_admin: "Both teams · everything · can edit this directory",
  manager:     "Their own team · full edit, can create and delete tasks",
  user:        "Only tasks assigned to them · can log progress, not reassign",
};

export function TeamDirectory({ canEdit }) {
  const { users, reload } = useDirectory();
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(null);
  const [error,   setError]   = useState(null);

  const save = async (email, patch) => {
    setSaving(email);
    setError(null);
    try {
      await apiFetch(`/api/users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
      });
      await reload();
    } catch (err) {
      setError(`${email}: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const byTeam = TEAMS.map(t => ({ team: t, members: users.filter(u => u.team === t) }))
                      .filter(g => g.members.length);

  return (
    <div className="gx-card" style={{ marginBottom:16, overflow:"hidden" }}>
      <div
        style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", borderBottom: open ? "1px solid var(--line)" : "none" }}
        onClick={() => setOpen(o => !o)}
      >
        <b className="gx-disp" style={{ fontSize:14 }}>Team Directory</b>
        <span style={{ fontSize:11.5, color:"var(--ink-soft)" }}>
          {users.length} active {users.length === 1 ? "member" : "members"} · from Cognito
        </span>
        <span style={{ marginLeft:"auto", fontSize:12, color:"var(--pop)", fontWeight:700 }}>{open ? "▲ Close" : "▼ Open"}</span>
      </div>

      {open && (
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:12, color:"var(--ink-soft)", marginBottom:10 }}>
            {canEdit
              ? "A person's team decides which tasks they see, and their access level decides how much they can change. New accounts appear here automatically as Content Employees — move them to the right team and level."
              : "Read-only. Only a Super Admin can change access levels and teams."}
          </div>

          <div style={{ background:"#F4F8F4", border:"1px solid var(--line-soft)", borderRadius:9, padding:"9px 12px", marginBottom:14 }}>
            {ROLES.map(r => (
              <div key={r} style={{ fontSize:11.5, marginBottom:3, color:"var(--ink-soft)" }}>
                <b style={{ color:"var(--ink)" }}>{ROLE_LABEL[r]}</b> — {ROLE_HELP[r]}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ fontSize:12, fontWeight:600, color:"#B01457", background:"#FBE0EC", padding:"7px 10px", borderRadius:8, marginBottom:10 }}>
              Could not save — {error}
            </div>
          )}

          {byTeam.map(({ team, members }) => (
            <div key={team} style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-soft)", textTransform:"uppercase", letterSpacing:.03, marginBottom:7 }}>
                {team} · {members.length}
              </div>
              <table className="gx-table" style={{ width:"100%" }}>
                <tbody>
                  {members.map(u => (
                    <tr key={u.email} style={{ opacity: saving === u.email ? .5 : 1 }}>
                      <td className="gx-td" style={{ width:34 }}><Avatar name={u.name} size={24}/></td>
                      <td className="gx-td" style={{ fontSize:13, fontWeight:600 }}>{u.name}</td>
                      <td className="gx-td" style={{ fontSize:12, color:"var(--ink-soft)" }}>{u.email}</td>
                      <td className="gx-td" style={{ width:140 }}>
                        {canEdit ? (
                          <div style={{ position:"relative" }}>
                            <select className="gx-sel" style={{ width:"100%", appearance:"none", paddingRight:22 }}
                              value={u.team} disabled={saving === u.email}
                              onChange={e => save(u.email, { team: e.target.value })}>
                              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select><Caret/>
                          </div>
                        ) : <span style={{ fontSize:12.5 }}>{u.team}</span>}
                      </td>
                      <td className="gx-td" style={{ width:150 }}>
                        {canEdit ? (
                          <div style={{ position:"relative" }}>
                            <select className="gx-sel" style={{ width:"100%", appearance:"none", paddingRight:22 }}
                              value={u.role} disabled={saving === u.email}
                              onChange={e => save(u.email, { role: e.target.value })}>
                              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                            </select><Caret/>
                          </div>
                        ) : <span style={{ fontSize:12.5 }}>{ROLE_LABEL[u.role] || u.role}</span>}
                      </td>
                      <td className="gx-td" style={{ width:130, fontSize:12 }}>
                        {canEdit ? (
                          <label style={{ display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer", color:"var(--ink-soft)" }}>
                            <input type="checkbox" checked={!!u.isBusinessOwner} disabled={saving === u.email}
                              onChange={e => save(u.email, { isBusinessOwner: e.target.checked })}/>
                            Biz owner
                          </label>
                        ) : (u.isBusinessOwner ? "Biz owner" : "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button className="gx-btn gx-btn-ghost" onClick={() => window.location.reload()}
              title="Reload so the new teams and roles apply everywhere"
              style={{ border:"1px solid var(--line)" }}>
              <RefreshCw size={14}/> Apply
            </button>
            <span style={{ fontSize:11, color:"var(--ink-soft)" }}>
              Reload after changing a team so the Board and Dashboard dropdowns pick it up.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
