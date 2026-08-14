/* ─── lib/DirectoryProvider.jsx ───
 * React access to the team directory. See ./directory.js for the data itself.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "./api";
import { setDirectory, ownersOf, bizOwnersOf, teamOfName, colorOfName } from "./directory";

const DirectoryContext = createContext({
  users: [], loading: true, reload: () => {},
  ownersFor: () => [], bizOwnersFor: () => [],
  teamOfName, colorOfName,
});

export function DirectoryProvider({ authed, children }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await apiFetch("/api/users");
      setDirectory(data);      // keep the module-level snapshot in sync
      setUsers(data);
    } catch (err) {
      console.error("[directory] load failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    // Guarded so the fetch resolves into state only while still mounted.
    (async () => { if (!cancelled) await reload(); })();
    return () => { cancelled = true; };
  }, [authed, reload]);

  const value = useMemo(() => {
    const active = users.filter(u => u.active !== false);
    return {
      users: active,
      loading,
      reload,
      ownersFor:    (team) => ownersOf(active, team),
      bizOwnersFor: (team) => bizOwnersOf(active, team),
      teamOfName,
      colorOfName,
    };
  }, [users, loading, reload]);

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export const useDirectory = () => useContext(DirectoryContext);
