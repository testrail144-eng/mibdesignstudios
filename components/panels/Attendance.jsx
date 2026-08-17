"use client";

import { useRef, useState } from "react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCollection } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import { compressImage } from "@/lib/image";
import { dateTime, today } from "@/lib/format";
import { Panel, Empty } from "../ui";

export default function Attendance({ projectId, projectName, isAdmin, currentUser }) {
  const visits = useCollection(`projects/${projectId}/attendance`).data || [];
  const arrivalInput = useRef(null);
  const departureInput = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const myUid = currentUser?.uid || currentUser?.id || "";
  const myVisits = visits.filter((visit) => visit.userId === myUid).sort((a, b) => (b.arrivalAt || 0) - (a.arrivalAt || 0));
  const openVisit = myVisits.find((visit) => !visit.departureAt);
  const todayVisit = myVisits.find((visit) => visit.siteDate === today());
  const rows = [...visits].sort((a, b) => (b.arrivalAt || 0) - (a.arrivalAt || 0));

  const captureArrival = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy("arrival");
    setError("");
    const capturedAt = Date.now();
    try {
      const photo = await compressImage(file, { stampText: `${projectName} · Arrival · ${dateTime(capturedAt)}` });
      const ref = await addDoc(collection(db, `projects/${projectId}/attendance`), {
        siteDate: today(),
        userId: myUid,
        userName: currentUser?.name || currentUser?.email || "Unknown member",
        userEmail: currentUser?.email || "",
        arrivalAt: capturedAt,
        arrivalAtIso: new Date(capturedAt).toISOString(),
        arrivalPhoto: photo,
        departureAt: null,
        departureAtIso: "",
        departurePhoto: "",
        createdAt: capturedAt,
      });
      void recordActivity({
        projectId,
        projectName,
        type: "site arrival",
        title: "Member checked in at site",
        details: `${currentUser?.name || currentUser?.email || "Member"} · ${dateTime(capturedAt)}`,
        actor: currentUser,
        resourceId: ref.id,
      });
    } catch (err) {
      setError("Could not save arrival photo: " + (err?.message || "unknown error"));
    } finally {
      setBusy("");
    }
  };

  const captureDeparture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy || !openVisit) return;
    setBusy("departure");
    setError("");
    const capturedAt = Date.now();
    try {
      const photo = await compressImage(file, { stampText: `${projectName} · Departure · ${dateTime(capturedAt)}` });
      await setDoc(doc(db, `projects/${projectId}/attendance`, openVisit.id), {
        departureAt: capturedAt,
        departureAtIso: new Date(capturedAt).toISOString(),
        departurePhoto: photo,
        updatedAt: capturedAt,
        updatedBy: myUid,
      }, { merge: true });
      void recordActivity({
        projectId,
        projectName,
        type: "site departure",
        title: "Member checked out from site",
        details: `${currentUser?.name || currentUser?.email || "Member"} · ${dateTime(capturedAt)}`,
        actor: currentUser,
        resourceId: openVisit.id,
      });
    } catch (err) {
      setError("Could not save departure photo: " + (err?.message || "unknown error"));
    } finally {
      setBusy("");
    }
  };

  return (
    <Panel title="Site arrival & departure">
      <div className="attendance-hero">
        <div>
          <div className="attendance-title">{openVisit ? "You are checked in" : todayVisit ? "Today's visit is recorded" : "Record your site visit"}</div>
          <div className="muted-small">
            {openVisit
              ? `Arrival recorded at ${dateTime(openVisit.arrivalAt)}. Take a departure photo when leaving.`
              : todayVisit?.departureAt
                ? `Arrival ${dateTime(todayVisit.arrivalAt)} · Departure ${dateTime(todayVisit.departureAt)}`
                : "Take a photo on arrival. The image and exact time are saved together."}
          </div>
        </div>
        <div className="attendance-actions">
          {!openVisit && (
            <>
              <button className="btn green" onClick={() => arrivalInput.current?.click()} disabled={Boolean(busy)}>
                {busy === "arrival" ? "Saving arrival…" : "📷 Check in with photo"}
              </button>
              <input ref={arrivalInput} type="file" accept="image/*" capture="environment" hidden onChange={captureArrival} />
            </>
          )}
          {openVisit && (
            <>
              <button className="btn rust" onClick={() => departureInput.current?.click()} disabled={Boolean(busy)}>
                {busy === "departure" ? "Saving departure…" : "📷 Check out with photo"}
              </button>
              <input ref={departureInput} type="file" accept="image/*" capture="environment" hidden onChange={captureDeparture} />
            </>
          )}
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}

      <div className="attendance-list">
        <div className="section-divider" />
        <div className="attendance-list-title">Recent site visits {isAdmin ? "— all members" : "— your visits"}</div>
        {(isAdmin ? rows : myVisits).slice(0, 8).map((visit) => (
          <div className="attendance-row" key={visit.id}>
            <div className="attendance-person">
              <strong>{visit.userName || "Unknown member"}</strong>
              <span className="muted-small">{visit.siteDate || "—"} · {visit.userEmail || ""}</span>
            </div>
            <div className="attendance-times">
              <span>In: {dateTime(visit.arrivalAt)}</span>
              <span>Out: {visit.departureAt ? dateTime(visit.departureAt) : "Still on site"}</span>
            </div>
            <div className="attendance-photos">
              {visit.arrivalPhoto && <img className="photo-thumb" src={visit.arrivalPhoto} alt={`Arrival photo by ${visit.userName || "member"}`} title={`Arrival · ${dateTime(visit.arrivalAt)}`} />}
              {visit.departurePhoto && <img className="photo-thumb" src={visit.departurePhoto} alt={`Departure photo by ${visit.userName || "member"}`} title={`Departure · ${dateTime(visit.departureAt)}`} />}
            </div>
          </div>
        ))}
        {rows.length === 0 && <Empty>No site visits recorded yet.</Empty>}
      </div>
    </Panel>
  );
}
