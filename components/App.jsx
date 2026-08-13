"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";

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
import Settings from "./panels/Settings";
import { Empty, Modal, Field } from "./ui";

const ADMIN_TABS = [
  ["today", "Today"],
  ["dashboard", "Dashboard"],
  ["overview", "Overview & BOQ"],
  ["quote", "Quotation"],
  ["payments", "Payments"],
  ["invoices", "Invoices"],
  ["vendors", "Vendors"],
  ["log", "Daily Log"],
  ["snags", "Snags"],
  ["tasks", "Tasks"],
  ["team", "Team"],
];
const STAFF_TABS = [
  ["today", "Today"],
  ["log", "Daily Log"],
  ["snags", "Snags"],
  ["tasks", "My Tasks"],
];

export default function App() {
  const { profile, isAdmin } = useAuth();
  const [currentId, setCurrentId] = useState(null);
  const [tab, setTab] = useState("today");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const projects = useCollection("projects", { orderBy: "createdAt" }).data || [];

  useEffect(() => {
    if (!currentId && projects.length) setCurrentId(projects[0].id);
    if (currentId && projects.length && !projects.find((p) => p.id === currentId)) {
      setCurrentId(projects[0].id);
    }
  }, [projects, currentId]);

  const createProject = async () => {
    const name = newName.trim();
    if (!name) return;
    const ref = await addDoc(collection(db, "projects"), {
      name,
      client: newClient.trim(),
      location: newLocation.trim(),
      contractValue: 0,
      createdAt: Date.now(),
      createdBy: profile.uid,
    });
    setCurrentId(ref.id);
    setTab("today");
    setShowNewSite(false);
    setNewName("");
    setNewClient("");
    setNewLocation("");
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
            <TitleBlock project={project} isAdmin={isAdmin} projectId={project.id} />

            <div className="tabs">
              {tabs.map(([key, label]) => (
                <button key={key} className={"tab-btn" + (tab === key ? " active" : "")} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "today" && <Today project={project} isAdmin={isAdmin} onJump={setTab} />}
            {tab === "dashboard" && isAdmin && <Dashboard />}
            {tab === "overview" && isAdmin && <Boq projectId={project.id} />}
            {tab === "quote" && isAdmin && <Quotations project={project} />}
            {tab === "payments" && isAdmin && <Payments project={project} />}
            {tab === "invoices" && isAdmin && <Invoices project={project} />}
            {tab === "vendors" && isAdmin && <Vendors project={project} />}
            {tab === "log" && <Log projectId={project.id} />}
            {tab === "snags" && <Snags projectId={project.id} isAdmin={isAdmin} />}
            {tab === "tasks" && <Tasks projectId={project.id} isAdmin={isAdmin} currentUser={profile} />}
            {tab === "team" && isAdmin && <Team />}
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
            <button className="btn" onClick={createProject} disabled={!newName.trim()}>
              Create site
            </button>
            <button className="btn ghost" onClick={() => setShowNewSite(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TitleBlock({ project, isAdmin, projectId }) {
  const update = async (field, value) => {
    await setDoc(doc(db, "projects", projectId), { [field]: value }, { merge: true });
  };

  return (
    <div className="title-block">
      <div className="tb-main">
        {isAdmin ? (
          <input defaultValue={project.name} placeholder="Project name" onBlur={(e) => update("name", e.target.value)} />
        ) : (
          <div style={{ fontWeight: 700, fontSize: 22 }}>{project.name}</div>
        )}
      </div>
      <div className="tb-cell">
        <div className="tb-label">Client</div>
        {isAdmin ? (
          <input defaultValue={project.client || ""} placeholder="Client name" onBlur={(e) => update("client", e.target.value)} />
        ) : (
          <div className="mono" style={{ fontSize: 13 }}>{project.client || "—"}</div>
        )}
      </div>
      <div className="tb-cell">
        <div className="tb-label">Location</div>
        {isAdmin ? (
          <input defaultValue={project.location || ""} placeholder="Site location" onBlur={(e) => update("location", e.target.value)} />
        ) : (
          <div className="mono" style={{ fontSize: 13 }}>{project.location || "—"}</div>
        )}
      </div>
    </div>
  );
}
