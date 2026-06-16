/* ─── hooks/useAuth.js ─── */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CURRENT_USER } from "../constants";

export function useAuth() {
  const [authed,      setAuthed]      = useState(false);
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);
  const [displayName, setDisplayName] = useState(CURRENT_USER);
  const [role,        setRole]        = useState("user");

  const applySession = async (session) => {
    if (!session) { setAuthed(false); setRole("user"); setDisplayName(CURRENT_USER); return; }
    const authName = session.user.email?.split("@")[0] || CURRENT_USER;
    setAuthed(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, name, full_name")
      .eq("id", session.user.id)
      .single();
    const name = session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || profileData?.name
              || profileData?.full_name
              || authName;
 const userRole = profileData?.role || (["deepankar.h", "anirudh.motwani", "yash.tahlyani"].includes(authName.toLowerCase()) ? "manager" : "user");
    setRole(userRole);
    setCurrentUser(authName);
    setDisplayName(name);
  };

  useEffect(() => {
    if (!supabase) { setAuthed(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) applySession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      applySession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthed(false);
  };

  return { authed, setAuthed, currentUser, setCurrentUser, displayName, setDisplayName, role, setRole, logout };
}
