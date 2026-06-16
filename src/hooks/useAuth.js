/* ─── hooks/useAuth.js ─── */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CURRENT_USER, USER_BY_EMAIL } from "../constants";

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
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();
    const name = profileData?.full_name
              || USER_BY_EMAIL[authName.toLowerCase()]
              || session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
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
    setRole("user");
    setCurrentUser(CURRENT_USER);
    setDisplayName(CURRENT_USER);
  };

  return { authed, setAuthed, currentUser, setCurrentUser, displayName, setDisplayName, role, setRole, logout };
}
