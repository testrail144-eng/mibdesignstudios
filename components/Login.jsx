"use client";

import { useState } from "react";
import BrandLogo from "./BrandLogo";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else if (mode === "signup") {
        await signUp(email.trim(), password, name.trim());
      } else if (mode === "forgot") {
        await resetPassword(email.trim());
        setInfo("Password reset email sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <BrandLogo size={82} />
          <div>
            <h1>MIB DESIGN STUDIOS</h1>
            <div className="login-sub">Site management workspace</div>
          </div>
        </div>
        <div className="login-welcome">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your workspace account" : "Reset your password"}</div>
        <p className="login-hint">Keep projects, site updates, expenses and team work in one calm place.</p>

        {mode === "signup" && (
          <div className="login-field">
            <label>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arif Shaikh" autoComplete="name" />
          </div>
        )}

        <div className="login-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>

        {mode !== "forgot" && (
          <div className="login-field">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        {info && <div className="form-ok">{info}</div>}

        <button className="btn block login-submit" disabled={busy} type="submit">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>

        <div className="login-link">
          {mode === "signin" && (
            <>
              New here? <button type="button" onClick={() => { setMode("signup"); setError(""); }}>Create an account</button>
              <br />
              <button type="button" className="login-secondary-link" onClick={() => { setMode("forgot"); setError(""); }}>Forgot password?</button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
            </>
          )}
          {mode === "forgot" && (
            <>
              Remembered it? <button type="button" onClick={() => { setMode("signin"); setError(""); }}>Back to sign in</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function friendlyError(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Wrong password.",
    "auth/invalid-email": "That email address doesn't look valid.",
    "auth/email-already-in-use": "An account with that email already exists — sign in instead.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error — check your connection.",
  };
  return map[code] || err?.message || "Something went wrong. Please try again.";
}
