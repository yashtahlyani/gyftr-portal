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

  const submit = async () => {
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

        <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>New password</label>
        <input className="gx-input" style={{ margin:"6px 0 14px" }} type="password" value={p1}
          placeholder="••••••••" autoFocus
          onChange={e=>setP1(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>

        <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Confirm new password</label>
        <input className="gx-input" style={{ margin:"6px 0 14px" }} type="password" value={p2}
          placeholder="••••••••"
          onChange={e=>setP2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>

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

        <button className="gx-btn gx-btn-dark" disabled={!ready || loading}
          style={{ width:"100%", justifyContent:"center", padding:"11px", opacity:(!ready||loading)?.5:1 }}
          onClick={submit}>
          {loading ? "Saving…" : "Set password & sign in"}
        </button>

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
export function Login({ onIn, login, completeNewPassword, cancelPasswordChange, mustChangePassword }) {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
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
        <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Company email</label>
        <input className="gx-input" style={{ margin:"6px 0 14px" }} type="email" value={email}
          placeholder="enter your email address"
          onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/>
        <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-soft)" }}>Password</label>
        <input className="gx-input" type="password" placeholder="••••••••" style={{ margin:"6px 0 18px" }}
          value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/>
        {err && <div style={{ fontSize:12, color:"#C42424", marginBottom:10, fontWeight:600 }}>{err}</div>}
        <button className="gx-btn gx-btn-dark" disabled={loading}
          style={{ width:"100%", justifyContent:"center", padding:"11px", opacity:loading?.6:1 }}
          onClick={signIn}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, fontSize:12.5, fontWeight:600 }}>
          <span style={{ color:"var(--ink-soft)" }}>GyFTR staff only</span>
          <span style={{ color:"var(--ink-soft)" }}>Contact GyFTR admin to reset</span>
        </div>
      </div>
    </Shell>
  );
}
