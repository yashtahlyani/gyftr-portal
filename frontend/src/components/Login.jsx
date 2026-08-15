/* ─── components/Login.jsx ─── */
import { useState } from "react";
import { STYLES } from "../lib/styles";
import { GyftrLogo } from "./ui/GyftrLogo";

/* Cognito's own wording is terse and sometimes misleading — "User does not
   exist" for a typo'd address, and a raw network error when the API behind
   sign-in is what actually failed. Translate the ones people hit. */
function friendlyAuthError(err) {
  const raw = err?.message || "Sign in failed";
  const m = raw.toLowerCase();
  if (m.includes("incorrect username or password") || m.includes("not authorized")) {
    return "Incorrect email or password.";
  }
  if (m.includes("user does not exist")) {
    return "No account for that email. Check the address, or contact an admin.";
  }
  if (m.includes("password attempts exceeded")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (m.includes("did not respond") || m.includes("could not reach the server")) {
    return raw;   // already names the URL and the failure mode
  }
  return raw;
}

/* Mirrors the Cognito user pool password policy. Kept in step with it so the
   user is told what is wrong before the request round-trips. */
const RULES = [
  { label: "At least 8 characters",   test: (p) => p.length >= 8 },
  { label: "One uppercase letter",    test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",    test: (p) => /[a-z]/.test(p) },
  { label: "One number",              test: (p) => /[0-9]/.test(p) },
  { label: "One symbol",              test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/* A password field the user can reveal. Several people reported being "unable
   to enter the password": the fields had no autocomplete hints and were not
   inside a <form>, so Chrome's password manager treated them as a login form,
   offered its generated password over the top, and fought whatever was typed.
   Proper hints plus a real form stop that, and being able to see the value
   removes the remaining doubt. */
function PasswordField({ label, value, onChange, name, autoComplete, autoFocus, onEnter }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <label htmlFor={name} style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>{label}</label>
        <span onClick={() => setShown(v => !v)}
          style={{ fontSize:11, fontWeight:700, color:"var(--pop)", cursor:"pointer", userSelect:"none" }}>
          {shown ? "Hide" : "Show"}
        </span>
      </div>
      <input
        className="gx-input"
        style={{ margin:"6px 0 14px" }}
        id={name}
        name={name}
        type={shown ? "text" : "password"}
        value={value}
        placeholder="••••••••"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
      />
    </>
  );
}

const Shell = ({ children }) => (
  <div className="gx-root" style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"radial-gradient(120% 120% at 80% 0%, #E9F4D5 0%, #F3F6F2 42%)" }}>
    <style>{STYLES}</style>
    <div className="gx-fade" style={{ width:380, maxWidth:"92vw" }}>
      <div style={{ marginBottom:26 }}>
        <GyftrLogo fs={28}/>
        <div style={{ fontSize:11.5, color:"var(--ink-soft)", fontWeight:600, marginTop:8, paddingLeft:2 }}>
          Creative &amp; Content Work Portal
        </div>
      </div>
      {children}
    </div>
  </div>
);

/* ── Step 2: first login / after a reset — set a new password ── */
function SetPassword({ email, completeNewPassword, onCancel }) {
  const [p1, setP1]         = useState("");
  const [p2, setP2]         = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(false);

  const failed   = RULES.filter(r => !r.test(p1));
  const mismatch = p2.length > 0 && p1 !== p2;
  const ready    = failed.length === 0 && p1 === p2 && p2.length > 0;

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!ready || loading) return;
    setErr(""); setLoad(true);
    try {
      await completeNewPassword(p1);
    } catch (e) {
      setErr(friendlyAuthError(e));
    } finally {
      setLoad(false);
    }
  };

  return (
    <Shell>
      <div className="gx-card" style={{ padding:26 }}>
        <h1 className="gx-disp" style={{ fontSize:23, fontWeight:700, margin:"0 0 4px" }}>Set a new password</h1>
        <p style={{ fontSize:13.5, color:"var(--ink-soft)", margin:"0 0 20px" }}>
          Your account is on a temporary password. Choose your own to continue
          {email ? <> as <b style={{ color:"var(--ink)" }}>{email}</b></> : null}.
        </p>

        <form onSubmit={submit}>
        {/* Hidden, but it tells the password manager which account the new
            password belongs to. Without it Chrome may save it against the
            wrong entry, or refuse to offer to save it at all. */}
        <input type="text" name="username" autoComplete="username" value={email || ""}
          readOnly hidden aria-hidden="true"/>

        <PasswordField label="New password" name="new-password" autoComplete="new-password"
          value={p1} onChange={setP1} autoFocus onEnter={submit}/>

        <PasswordField label="Confirm new password" name="confirm-password" autoComplete="new-password"
          value={p2} onChange={setP2} onEnter={submit}/>

        <div style={{ marginBottom:14 }}>
          {RULES.map(r => {
            const ok = r.test(p1);
            return (
              <div key={r.label} style={{ fontSize:11.5, fontWeight:600, display:"flex", alignItems:"center", gap:6, marginBottom:3, color: ok ? "#15803D" : "var(--ink-soft)" }}>
                <span style={{ width:13, display:"inline-block" }}>{ok ? "✓" : "•"}</span>{r.label}
              </div>
            );
          })}
          {mismatch && (
            <div style={{ fontSize:11.5, fontWeight:600, color:"#C42424", marginTop:5 }}>
              Both passwords must match
            </div>
          )}
        </div>

        {err && <div style={{ fontSize:12, color:"#C42424", marginBottom:10, fontWeight:600 }}>{err}</div>}

        <button type="submit" className="gx-btn gx-btn-dark" disabled={!ready || loading}
          style={{ width:"100%", justifyContent:"center", padding:"11px", opacity:(!ready||loading)?.5:1 }}>
          {loading ? "Saving…" : "Set password & sign in"}
        </button>
        </form>

        <div style={{ textAlign:"center", marginTop:14 }}>
          <span onClick={onCancel} style={{ fontSize:12.5, fontWeight:600, color:"var(--ink-soft)", cursor:"pointer" }}>
            Back to sign in
          </span>
        </div>
      </div>
    </Shell>
  );
}

/* ── Step 1: sign in ── */
export function Login({ onIn, login, completeNewPassword, cancelPasswordChange, mustChangePassword, configError }) {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (e) => {
    if (e) e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await login(email, pass);
      // A temporary password stops here — SetPassword takes over.
      if (!res?.mustChangePassword) onIn();
    } catch (e) {
      setErr(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  // Misconfigured build: say so plainly rather than letting people fail login
  // attempts against a pool that was never wired up.
  if (configError) {
    return (
      <Shell>
        <div className="gx-card" style={{ padding:26 }}>
          <h1 className="gx-disp" style={{ fontSize:21, fontWeight:700, margin:"0 0 8px" }}>Portal is not configured</h1>
          <p style={{ fontSize:13.5, color:"var(--ink-soft)", margin:"0 0 14px" }}>{configError}</p>
          <p style={{ fontSize:12.5, color:"var(--ink-soft)", margin:0 }}>
            Signing in is not possible until the frontend is rebuilt. Please send
            this message to whoever deployed it.
          </p>
        </div>
      </Shell>
    );
  }

  if (mustChangePassword) {
    return (
      <SetPassword
        email={email}
        completeNewPassword={completeNewPassword}
        onCancel={() => { cancelPasswordChange(); setPass(""); }}
      />
    );
  }

  return (
    <Shell>
      <div className="gx-card" style={{ padding:26 }}>
        <h1 className="gx-disp" style={{ fontSize:23, fontWeight:700, margin:"0 0 4px" }}>Welcome back</h1>
        <p style={{ fontSize:13.5, color:"var(--ink-soft)", margin:"0 0 22px" }}>
          Track every piece of content &amp; creative work and the effort behind it.
        </p>
        <form onSubmit={signIn}>
        <label htmlFor="username" style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Company email</label>
        <input className="gx-input" style={{ margin:"6px 0 14px" }} type="email"
          id="username" name="username" autoComplete="username" value={email}
          placeholder="enter your email address"
          onChange={e=>setEmail(e.target.value)}/>

        <PasswordField label="Password" name="current-password" autoComplete="current-password"
          value={pass} onChange={setPass} onEnter={signIn}/>
        {err && <div style={{ fontSize:12, color:"#C42424", marginBottom:10, fontWeight:600 }}>{err}</div>}
        <button type="submit" className="gx-btn gx-btn-dark" disabled={loading}
          style={{ width:"100%", justifyContent:"center", padding:"11px", opacity:loading?.6:1 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        </form>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, fontSize:12.5, fontWeight:600 }}>
          <span style={{ color:"var(--ink-soft)" }}>GyFTR staff only</span>
          <span style={{ color:"var(--ink-soft)" }}>Contact GyFTR admin to reset</span>
        </div>
      </div>
    </Shell>
  );
}
