"use client";

import { sheetNo } from "@/lib/format";

export default function Sidebar({ projects, currentId, onSelect, onNew, isAdmin, profile, onSignOut, onOpenSettings }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark" />
        GROUNDWORK
      </div>
      <div className="brand-sub">Site &amp; vendor ledger</div>

      <div className="site-list">
        {projects.map((p, i) => (
          <button key={p.id} className={"site-card" + (p.id === currentId ? " active" : "")} onClick={() => onSelect(p.id)}>
            <div className="site-sheet-no">{sheetNo(i)}</div>
            <div className="site-name">{p.name || "Untitled site"}</div>
            <div className="site-client">{p.client || "No client set"}</div>
          </button>
        ))}
        {projects.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", padding: "8px 4px" }}>
            No sites yet.
          </div>
        )}
      </div>

      {isAdmin && (
        <button className="sidebar-btn" onClick={onNew}>+ New site</button>
      )}

      {isAdmin && (
        <button className="sidebar-btn solid" onClick={onOpenSettings}>⚙ Settings</button>
      )}

      <div className="sidebar-foot">
        <div className="status-line">
          {isAdmin ? "Signed in as Admin" : "Signed in as " + (profile?.name || "Staff")}
          <br />
          <span style={{ color: "rgba(255,255,255,0.35)" }}>{profile?.email}</span>
        </div>
        <button className="sidebar-btn" style={{ marginTop: 10 }} onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
