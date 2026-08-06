/* ─── components/Login.jsx ─── */
import React, { useState } from "react";
import { STYLES } from "../lib/styles";
import { GyftrLogo } from "./ui/GyftrLogo";
import { supabase } from "../lib/supabase";

export function Login({ onIn }) {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setErr(""); setLoading(true);
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) { setErr(error.message); setLoading(false); return; }
    }
    onIn(email.split("@")[0] || "Manager");
    setLoading(false);
  };

  return (
    <div className="gx-root" style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"radial-gradient(120% 120% at 80% 0%, #E9F4D5 0%, #F3F6F2 42%)" }}>
      <style>{STYLES}</style>
      <div className="gx-fade" style={{ width:380, maxWidth:"92vw" }}>
        <div style={{ marginBottom:26 }}>
          <GyftrLogo fs={28}/>
          <div style={{ fontSize:11.5, color:"var(--ink-soft)", fontWeight:600, marginTop:8, paddingLeft:2 }}>
            Creative &amp; Content Work Portal
          </div>
        </div>
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
            <span style={{ color:"var(--ink-soft)" }}>Manager access only</span>
            <span style={{ color:"var(--ink-soft)" }}>Contact GyFTR admin to reset</span>
          </div>
        </div>
      </div>
    </div>
  );
}
