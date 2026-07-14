/* ─── hooks/useAuth.js ─── */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CURRENT_USER, USER_BY_EMAIL } from "../constants";

// Role hierarchy:
//   super_admin  → Anirudh, Yash — see ALL tasks from both teams, team switcher
//   manager      → Deepankar (Content) or Ajay Kumar (Creative) — see own team only
//   user         → everyone else — see only their assigned tasks in own team

const SUPER_ADMIN_EMAILS  = ["anirudh.motwani", "yash.tahlyani", "ceo.office"];
const CONTENT_MGR_EMAILS  = ["deepankar.h"];
const CREATIVE_MGR_EMAILS = ["ajay.k"];
const CREATIVE_EMAILS     = new Set(["ajay.k","ashutosh.j","sunil.d","amit.c","shervir","deepak.verma","amit.bhattacharjee","ashish.t"]);

function deriveRoleAndTeam(emailPrefix) {
  const e = emailPrefix.toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(e))  return { role: "super_admin", team: null };
  if (CONTENT_MGR_EMAILS.includes(e))  return { role: "manager",     team: "Content"  };
  if (CREATIVE_MGR_EMAILS.includes(e)) return { role: "manager",     team: "Creative" };
  if (CREATIVE_EMAILS.has(e))          return { role: "user",        team: "Creative" };
  return                                      { role: "user",        team: "Content"  };
}

export function useAuth() {
  const [authed,      setAuthed]      = useState(false);
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);
  const [displayName, setDisplayName] = useState(CURRENT_USER);
  const [role,        setRole]        = useState("user");
  const [userTeam,    setUserTeam]    = useState("Content");

  const applySession = async (session) => {
    if (!session) { setAuthed(false); setRole("user"); setUserTeam("Content"); setDisplayName(CURRENT_USER); return; }
    const emailPrefix = session.user.email?.split("@")[0] || "";
    setAuthed(true);

    // Profile overrides (role stored in DB beats hardcoded list)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();

    const name = profileData?.full_name
              || USER_BY_EMAIL[emailPrefix.toLowerCase()]
              || session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || emailPrefix;

    const derived = deriveRoleAndTeam(emailPrefix);
    // profiles.role can upgrade to super_admin but we trust our hardcoded list for team
    const finalRole = profileData?.role === "super_admin" ? "super_admin" : derived.role;

    setRole(finalRole);
    setUserTeam(derived.team);
    setCurrentUser(emailPrefix);
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
    setUserTeam("Content");
    setCurrentUser(CURRENT_USER);
    setDisplayName(CURRENT_USER);
  };

  return { authed, setAuthed, currentUser, setCurrentUser, displayName, setDisplayName, role, setRole, userTeam, logout };
}
