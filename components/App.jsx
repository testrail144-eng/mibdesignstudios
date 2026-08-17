"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useCollection, useDoc } from "@/lib/store";
import { recordActivity } from "@/lib/activity";

import Sidebar from "./Sidebar";
import Today from "./panels/Today";
import Dashboard from "./panels/Dashboard";
import Boq from "./panels/Boq";
import Quotations from "./panels/Quotations";
import Payments from "./panels/Payments";
import Vendors from "./panels/Vendors";
import Invoices from "./panels/Invoices";
import Log from "./panels/Log";
import Snags from "./panels/Snags";
import Tasks from "./panels/Tasks";
import Team from "./panels/Team";
import Expenses from "./panels/Expenses";
import Settings from "./panels/Settings";
import { Empty, Modal, Field } from "./ui";
import { useConfirm } from "./ConfirmProvider";

const ADMIN_TABS = [
  ["today", "Today"],
  ["dashboard", "Dashboard"],
  ["overview", "Overview & BOQ"],
  ["quote", "Quotation"],
  ["payments", "Payments"],
  ["expenses", "Expenses"],
  ["invoices", "Invoices"],
  ["vendors", "Vendors"],
  ["log", "Daily Log"],
  ["snags", "Snags"],
  ["tasks", "Tasks"],
  ["team", "Team"],
];
const STAFF_TABS = [
  ["today", "Today"],
  ["expenses", "My Expenses"],
  ["log", "Daily Log"],
  ["snags", "Snags"],
  ["tasks", "My Tasks"],
];

export default function App() {
  const { profile, isAdmin } = useAuth();
  const { notify } = useConfirm();
  const [currentId, setCurrentId] = useState(null);
  const [tab, setTab] = useState("today");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const projects = useCollection("projects", { orderBy: "createdAt" }).data || [];
  const studio = useDoc("settings/studio", {}).data || {};
  const brandName = studio.siteName || studio.name || "GROUNDWORK";

  useEffect(() => {
    if (!currentId && projects.length) setCurrentId(projects[0].id);
    if (currentId && projects.length && !projects.find((p) => p.id === currentId)) {
      setCurrentId(projects[0].id);
    }
  }, [projects, currentId]);

  useEffect(() => {
    if (typeof document !== "undefined" && brandName) {
      document.title = `${brandName} — Site & Vendor Ledger`;
    }
  }, [brandName]);

  const createProject = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "projects"), {
        name,
        client: newClient.trim(),
        location: newLocation.trim(),
        contractValue: 0,
        createdAt: Date.now(),
        createdBy: profile.uid || profile.id || "",
        createdByName: profile.name || profile.email || "",
        createdByEmail: profile.email || "",
      });
      setCurrentId(ref.id);
      setTab("today");
      setShowNewSite(false);
      setNewName("");
      setNewClient("");
      setNewLocation("");
      void recordActivity({
        projectId: ref.id,
        projectName: name,
        type: "site",
        title: "New site created",
        details: `${name}${newClient.trim() ? ` for ${newClient.trim()}` : ""}`,
        actor: profile,
        resourceId: ref.id,
      });
    } catch (err) {
      console.error("Create site failed:", err);
      notify("Could not create site: " + (err?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const tabs = isAdmin ? ADMIN_TABS : STAFF_TABS;
  const project = projects.find((p) => p.id === currentId) || null;

  return (
    <div className="app-shell">
      <Sidebar
        projects={projects}
        currentId={currentId}
        onSelect={(id) => { setCurrentId(id); setTab("today"); }}
        onNew={() => setShowNewSite(true)}
        isAdmin={isAdmin}
        profile={profile}
        studio={studio}
        onSignOut={() => (window.location.href = "/")}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="main">
        {!project ? (
          <Empty>
            {projects.length
              ? "Select a site from the sidebar."
              : 'No sites yet. Click "+ New site" to create your first project.'}
          </Empty>
        ) : (
          <>
            <WorkspaceHeader profile={profile} isAdmin={isAdmin} />
            <TitleBlock project={project} isAdmin={isAdmin} projectId={project.id} currentUser={profile} />

            <div className="tabs">
              {tabs.map(([key, label]) => (
                <button key={key} className={"tab-btn" + (tab === key ? " active" : "")} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "today" && <Today project={project} isAdmin={isAdmin} onJump={setTab} currentUser={profile} />}
            {tab === "dashboard" && isAdmin && <Dashboard />}
            {tab === "overview" && isAdmin && <Boq projectId={project.id} projectName={project.name} currentUser={profile} />}
            {tab === "quote" && isAdmin && <Quotations project={project} currentUser={profile} />}
            {tab === "payments" && isAdmin && <Payments project={project} currentUser={profile} />}
            {tab === "expenses" && <Expenses projectId={project.id} projectName={project.name} isAdmin={isAdmin} currentUser={profile} />}
            {tab === "invoices" && isAdmin && <Invoices project={project} currentUser={profile} />}
            {tab === "vendors" && isAdmin && <Vendors project={project} currentUser={profile} />}
            {tab === "log" && <Log projectId={project.id} projectName={project.name} currentUser={profile} />}
            {tab === "snags" && <Snags projectId={project.id} projectName={project.name} isAdmin={isAdmin} currentUser={profile} />}
            {tab === "tasks" && <Tasks projectId={project.id} projectName={project.name} isAdmin={isAdmin} currentUser={profile} />}
            {tab === "team" && isAdmin && <Team projectId={project.id} projectName={project.name} />}
          </>
        )}
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {showNewSite && (
        <Modal title="New site" onClose={() => setShowNewSite(false)}>
          <Field label="Site / project name">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="e.g. Shastri Nagar Residence"
            />
          </Field>
          <Field label="Client name (optional)">
            <input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Client name" />
          </Field>
          <Field label="Location (optional)">
            <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Site location" />
          </Field>
          <div className="modal-actions">
            <button className="btn" onClick={createProject} disabled={!newName.trim() || saving}>
              {saving ? "Creating…" : "Create site"}
            </button>
            <button className="btn ghost" onClick={() => setShowNewSite(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WorkspaceHeader({ profile, isAdmin }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = profile?.name?.trim()?.split(/\s+/)[0] || (isAdmin ? "Admin" : "there");

  return (
    <div className="workspace-topline">
      <div>
        <div className="workspace-eyebrow">MIB Design Studios · {isAdmin ? "Admin workspace" : "Staff workspace"}</div>
        <div className="workspace-greeting">{greeting}, <span>{name}</span></div>
      </div>
      <div className="sync-pill"><span className="live-dot" /> Live sync</div>
    </div>
  );
}

function TitleBlock({ project, isAdmin, projectId, currentUser }) {
  const [values, setValues] = useState({
    name: project.name || "",
    client: project.client || "",
    location: project.location || "",
  });

  useEffect(() => {
    setValues({
      name: project.name || "",
      client: project.client || "",
      location: project.location || "",
    });
  }, [project.id, project.name, project.client, project.location]);

  const update = async (field) => {
    const value = String(values[field] || "").trim();
    if (value === String(project[field] || "")) return;
    await setDoc(doc(db, "projects", projectId), {
      [field]: value,
      updatedAt: Date.now(),
      updatedBy: currentUser?.uid || currentUser?.id || "",
      updatedByName: currentUser?.name || currentUser?.email || "",
    }, { merge: true });
  };

  return (
    <div className="title-block">
      <div className="tb-main">
        {isAdmin ? (
          <input value={values.name} placeholder="Project name" onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} onBlur={() => update("name")} />
        ) : (
          <div style={{ fontWeight: 700, fontSize: 22 }}>{project.name}</div>
        )}
      </div>
      <div className="tb-cell">
        <div className="tb-label">Client</div>
        {isAdmin ? (
          <input value={values.client} placeholder="Client name" onChange={(e) => setValues((v) => ({ ...v, client: e.target.value }))} onBlur={() => update("client")} />
        ) : (
          <div className="mono" style={{ fontSize: 13 }}>{project.client || "—"}</div>
        )}
      </div>
      <div className="tb-cell">
        <div className="tb-label">Location</div>
        {isAdmin ? (
          <input value={values.location} placeholder="Site location" onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))} onBlur={() => update("location")} />
        ) : (
          <div className="mono" style={{ fontSize: 13 }}>{project.location || "—"}</div>
        )}
      </div>
    </div>
  );
}
