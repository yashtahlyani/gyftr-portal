/* ─── App.jsx (main shell) ─── */
import React, { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, Table2, Settings, Plus, LogOut } from "lucide-react";

import { STYLES }          from "./lib/styles";
import { DirectoryProvider } from "./lib/DirectoryProvider";
import { PropertiesProvider } from "./lib/PropertiesProvider";

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
  const { authed, setAuthed, currentUser, displayName, role, userTeam, profileError,
          login, logout, completeNewPassword, cancelPasswordChange, mustChangePassword } = useAuth();
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

  // The backend already scopes /api/tasks to what this user may see
  // (backend/routes/tasks.js → visibilityFilter). The only filtering left here
  // is the super-admin team switcher.
  //
  // Regular members are deliberately NOT team-filtered: a task assigned to you
  // is yours to see even if the row's `team` is stale or wrong. Team-gating
  // here is what hid Creative tasks from their own assignees.
  const visibleTasks = useMemo(() => {
    if (!isManager) return tasks;
    if (isSuperAdmin && teamView === "All") return tasks;
    return tasks.filter(t => (t.team || "Content") === activeTeam);
  }, [isSuperAdmin, isManager, tasks, teamView, activeTeam]);

  useEffect(() => { if (!isManager && view === "admin") setView("dashboard"); }, [isManager, view]);

  const openTask   = tasks.find(t => t.id === openId) || null;
  const openDrawer = (id, tab = "Update") => { setOpenId(id); setOpenTab(tab); };

  const handleAddTask = (f) => {
    // Team hint only — the backend re-derives it from the assignee's profile
    // so a task can never land on a team its assignee cannot see.
    const taskWithTeam = { ...f, team: isSuperAdmin ? teamView === "All" ? "Content" : teamView : userTeam };
    addTask(taskWithTeam, {
      onSuccess: (id) => { setCreateOpen(false); setView("board"); setOpenId(id); setOpenTab("Update"); },
      onError:   (msg) => { alert("Could not save task: " + msg); setCreateOpen(true); },
    });
  };

  if (!authed) {
    return (
      <Login
        login={login}
        onIn={() => setAuthed(true)}
        mustChangePassword={mustChangePassword}
        completeNewPassword={completeNewPassword}
        cancelPasswordChange={cancelPasswordChange}
      />
    );
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

  const teamLabel = isSuperAdmin ? "Admin" : userTeam;

  return (
    <DirectoryProvider authed={authed}>
    <PropertiesProvider authed={authed}>
    <div className="gx-root" style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{STYLES}</style>

      {profileError && (
        <div style={{ flex:"none", padding:"7px 24px", background:"#FBE0EC", color:"#B01457", fontSize:12.5, fontWeight:600 }}>
          Could not load your profile from the server ({profileError}) — showing limited access. Reload or contact admin.
        </div>
      )}

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
              {teamLabel} · {isSuperAdmin ? "Super Admin" : isManager ? "Admin" : "Employee"}
            </div>
          </div>
          <LogOut size={16} style={{ color:"#94a59b", cursor:"pointer", marginLeft:2 }} onClick={logout}/>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--paper)" }}>
        {view==="dashboard" && (
          <Dashboard key={activeTeam} tasks={visibleTasks} onCreate={isManager?()=>setCreateOpen(true):undefined} openDrawer={openDrawer} canCreate={isManager} userTeam={activeTeam === "All" ? "Content" : activeTeam}/>
        )}
        {view==="board" && (
          <Board tasks={visibleTasks} patch={patch} addEffort={addEffort} stopTimerAndLog={stopTimerAndLog} openDrawer={openDrawer} role={role} onRefresh={fetchTasks} userTeam={activeTeam === "All" ? "Content" : activeTeam}/>
        )}
        {view==="admin" && isManager && (
          <Admin tasks={visibleTasks} openDrawer={openDrawer} role={role} userTeam={activeTeam === "All" ? "Content" : activeTeam}/>
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
    </PropertiesProvider>
    </DirectoryProvider>
  );
}
