/* ─── hooks/useTaskStore.js ─── */
import { useState, useEffect, useCallback } from "react";
import { supabase, dbToTask, taskToDb, buildDbPatch } from "../lib/supabase";
import { TODAY_ISO, fmtDate } from "../utils";

export function useTaskStore(currentUser) {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch ── */
  const fetchTasks = useCallback(async () => {
    if (!supabase) { setTasks([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("tasks")
      .select("*, effort_entries(*), comments(*), audit_log(*), task_files(*)")
      .order("updated_at", { ascending: false });
    if (!error && data) setTasks(data.map(dbToTask));
    setLoading(false);
  }, []);

  /* ── Real-time subscription ── */
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase.channel("tasks-live")
      .on("postgres_changes", { event:"*", schema:"public", table:"tasks"          }, fetchTasks)
      .on("postgres_changes", { event:"*", schema:"public", table:"effort_entries" }, fetchTasks)
      .on("postgres_changes", { event:"*", schema:"public", table:"comments"       }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchTasks]);

  /* ── patch (field-level update) ── */
  const patch = useCallback(async (id, updates) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, ...updates, updatedAt:"just now", updatedTs:Date.now() } : t));
    if (!supabase) return;
    const dbPatch = buildDbPatch(updates);
    await supabase.from("tasks").update(dbPatch).eq("id", id);
  }, []);

  /* ── patchUpdate (description / files) ── */
  const patchUpdate = useCallback(async (id, updates) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, update:{...(t.update||{}),...updates}, updatedAt:"just now", updatedTs:Date.now() } : t));
    if (!supabase) return;
    if (updates.description !== undefined)
      await supabase.from("tasks").update({ description: updates.description }).eq("id", id);
  }, []);

  /* ── addEffort ── */
  const addEffort = useCallback(async (id, entry) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, effort:[...(t.effort||[]),entry], updatedAt:"just now", updatedTs:Date.now() } : t));
    if (!supabase) return;
    await supabase.from("effort_entries").insert({
      task_id: id, date: entry.date, status: entry.status,
      hours: entry.hours, manual: entry.manual || false,
    });
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, []);

  /* ── removeEffort ── */
  const removeEffort = useCallback(async (id, idx) => {
    let removedId = null;
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      const entry = (t.effort||[])[idx];
      if (entry?._id) removedId = entry._id;
      return { ...t, effort:(t.effort||[]).filter((_,i)=>i!==idx), updatedAt:"just now", updatedTs:Date.now() };
    }));
    if (!supabase) return;
    if (removedId) await supabase.from("effort_entries").delete().eq("id", removedId);
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, []);

  /* ── addComment ── */
  const addComment = useCallback(async (id, body) => {
    const c = { a: currentUser, r:"Team", t: body, ts: fmtDate(TODAY_ISO)+", now" };
    setTasks(ts => ts.map(t => t.id===id ? { ...t, comments:[...(t.comments||[]),c], updatedAt:"just now", updatedTs:Date.now() } : t));
    if (!supabase) return;
    await supabase.from("comments").insert({ task_id:id, author:currentUser, role:"Team", body });
    await supabase.from("tasks").update({ updated_at: new Date() }).eq("id", id);
  }, [currentUser]);

  /* ── addTask ── */
  const addTask = useCallback(async (f, { onSuccess, onError }) => {
    // Generate next ID
    let id;
    if (!supabase) {
      id = "MKT-" + String(tasks.reduce((m,t)=>Math.max(m,parseInt((t.id.split("-")[1])||"0",10)),0)+1).padStart(2,"0");
    } else {
      const { data } = await supabase.from("tasks").select("id");
      const maxNum   = data?.length ? Math.max(...data.map(t=>parseInt(t.id.split("-")[1]||"0",10))) : 0;
      id = "MKT-" + String(maxNum+1).padStart(2,"0");
    }

    const dbRow  = taskToDb(f, id);
    const uiTask = dbToTask({
      ...dbRow, business_owner: f.businessOwner,
      effort_status: "Discussion", project_status: "Discussion",
      lock_state: "unlocked", running: false, started_at: null,
      effort_entries: [], comments: [], audit_log: [], task_files: [],
      description: "", delivered: null,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });

    setTasks(ts => [uiTask, ...ts]);
    onSuccess(id);

    if (!supabase) return;
    const { error } = await supabase.from("tasks").insert(dbRow);
    if (error) {
      console.error("Create task failed:", error.message);
      onError(error.message);
      setTasks(ts => ts.filter(t => t.id !== id));
      return;
    }
    await supabase.from("audit_log").insert([
      { task_id:id, action:"Created task", by_user:currentUser },
      { task_id:id, action:`Assigned to ${f.assignee||f.owner}`, by_user:currentUser },
    ]);
    fetchTasks();
  }, [tasks, currentUser, fetchTasks]);

  return { tasks, setTasks, loading, fetchTasks, patch, patchUpdate, addEffort, removeEffort, addComment, addTask };
}
