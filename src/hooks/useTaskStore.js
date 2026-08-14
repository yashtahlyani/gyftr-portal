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
      // Any effort that failed to save earlier goes up first, so the tasks we
      // then read back already include it.
      await flushEffortQueue();
      const data = await apiFetch("/api/tasks");
      setTasks(data.map(dbToTask));
    } catch (err) {
      console.error("fetchTasks error:", err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── patch (field-level update) — pass auditMsg to log the change ──
     Optimistic, but the server now enforces who may change what, so a rejected
     edit has to be rolled back instead of leaving the UI showing a change that
     was never saved. */
  const patch = useCallback(async (id, updates, auditMsg) => {
    let previous = null;
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      previous = t;
      return { ...t, ...updates, updatedAt:"just now", updatedTs:Date.now() };
    }));
    try {
      await apiFetch(`/api/tasks/${id}`, { method:"PATCH", body: JSON.stringify(buildDbPatch(updates)) });
      if (auditMsg && currentUser) {
        await apiFetch("/api/audit", { method:"POST", body: JSON.stringify({ task_id:id, action:auditMsg }) });
      }
    } catch (err) {
      if (previous) setTasks(ts => ts.map(t => t.id===id ? previous : t));
      console.error("[useTaskStore] patch rejected:", err.message);
      alert(err.message);
    }
  }, [currentUser]);

  /* ── patchUpdate (description / files) ── */
  const patchUpdate = useCallback(async (id, updates) => {
    setTasks(ts => ts.map(t => t.id===id ? { ...t, update:{...(t.update||{}),...updates}, updatedAt:"just now", updatedTs:Date.now() } : t));
    if (updates.description !== undefined) {
      await apiFetch(`/api/tasks/${id}`, { method:"PATCH", body: JSON.stringify({ description: updates.description }) });
    }
  }, []);

  /* ── Retry queue for effort writes that failed to reach the API ──
     Only FAILED writes are queued, and each is removed once it lands. It used
     to log every entry and never replay any of them, so a deleted entry stayed
     in the browser forever and kept inflating that device's dashboard. */
  const EFFORT_QUEUE = "gyftr_effort_queue";

  const readQueue = () => {
    try { return JSON.parse(localStorage.getItem(EFFORT_QUEUE) || "[]"); }
    catch { return []; }
  };
  const writeQueue = (arr) => {
    try { localStorage.setItem(EFFORT_QUEUE, JSON.stringify(arr.slice(-500))); }
    catch { /* storage full or blocked — nothing useful to do */ }
  };
  const enqueueEffort = (entry) => writeQueue([...readQueue(), { ...entry, _at: Date.now() }]);

  const flushEffortQueue = useCallback(async () => {
    const queued = readQueue();
    if (!queued.length) return;
    const stillFailing = [];
    for (const e of queued) {
      try {
        await apiFetch("/api/effort", { method: "POST", body: JSON.stringify(e) });
      } catch {
        stillFailing.push(e);
      }
    }
    writeQueue(stillFailing);
    if (stillFailing.length < queued.length) {
      console.info(`[useTaskStore] replayed ${queued.length - stillFailing.length} queued effort entr(ies)`);
    }
  }, []);

  /* ── addEffort ── */
  const addEffort = useCallback(async (id, entry) => {
    const payload = {
      task_id: id, date: entry.date, status: entry.status,
      hours: entry.hours, manual: entry.manual || false,
    };
    setTasks(ts => ts.map(t => t.id===id ? { ...t, effort:[...(t.effort||[]),entry], updatedAt:"just now", updatedTs:Date.now() } : t));
    try {
      await apiFetch("/api/effort", { method:"POST", body: JSON.stringify(payload) });
    } catch (err) {
      enqueueEffort(payload);   // replayed on the next successful refresh
      console.error("[useTaskStore] addEffort failed, queued for retry:", err.message);
    }
  }, []);

  /* ── stopTimerAndLog — stops timer + logs effort atomically to prevent race conditions ── */
  const stopTimerAndLog = useCallback(async (task, hours) => {
    const entry = { date: todayISO(), status: task.effortStatus, hours: Math.round(hours * 100) / 100 };
    setTasks(ts => ts.map(t => t.id === task.id ? {
      ...t, running: false, startedAt: null,
      effort: [...(t.effort || []), entry],
      updatedAt: "just now", updatedTs: Date.now(),
    } : t));
    const payload = {
      task_id: task.id, date: entry.date, status: entry.status, hours: entry.hours, manual: false,
    };
    await apiFetch(`/api/tasks/${task.id}`, { method:"PATCH", body: JSON.stringify({ running: false, startedAt: null }) });
    try {
      await apiFetch("/api/effort", { method:"POST", body: JSON.stringify(payload) });
    } catch (err) {
      enqueueEffort(payload);   // hours are not lost — replayed on next refresh
      console.error("[useTaskStore] effort insert failed, queued for retry:", err.message);
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
    try {
      await apiFetch("/api/comments", { method:"POST", body: JSON.stringify({ task_id:id, role, body }) });
    } catch (err) {
      setTasks(ts2 => ts2.map(t => t.id===id ? { ...t, comments:(t.comments||[]).filter(x => x !== c) } : t));
      console.error("[useTaskStore] comment rejected:", err.message);
      alert(err.message);
    }
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
      // by_user is taken from the verified token server-side, not sent here.
      await apiFetch("/api/audit", { method:"POST", body: JSON.stringify([
        { task_id:id, action:"Created task" },
        { task_id:id, action:`Assigned to ${f.assignee||f.owner}` },
      ]) });
      fetchTasks();
    } catch (err) {
      console.error("Create task failed:", err.message);
      onError(err.message);
      setTasks(ts => ts.filter(t => t.id !== id));
    }
  }, [tasks, fetchTasks]);

  /* ── deleteTask ── */
  const deleteTask = useCallback(async (id) => {
    let removed = null;
    setTasks(ts => { removed = ts.find(t => t.id === id) || null; return ts.filter(t => t.id !== id); });
    try {
      await apiFetch(`/api/tasks/${id}`, { method:"DELETE" });
    } catch (err) {
      if (removed) setTasks(ts => [removed, ...ts]);
      console.error("[useTaskStore] delete rejected:", err.message);
      alert(err.message);
    }
  }, []);

  return { tasks, setTasks, loading, fetchTasks, patch, patchUpdate, addEffort, removeEffort, stopTimerAndLog, addComment, addTask, deleteTask };
}
