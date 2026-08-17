"use client";

import { useAuth } from "@/lib/auth";
import Login from "@/components/Login";
import BrandLogo from "@/components/BrandLogo";
import App from "@/components/App";

export default function Home() {
  const { user, loading, isConfigured, profile, authError, signOut } = useAuth();

  if (!isConfigured) {
    return <SetupScreen />;
  }

  if (loading) {
    return (
      <div className="login-wrap">
        <div className="login-card loading-card">
          <BrandLogo size={68} />
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <p>Loading your workspace…</p>
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
        <div className="login-brand">
          <BrandLogo size={68} />
          <div><h1>MIB DESIGN STUDIOS</h1><div className="login-sub">Site management workspace</div></div>
        </div>
        <div className="login-welcome">Almost there — one thing to fix</div>
        <p className="login-hint">
          You&apos;re signed in, but the app couldn&apos;t read your account role from the database.
          This is almost always a Firestore setup issue.
        </p>
        <div className="error-detail">{error || "Unknown database error"}</div>
        <p className="login-hint">
          Check that Firestore is in Native mode and that the latest <b>firestore.rules</b> file has been published.
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
        <div className="login-brand">
          <BrandLogo size={72} />
          <div><h1>MIB DESIGN STUDIOS</h1><div className="login-sub">Site management workspace</div></div>
        </div>
        <div className="login-welcome">Connect your workspace</div>
        <p className="login-hint">
          Firebase isn&apos;t configured yet. Add your Firebase project values to a <span className="mono">.env.local</span> file and restart the dev server.
        </p>
        <p className="login-hint">
          Copy <span className="mono">.env.local.example</span>, fill in the six <span className="mono">NEXT_PUBLIC_FIREBASE_*</span> values from your Firebase console, and you&apos;re good to go.
        </p>
      </div>
    </div>
  );
}
