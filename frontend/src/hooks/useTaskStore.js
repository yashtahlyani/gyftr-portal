/* ─── hooks/useTaskStore.js ─── */
import { useState, useEffect, useCallback } from "react";
import { apiFetch, dbToTask, buildDbPatch } from "../lib/api";
import { todayISO } from "../utils";

export function useTaskStore(currentUser) {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch ── */
  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiFetch("/api/tasks");
      setTasks(data.map(dbToTask));
    } catch (err) {
      console.error("fetchTasks error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── patch (field-level update) — pass auditMsg to log the change ── */
  const patch = useCallback(async (id, updates, auditMsg) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, ...updates, updatedAt:"just now", updatedTs:Date.now() } : t));
    await apiFetch(`/api/tasks/${id}`, { method:"PATCH", body: JSON.stringify(buildDbPatch(updates)) });
    if (auditMsg && currentUser) {
      await apiFetch("/api/audit", { method:"POST", body: JSON.stringify({ task_id:id, action:auditMsg, by_user:currentUser }) });
    }
  }, [currentUser]);

  /* ── patchUpdate (description / files) ── */
  const patchUpdate = useCallback(async (id, updates) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, update:{...(t.update||{}),...updates}, updatedAt:"just now", updatedTs:Date.now() } : t));
    if (updates.description !== undefined) {
      await apiFetch(`/api/tasks/${id}`, { method:"PATCH", body: JSON.stringify({ description: updates.description }) });
    }
  }, []);

  /* ── Local effort cache — survives API outages ── */
  const EFFORT_CACHE = "gyftr_effort_log";
  const cacheEntry = (taskId, date, hours, status) => {
    try {
      const arr = JSON.parse(localStorage.getItem(EFFORT_CACHE) || "[]");
      arr.push({ task_id: taskId, date, hours, status, _at: Date.now() });
      localStorage.setItem(EFFORT_CACHE, JSON.stringify(arr.slice(-3000)));
    } catch(_) {}
  };

  /* ── addEffort ── */
  const addEffort = useCallback(async (id, entry) => {
    cacheEntry(id, entry.date, entry.hours, entry.status);
    setTasks(ts => ts.map(t => t.id===id ? { ...t, effort:[...(t.effort||[]),entry], updatedAt:"just now", updatedTs:Date.now() } : t));
    try {
      await apiFetch("/api/effort", { method:"POST", body: JSON.stringify({
        task_id: id, date: entry.date, status: entry.status,
        hours: entry.hours, manual: entry.manual || false,
      }) });
    } catch (err) {
      console.error("[useTaskStore] addEffort failed:", err.message);
    }
  }, []);

  /* ── stopTimerAndLog — stops timer + logs effort atomically to prevent race conditions ── */
  const stopTimerAndLog = useCallback(async (task, hours) => {
    const entry = { date: todayISO(), status: task.effortStatus, hours: Math.round(hours * 100) / 100 };
    cacheEntry(task.id, entry.date, entry.hours, entry.status);
    setTasks(ts => ts.map(t => t.id === task.id ? {
      ...t, running: false, startedAt: null,
      effort: [...(t.effort || []), entry],
      updatedAt: "just now", updatedTs: Date.now(),
    } : t));
    await apiFetch(`/api/tasks/${task.id}`, { method:"PATCH", body: JSON.stringify({ running: false, startedAt: null }) });
    try {
      await apiFetch("/api/effort", { method:"POST", body: JSON.stringify({
        task_id: task.id, date: entry.date, status: entry.status, hours: entry.hours, manual: false,
      }) });
    } catch (err) {
      console.error("[useTaskStore] effort insert failed:", err.message, "— hours saved to localStorage cache");
    }
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
    if (removedId) await apiFetch(`/api/effort/${removedId}`, { method:"DELETE" });
  }, []);

  /* ── addComment ── */
  const addComment = useCallback(async (id, body, role="Team") => {
    const now = new Date();
    const ts  = now.toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
    const c   = { a: currentUser, r: role, t: body, ts };
    setTasks(ts2 => ts2.map(t => t.id===id ? { ...t, comments:[...(t.comments||[]),c], updatedAt:"just now", updatedTs:Date.now() } : t));
    await apiFetch("/api/comments", { method:"POST", body: JSON.stringify({ task_id:id, author:currentUser, role, body }) });
  }, [currentUser]);

  /* ── addTask ── */
  const addTask = useCallback(async (f, { onSuccess, onError }) => {
    let id;
    try {
      const { nextId } = await apiFetch("/api/tasks/next-id");
      id = nextId;
    } catch {
      id = "MKT-" + String(tasks.reduce((m,t)=>Math.max(m,parseInt((t.id.split("-")[1])||"0",10)),0)+1).padStart(2,"0");
    }

    const uiTask = dbToTask({
      id, team: f.team || "Content", property: f.property, task: f.task?.trim(),
      type: f.type, owner: f.assignee || f.owner, business_owner: f.businessOwner,
      priority: f.priority, effort_status: "Discussion", project_status: "Discussion",
      lock_state: "unlocked", running: false, started_at: null,
      effort_entries: [], comments: [], audit_log: [], task_files: [],
      description: "", delivered: null,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });

    setTasks(ts => [uiTask, ...ts]);
    onSuccess(id);

    try {
      await apiFetch("/api/tasks", { method:"POST", body: JSON.stringify({
        id, team: f.team || "Content", property: f.property,
        task: f.task?.trim(), type: f.type,
        owner: f.assignee || f.owner, business_owner: f.businessOwner,
        priority: f.priority,
      }) });
      await apiFetch("/api/audit", { method:"POST", body: JSON.stringify([
        { task_id:id, action:"Created task",                         by_user:currentUser },
        { task_id:id, action:`Assigned to ${f.assignee||f.owner}`,  by_user:currentUser },
      ]) });
      fetchTasks();
    } catch (err) {
      console.error("Create task failed:", err.message);
      onError(err.message);
      setTasks(ts => ts.filter(t => t.id !== id));
    }
  }, [tasks, currentUser, fetchTasks]);

  /* ── deleteTask ── */
  const deleteTask = useCallback(async (id) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    await apiFetch(`/api/tasks/${id}`, { method:"DELETE" });
  }, []);

  return { tasks, setTasks, loading, fetchTasks, patch, patchUpdate, addEffort, removeEffort, stopTimerAndLog, addComment, addTask, deleteTask };
}
