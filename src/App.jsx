/* ─── App.jsx (main shell) ─── */
import React, { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, Table2, Settings, Plus, LogOut } from "lucide-react";

import { STYLES }          from "./lib/styles";
import { TEAM_OF, USER_BY_EMAIL } from "./constants";

import { useAuth }         from "./hooks/useAuth";
import { useTaskStore }    from "./hooks/useTaskStore";

import { Login }           from "./components/Login";
import { Dashboard }       from "./components/dashboard/Dashboard";
import { Board }           from "./components/board/Board";
import { Admin }           from "./components/admin/Admin";
import { Drawer }          from "./components/drawer/Drawer";
import { CreateTaskModal } from "./components/modals/CreateTaskModal";
import { Avatar }          from "./components/ui";
import { GyftrLogo }       from "./components/ui/GyftrLogo";

const NAV = [
  { k:"dashboard", label:"Dashboard",   Icon:LayoutDashboard },
  { k:"board",     label:"Work Board",  Icon:Table2           },
  { k:"admin",     label:"Admin · PMO", Icon:Settings         },
];

export default function App() {
  const { authed, setAuthed, currentUser, setCurrentUser, displayName, setDisplayName, role, setRole, userTeam, logout } = useAuth();
  const [view,       setView]       = useState("board");
  const [openId,     setOpenId]     = useState(null);
  const [openTab,    setOpenTab]    = useState("Update");
  const [createOpen, setCreateOpen] = useState(false);
  // Super-admin only: which team's data to view
  const [teamView,   setTeamView]   = useState("Content");

  const isSuperAdmin = role === "super_admin";
  const isManager    = role === "manager" || isSuperAdmin;

  const { tasks, loading, fetchTasks, patch, patchUpdate, addEffort, removeEffort, stopTimerAndLog, addComment, addTask, deleteTask } = useTaskStore(displayName || currentUser);

  useEffect(() => { if (authed) fetchTasks(); }, [authed, fetchTasks]);

  useEffect(() => {
    if (!authed) return;
    const onFocus = () => fetchTasks();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authed, fetchTasks]);

  // Determine which tasks are visible based on role + team
  const activeTeam = isSuperAdmin ? teamView : userTeam;

  const visibleTasks = useMemo(() => {
    // Filter to the active team first (super admin can also pick "All")
    const teamFiltered = (isSuperAdmin && teamView === "All")
      ? tasks
      : tasks.filter(t => t.team === activeTeam);

    // Managers and super-admins see all tasks in scope
    if (isManager) return teamFiltered;

    // Regular members see only tasks assigned to them
    const nameFromEmail = USER_BY_EMAIL[currentUser?.toLowerCase()] || "";
    return teamFiltered.filter(t => {
      const owner = t.owner?.toLowerCase() || "";
      return owner === displayName?.toLowerCase() || owner === nameFromEmail.toLowerCase();
    });
  }, [isSuperAdmin, isManager, tasks, displayName, currentUser, userTeam, teamView, activeTeam]);

  useEffect(() => { if (!isManager && view === "admin") setView("dashboard"); }, [isManager, view]);

  const openTask   = tasks.find(t => t.id === openId) || null;
  const openDrawer = (id, tab = "Update") => { setOpenId(id); setOpenTab(tab); };

  const handleAddTask = (f) => {
    // Stamp the task with the correct team before saving
    const taskWithTeam = { ...f, team: isSuperAdmin ? teamView === "All" ? "Content" : teamView : userTeam };
    addTask(taskWithTeam, {
      onSuccess: (id) => { setCreateOpen(false); setView("board"); setOpenId(id); setOpenTab("Update"); },
      onError:   (msg) => { alert("Could not save task: " + msg); setCreateOpen(true); },
    });
  };

  if (!authed) {
    return <Login onIn={(name) => { setAuthed(true); if (name) setCurrentUser(name); }}/>;
  }

  if (loading) {
    return (
      <div className="gx-root" style={{ height:"100vh", display:"grid", placeItems:"center" }}>
        <style>{STYLES}</style>
        <div style={{ textAlign:"center", fontSize:15, fontWeight:600, color:"var(--ink-soft)" }}>
          Loading tasks…
        </div>
      </div>
    );
  }

  const teamLabel = TEAM_OF[displayName] || (isSuperAdmin ? "Admin" : userTeam);

  return (
    <div className="gx-root" style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{STYLES}</style>

      {/* Header */}
      <header style={{ flex:"none", height:58, borderBottom:"1px solid var(--line)", background:"var(--surface)", display:"flex", alignItems:"center", gap:18, padding:"0 24px" }}>
        <GyftrLogo fs={20}/>
        <span style={{ width:1, height:24, background:"var(--line)", margin:"0 2px" }}/>

        <nav style={{ display:"flex", alignItems:"center", gap:4 }}>
          {NAV.filter(n => n.k !== "admin" || isManager).map(({ k, label, Icon }) => (
            <div key={k} className={"gx-navitem"+(view===k?" on":"")} onClick={() => setView(k)}>
              <Icon size={16}/> {label}
            </div>
          ))}
        </nav>

        {/* Super-admin team switcher */}
        {isSuperAdmin && (
          <div style={{ display:"flex", background:"#EEF4EF", borderRadius:8, padding:2, marginLeft:8 }}>
            {["All","Content","Creative"].map(t => (
              <button key={t} className="gx-btn" onClick={() => setTeamView(t)}
                style={{ padding:"4px 10px", fontSize:11, fontWeight:700,
                  background: teamView===t ? "var(--surface)" : "transparent",
                  color:      teamView===t ? (t==="Creative"?"#7C3AED":t==="Content"?"#15803D":"var(--ink)") : "var(--ink-soft)",
                  boxShadow:  teamView===t ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {isManager && (
          <button className="gx-btn gx-btn-dark" style={{ marginLeft: isSuperAdmin ? 8 : "auto" }} onClick={() => setCreateOpen(true)}>
            <Plus size={16}/> Create task
          </button>
        )}

        <span style={{ width:1, height:24, background:"var(--line)", marginLeft: isManager ? 0 : "auto" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Avatar name={displayName} size={30}/>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.1 }}>{displayName}</div>
            <div style={{ fontSize:10.5, color:"var(--ink-soft)" }}>
              {teamLabel} · {isSuperAdmin ? "Super Admin" : isManager ? "Manager" : "Member"}
            </div>
          </div>
          <LogOut size={16} style={{ color:"#94a59b", cursor:"pointer", marginLeft:2 }} onClick={logout}/>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--paper)" }}>
        {view==="dashboard" && (
          <Dashboard tasks={visibleTasks} onCreate={isManager?()=>setCreateOpen(true):undefined} openDrawer={openDrawer} canCreate={isManager}/>
        )}
        {view==="board" && (
          <Board tasks={visibleTasks} patch={patch} addEffort={addEffort} stopTimerAndLog={stopTimerAndLog} openDrawer={openDrawer} role={role} onRefresh={fetchTasks}/>
        )}
        {view==="admin" && isManager && (
          <Admin tasks={visibleTasks} openDrawer={openDrawer}/>
        )}
      </main>

      {openTask && (
        <Drawer
          task={openTask}
          tab={openTab}
          setTab={setOpenTab}
          onClose={() => setOpenId(null)}
          patch={patch}
          patchUpdate={patchUpdate}
          addEffort={addEffort}
          removeEffort={removeEffort}
          stopTimerAndLog={stopTimerAndLog}
          addComment={addComment}
          deleteTask={deleteTask}
          isManager={isManager}
          role={role}
        />
      )}

      {createOpen && (
        <CreateTaskModal
          tasks={visibleTasks}
          userTeam={isSuperAdmin ? (teamView === "All" ? "Content" : teamView) : userTeam}
          onClose={() => setCreateOpen(false)}
          onCreate={handleAddTask}
        />
      )}
    </div>
  );
}
