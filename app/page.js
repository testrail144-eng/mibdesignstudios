"use client";

import { useAuth } from "@/lib/auth";
import Login from "@/components/Login";
import App from "@/components/App";

export default function Home() {
  const { user, loading, isConfigured, profile, authError, signOut } = useAuth();

  if (!isConfigured) {
    return <SetupScreen />;
  }

  if (loading) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 14, color: "var(--ink-2)", fontSize: 14 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Signed in but Firestore (roles) failed to load — surface the real error.
  if (!profile) {
    return <BackendError error={authError} onRetry={() => window.location.reload()} onSignOut={signOut} />;
  }

  return <App />;
}

function BackendError({ error, onRetry, onSignOut }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>
          <span className="mark" />
          GROUNDWORK
        </h1>
        <div className="login-sub">Almost there — one thing to fix</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
          You&apos;re signed in, but the app couldn&apos;t read your account role from the database.
          This is almost always a Firestore setup issue.
        </p>
        <div style={{ background: "var(--paper)", border: "1px solid var(--paper-line)", borderRadius: 4, padding: 12, marginTop: 12, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "var(--rust)", wordBreak: "break-word" }}>
          {error || "Unknown database error"}
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 12 }}>
          <b>Most likely fixes:</b>
          <br />1. Your Firestore database may still be provisioning — wait a minute and retry.
          <br />2. The database may be in <b>Datastore mode</b> instead of <b>Native mode</b> — delete it and recreate as Native mode.
          <br />3. Your <b>security rules</b> may be blocking the read — check Firestore → Rules.
        </p>
        <div className="modal-actions">
          <button className="btn" onClick={onRetry}>Retry</button>
          <button className="btn ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>
          <span className="mark" />
          GROUNDWORK
        </h1>
        <div className="login-sub">Site &amp; vendor ledger</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
          Firebase isn&apos;t configured yet. Add your Firebase project values to a{" "}
          <span className="mono" style={{ fontSize: 12 }}>.env.local</span> file and restart
          the dev server.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 10 }}>
          Copy <span className="mono" style={{ fontSize: 12 }}>.env.local.example</span> to{" "}
          <span className="mono" style={{ fontSize: 12 }}>.env.local</span>, fill in the six{" "}
          <span className="mono" style={{ fontSize: 12 }}>NEXT_PUBLIC_FIREBASE_*</span> values
          from your Firebase console, and you&apos;re good to go.
        </p>
      </div>
    </div>
  );
}
