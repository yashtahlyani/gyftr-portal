/* ─── hooks/useAuth.js ─── */
import { useState, useEffect, useCallback } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { setAuthToken, apiFetch } from "../lib/api";

// Cognito authenticates. The backend `users` table decides name, role and team
// (see backend/identity.js). Nothing about the roster lives in this file — a
// new team member is added in Cognito and appears here with no code change.
//
// Role hierarchy:
//   super_admin  → sees ALL tasks from both teams, team switcher, directory admin
//   manager      → sees their own team's tasks
//   user         → sees the tasks assigned to them, on any team

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
});

const RESET_STATE = {
  authed: false, email: "", currentUser: "", displayName: "",
  role: "user", userTeam: "Content", profileError: null,
};

export function useAuth() {
  const [state, setState] = useState(RESET_STATE);
  // Set when Cognito answers a login with NEW_PASSWORD_REQUIRED — the account
  // is on a temporary password and cannot proceed until it is changed.
  const [pendingChallenge, setPendingChallenge] = useState(null);

  // Exchange a valid Cognito session for the directory profile.
  const loadProfile = useCallback(async (idToken) => {
    setAuthToken(idToken.getJwtToken());
    const claims = idToken.decodePayload();
    const email  = (claims.email || "").toLowerCase();
    try {
      const me = await apiFetch("/api/users/me");
      setState({
        authed: true,
        email:        me.email,
        currentUser:  me.email.split("@")[0],
        displayName:  me.name,
        role:         me.role,
        userTeam:     me.team,
        profileError: null,
      });
    } catch (err) {
      // Signed in, but the directory is unreachable. Fail closed to the least
      // privileged role rather than guessing from the email address.
      console.error("[useAuth] profile load failed:", err.message);
      setState({
        authed: true,
        email,
        currentUser:  email.split("@")[0],
        displayName:  claims.name || email.split("@")[0],
        role:         "user",
        userTeam:     "Content",
        profileError: err.message,
      });
    }
  }, []);

  // Restore session from Cognito local storage on page load
  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return;
    cognitoUser.getSession((err, session) => {
      if (err || !session?.isValid()) return;
      loadProfile(session.getIdToken());
    });
  }, [loadProfile]);

  // Called from Login.jsx.
  // Resolves { mustChangePassword: true } instead of signing in when the
  // account is still on a temporary password.
  const login = (email, password) =>
    new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(session) {
          setPendingChallenge(null);
          loadProfile(session.getIdToken()).then(() => resolve({ mustChangePassword: false }), reject);
        },
        onFailure(err) { reject(err); },
        newPasswordRequired(userAttributes) {
          // Cognito rejects already-set / non-writable attrs on this challenge.
          // Passing `email` again → "Cannot modify an already provided email".
          delete userAttributes.email;
          delete userAttributes.email_verified;
          delete userAttributes.email_address;
          delete userAttributes.phone_number_verified;
          setPendingChallenge({ cognitoUser, userAttributes });
          resolve({ mustChangePassword: true });
        },
      });
    });

  // Second step of a first-time / reset login: set the new permanent password.
  const completeNewPassword = (newPassword) =>
    new Promise((resolve, reject) => {
      if (!pendingChallenge) return reject(new Error("No password change is pending — sign in again"));
      const { cognitoUser, userAttributes } = pendingChallenge;
      cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
        onSuccess(session) {
          setPendingChallenge(null);
          loadProfile(session.getIdToken()).then(resolve, reject);
        },
        onFailure(err) { reject(err); },
      });
    });

  const cancelPasswordChange = () => setPendingChallenge(null);

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    setAuthToken(null);
    setPendingChallenge(null);
    setState(RESET_STATE);
  };

  return {
    ...state,
    mustChangePassword: !!pendingChallenge,
    setAuthed: (v) => setState(s => ({ ...s, authed: v })),
    login,
    completeNewPassword,
    cancelPasswordChange,
    logout,
  };
}
