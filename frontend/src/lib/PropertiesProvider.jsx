/* ─── lib/PropertiesProvider.jsx ───
 * The property list, loaded from the backend (`properties` table in RDS).
 *
 * Replaced two things: the hardcoded PROPERTIES / CREATIVE_PROPERTIES arrays,
 * and the "custom properties" that were kept in each user's own browser
 * localStorage — which meant a property one manager added was invisible to
 * everybody else, and vanished when they cleared their browser.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "./api";

const FALLBACK_COLOR = "#7A8A80";

const PropertiesContext = createContext({
  properties: [], loading: true, reload: () => {},
  listFor: () => [], colorMapFor: () => ({}),
});

export function PropertiesProvider({ authed, children }) {
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const reload = useCallback(async () => {
    try {
      setProperties(await apiFetch("/api/properties"));
    } catch (err) {
      console.error("[properties] load failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => { if (!cancelled) await reload(); })();
    return () => { cancelled = true; };
  }, [authed, reload]);

  const value = useMemo(() => {
    const byTeam = (team) => properties.filter(p => p.team === team);
    return {
      properties,
      loading,
      reload,
      listFor:     (team) => byTeam(team).map(p => p.name),
      recordsFor:  (team) => byTeam(team),
      colorMapFor: (team) => Object.fromEntries(
        byTeam(team).map(p => [p.name, p.color || FALLBACK_COLOR])
      ),
    };
  }, [properties, loading, reload]);

  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
}

export const useProperties = () => useContext(PropertiesContext);
