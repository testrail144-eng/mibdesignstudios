"use client";

import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Record a human-readable audit event and, when the server mail settings are
// present, ask the server to send the same event to the notification mailbox.
// Email credentials never enter the browser: the API route verifies the
// Firebase ID token and uses the Gmail App Password on the server only.
export async function recordActivity({
  projectId,
  projectName,
  type,
  title,
  details = "",
  actor,
  resourceId = "",
}) {
  const fbUser = auth?.currentUser;
  const uid = actor?.uid || actor?.id || fbUser?.uid;
  if (!db || !projectId || !uid) return;

  const createdByName = actor?.name || fbUser?.displayName || actor?.email || fbUser?.email || "Unknown member";
  const createdByEmail = actor?.email || fbUser?.email || "";
  const activity = {
    type: type || "update",
    title: title || "New site update",
    details: String(details || "").slice(0, 1000),
    projectName: projectName || "",
    resourceId: resourceId || "",
    createdBy: uid,
    createdByName,
    createdByEmail,
    createdAt: Date.now(),
  };

  try {
    await addDoc(collection(db, `projects/${projectId}/activity`), activity);
  } catch (err) {
    // Audit/email failures must not make the underlying record look like it
    // failed. The record itself has already been saved by the caller.
    console.warn("Could not record activity:", err?.message || err);
  }

  if (!fbUser) return;
  try {
    const idToken = await fbUser.getIdToken();
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, activity, projectId }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.reason || result.error || `Notification request failed (${response.status})`);
    }
  } catch (err) {
    // The site works without email configuration; the API returns a clear
    // setup error until Gmail environment variables are supplied.
    console.warn("Notification email was not sent:", err?.message || err);
  }
}
