/* ─── hooks/useAuth.js ─── */
import { useState, useEffect } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { setAuthToken } from "../lib/api";
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

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
});

function applyIdToken(idToken, setState) {
  const payload     = idToken.decodePayload();
  const email       = payload.email || "";
  const emailPrefix = email.split("@")[0].toLowerCase();
  const name        = USER_BY_EMAIL[emailPrefix] || payload.name || payload["cognito:username"] || emailPrefix;
  const derived     = deriveRoleAndTeam(emailPrefix);

  setAuthToken(idToken.getJwtToken());
  setState({ authed: true, currentUser: emailPrefix, displayName: name, role: derived.role, userTeam: derived.team });
}

const RESET_STATE = { authed: false, currentUser: CURRENT_USER, displayName: CURRENT_USER, role: "user", userTeam: "Content" };

export function useAuth() {
  const [state, setState] = useState(RESET_STATE);

  // Restore session from Cognito local storage on page load
  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return;
    cognitoUser.getSession((err, session) => {
      if (err || !session?.isValid()) return;
      applyIdToken(session.getIdToken(), setState);
    });
  }, []);

  // Called from Login.jsx
  const login = (email, password) =>
    new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(session) { applyIdToken(session.getIdToken(), setState); resolve(); },
        onFailure(err)     { reject(err); },
        newPasswordRequired() { reject(new Error("Password reset required — contact admin")); },
      });
    });

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    setAuthToken(null);
    setState(RESET_STATE);
  };

  return {
    ...state,
    setAuthed:      (v) => setState(s => ({ ...s, authed: v })),
    setCurrentUser: (v) => setState(s => ({ ...s, currentUser: v })),
    setDisplayName: (v) => setState(s => ({ ...s, displayName: v })),
    setRole:        (v) => setState(s => ({ ...s, role: v })),
    login,
    logout,
  };
}
