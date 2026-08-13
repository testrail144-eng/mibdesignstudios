"use client";

import { useState } from "react";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { compressImage } from "@/lib/image";
import { today } from "@/lib/format";
import { Panel, Empty, Field, Badge } from "../ui";

export default function Snags({ projectId, isAdmin }) {
  const { snags } = useProject(projectId);
  const { confirm } = useConfirm();
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const rows = snags.data || [];
  const open = rows.filter((s) => s.status !== "Fixed").sort((a, b) => (b.dateRaised || "").localeCompare(a.dateRaised || ""));
  const fixed = rows.filter((s) => s.status === "Fixed").sort((a, b) => (b.dateFixed || "").localeCompare(a.dateFixed || ""));

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPhoto(await compressImage(f));
    } catch (err) {
      setErr("Photo processing failed: " + (err?.message || "unknown error"));
    }
  };

  const save = async () => {
    if (!description.trim() && !location.trim()) {
      setErr("Add at least a location or description before logging.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await addDoc(collection(db, `projects/${projectId}/snags`), {
        location: location.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        photo,
        status: "Open",
        dateRaised: today(),
        dateFixed: "",
        createdAt: Date.now(),
      });
      setLocation(""); setDescription(""); setAssignedTo(""); setPhoto(null);
    } catch (err) {
      setErr("Could not save: " + (err?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    const fixed = s.status !== "Fixed";
    await setDoc(doc(db, `projects/${projectId}/snags`, s.id), { status: fixed ? "Fixed" : "Open", dateFixed: fixed ? today() : "" }, { merge: true });
  };
  const remove = async (id) => {
    if (!(await confirm("Delete this snag?", { confirmText: "Delete", danger: true }))) return;
    await deleteDoc(doc(db, `projects/${projectId}/snags`, id));
  };

  const card = (s) => (
    <div className="entry" key={s.id} style={{ borderLeftColor: s.status === "Fixed" ? "var(--green)" : "var(--rust)", opacity: s.status === "Fixed" ? 0.7 : 1 }}>
      <div className="entry-date" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{s.location || "(no location)"} — {s.dateRaised || ""}</span>
        <Badge status={s.status === "Fixed" ? "fixed" : "open"}>{s.status === "Fixed" ? "Fixed" : "Open"}</Badge>
      </div>
      <div className="entry-body">{s.description}</div>
      {s.assignedTo && <><div className="entry-label">Assigned to</div><div className="entry-body">{s.assignedTo}</div></>}
      {s.photo && <div className="entry-photos"><img className="photo-thumb" src={s.photo} alt="" /></div>}
      <div className="vendor-actions">
        <button className={"btn sm " + (s.status === "Fixed" ? "ghost" : "green")} onClick={() => toggle(s)}>
          {s.status === "Fixed" ? "Reopen" : "Mark fixed"}
        </button>
        <button className="btn sm rust" onClick={() => remove(s.id)}>Delete</button>
      </div>
    </div>
  );

  return (
    <>
      <Panel title="Log a new snag">
        <Field label="Location / area">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Master bedroom, kitchen dado" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's wrong…" style={{ minHeight: 64 }} />
        </Field>
        <Field label="Assigned to">
          <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Vendor or person responsible" />
        </Field>
        <Field label="Photo">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {photo && <img className="photo-thumb" src={photo} alt="" />}
            <label className="photo-add">
              +<input type="file" accept="image/*" style={{ display: "none" }} onChange={pickPhoto} />
            </label>
          </div>
        </Field>
        {err && <div className="form-error">{err}</div>}
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Log snag"}</button>
      </Panel>

      <Panel title={`Open (${open.length})`}>
        {open.length ? open.map(card) : <Empty>No open snags. Nice.</Empty>}
      </Panel>

      {fixed.length > 0 && (
        <Panel title={`Fixed (${fixed.length})`}>
          {fixed.map(card)}
        </Panel>
      )}
    </>
  );
}
