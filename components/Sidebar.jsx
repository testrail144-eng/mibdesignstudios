"use client";

import BrandLogo from "./BrandLogo";
import { sheetNo } from "@/lib/format";

export default function Sidebar({ projects, currentId, onSelect, onNew, isAdmin, profile, studio, onSignOut, onOpenSettings }) {
  const brand = studio?.siteName || studio?.name || "MIB DESIGN STUDIOS";
  const memberName = profile?.name || profile?.email || (isAdmin ? "Admin" : "Staff member");
  const initials = memberName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand-lockup" title={brand}>
        <BrandLogo size={52} />
        <div className="brand-copy">
          <div className="brand">{brand}</div>
          <div className="brand-sub">Site workspace</div>
        </div>
      </div>

      <div className="sidebar-section-label">
        <span>Projects</span>
        <span className="sidebar-count">{projects.length}</span>
      </div>
      <div className="site-list">
        {projects.map((p, i) => (
          <button
            key={p.id}
            className={"site-card" + (p.id === currentId ? " active" : "")}
            onClick={() => onSelect(p.id)}
            aria-pressed={p.id === currentId}
          >
            <div className="site-sheet-no">{sheetNo(i)}</div>
            <div className="site-name">{p.name || "Untitled site"}</div>
            <div className="site-client">{p.client || "No client set"}</div>
          </button>
        ))}
        {projects.length === 0 && (
          <div className="sidebar-empty">No sites yet. Create your first workspace below.</div>
        )}
      </div>

      <div className="sidebar-actions">
        {isAdmin && <button className="sidebar-btn primary" onClick={onNew}>＋ New site</button>}
        {isAdmin && <button className="sidebar-btn solid" onClick={onOpenSettings}>⚙ Studio settings</button>}
      </div>

      <div className="sidebar-foot">
        <div className="profile-chip">
          <div className="profile-avatar">{initials || "M"}</div>
          <div className="profile-copy">
            <strong>{memberName}</strong>
            <span>{isAdmin ? "Administrator" : "Staff member"}</span>
          </div>
        </div>
        <button className="sidebar-btn signout" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
