/* ─── App.jsx (main shell) ─── */
import React, { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, Table2, Settings, Plus, LogOut } from "lucide-react";

import { STYLES }          from "./lib/styles";
import { TEAM_OF }         from "./constants";

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
  const { authed, setAuthed, currentUser, setCurrentUser, displayName, setDisplayName, role, setRole, logout } = useAuth();
  const [view,       setView]       = useState("board");
  const [openId,     setOpenId]     = useState(null);
  const [openTab,    setOpenTab]    = useState("Update");
  const [createOpen, setCreateOpen] = useState(false);

  const { tasks, loading, fetchTasks, patch, patchUpdate, addEffort, removeEffort, addComment, addTask } = useTaskStore(currentUser);

  useEffect(() => { if (authed) fetchTasks(); }, [authed, fetchTasks]);

  const isManager    = role === "manager";
  const visibleTasks = useMemo(() => {
    if (isManager) return tasks;
    return tasks.filter(t => t.owner?.toLowerCase() === displayName?.toLowerCase());
  }, [isManager, tasks, displayName]);

  useEffect(() => { if (!isManager && view==="admin") setView("dashboard"); }, [isManager, view]);

  const openTask   = tasks.find(t => t.id===openId) || null;
  const openDrawer = (id, tab="Update") => { setOpenId(id); setOpenTab(tab); };

  const handleAddTask = (f) => {
    addTask(f, {
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
          Loading tasks from Supabase…
        </div>
      </div>
    );
  }

  return (
    <div className="gx-root" style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{STYLES}</style>

      {/* Header */}
      <header style={{ flex:"none", height:58, borderBottom:"1px solid var(--line)", background:"var(--surface)", display:"flex", alignItems:"center", gap:18, padding:"0 24px" }}>
        <GyftrLogo fs={20}/>
        <span style={{ width:1, height:24, background:"var(--line)", margin:"0 2px" }}/>
        <nav style={{ display:"flex", alignItems:"center", gap:4 }}>
          {NAV.filter(n => n.k!=="admin" || isManager).map(({ k, label, Icon }) => (
            <div key={k} className={"gx-navitem"+(view===k?" on":"")} onClick={()=>setView(k)}>
              <Icon size={16}/> {label}
            </div>
          ))}
        </nav>
        {isManager && (
          <button className="gx-btn gx-btn-dark" style={{ marginLeft:"auto" }} onClick={()=>setCreateOpen(true)}>
            <Plus size={16}/> Create task
          </button>
        )}
        <span style={{ width:1, height:24, background:"var(--line)" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Avatar name={displayName} size={30}/>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.1 }}>{displayName}</div>
            <div style={{ fontSize:10.5, color:"var(--ink-soft)" }}>
              {TEAM_OF[displayName] || TEAM_OF[currentUser] || "Team"} · {isManager ? "Manager" : "Employee"}
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
          <Board tasks={visibleTasks} patch={patch} addEffort={addEffort} openDrawer={openDrawer} role={role}/>
        )}
        {view==="admin" && isManager && (
          <Admin tasks={tasks} openDrawer={openDrawer}/>
        )}
      </main>

      {/* Drawer — passes isManager so it knows what to show/hide */}
      {openTask && (
        <Drawer
          task={openTask}
          tab={openTab}
          setTab={setOpenTab}
          onClose={()=>setOpenId(null)}
          patch={patch}
          patchUpdate={patchUpdate}
          addEffort={addEffort}
          removeEffort={removeEffort}
          addComment={addComment}
          isManager={isManager}
        />
      )}

      {createOpen && (
        <CreateTaskModal tasks={tasks} onClose={()=>setCreateOpen(false)} onCreate={handleAddTask}/>
      )}
    </div>
  );
}
