"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import { compressImage } from "@/lib/image";
import { today, dateTime } from "@/lib/format";
import { Panel, Empty, Field } from "../ui";

export default function Log({ projectId, projectName, currentUser }) {
  const { updates } = useProject(projectId);
  const [date, setDate] = useState(today());
  const [remarks, setRemarks] = useState("");
  const [nextDay, setNextDay] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const rows = [...(updates.data || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const addPhotos = async (e) => {
    setErr("");
    const files = Array.from(e.target.files || []);
    for (const f of files.slice(0, 6 - photos.length)) {
      try {
        const url = await compressImage(f);
        setPhotos((p) => [...p, url]);
      } catch (error) {
        setErr("Photo processing failed: " + (error?.message || "unknown error"));
      }
    }
    e.target.value = "";
  };

  const save = async () => {
    if (!remarks.trim() && !nextDay.trim() && photos.length === 0) {
      setErr("Add a remark, next-day plan, or photo before saving.");
      return;
    }
    setSaving(true);
    setErr("");
    const createdAt = Date.now();
    try {
      const ref = await addDoc(collection(db, `projects/${projectId}/updates`), {
        date,
        remarks: remarks.trim(),
        nextDay: nextDay.trim(),
        photos,
        createdBy: currentUser?.uid || currentUser?.id || "",
        createdByName: currentUser?.name || currentUser?.email || "Unknown member",
        createdByEmail: currentUser?.email || "",
        createdAt,
      });
      void recordActivity({
        projectId,
        projectName,
        type: "daily update",
        title: "New daily site update added",
        details: remarks.trim() || nextDay.trim() || `${photos.length} photo${photos.length === 1 ? "" : "s"}`,
        actor: currentUser,
        resourceId: ref.id,
      });
      setRemarks("");
      setNextDay("");
      setPhotos([]);
    } catch (error) {
      setErr("Could not save: " + (error?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Panel title="Add today's update">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Report / remarks">
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="What happened on site today…" style={{ minHeight: 64 }} />
        </Field>
        <Field label="Line-up for tomorrow">
          <textarea value={nextDay} onChange={(e) => setNextDay(e.target.value)} placeholder="What's planned for next day…" style={{ minHeight: 64 }} />
        </Field>
        <Field label="Photos">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {photos.map((p, i) => (
              <img key={i} className="photo-thumb" src={p} alt={`Selected site photo ${i + 1}`} />
            ))}
            {photos.length < 6 && (
              <label className="photo-add">
                +<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addPhotos} />
              </label>
            )}
          </div>
        </Field>
        {err && <div className="form-error">{err}</div>}
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save today's update"}
        </button>
      </Panel>

      <Panel title="Site history">
        {rows.length ? (
          rows.map((u) => (
            <div className="entry" key={u.id}>
              <div className="entry-date">{u.date}</div>
              {u.remarks && <><div className="entry-label">Report / remarks</div><div className="entry-body">{u.remarks}</div></>}
              {u.nextDay && <><div className="entry-label">Next day line-up</div><div className="entry-body">{u.nextDay}</div></>}
              <div className="entry-meta">Added by <b>{u.createdByName || "Unknown member"}</b>{u.createdAt ? ` · ${dateTime(u.createdAt)}` : ""}</div>
              {u.photos && u.photos.length > 0 && (
                <div className="entry-photos">
                  {u.photos.map((p, i) => <img key={i} className="photo-thumb" src={p} alt={`Site photo ${i + 1} uploaded by ${u.createdByName || "member"}`} title={`Uploaded by ${u.createdByName || "member"}`} />)}
                </div>
              )}
            </div>
          ))
        ) : (
          <Empty>No entries yet — your first daily update will show up here.</Empty>
        )}
      </Panel>
    </>
  );
}
