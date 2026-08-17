import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function getAdminAuth() {
  if (getApps().length) return getAuth();

  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  if (!serviceAccount) throw new Error("Firebase Admin credentials are not configured");
  return getAuth(initializeApp({ credential: cert(serviceAccount) }));
}

export async function POST(request) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ ok: false, skipped: true, reason: "Gmail notification settings are not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { idToken, activity, projectId } = body || {};
    if (!idToken || !activity || !projectId) {
      return NextResponse.json({ ok: false, error: "Missing notification payload" }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (!decoded.uid || decoded.uid !== activity.createdBy) {
      return NextResponse.json({ ok: false, error: "Invalid activity author" }, { status: 403 });
    }

    const recipient = process.env.NOTIFY_TO || process.env.GMAIL_USER;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
      },
    });

    const actor = activity.createdByName || decoded.name || decoded.email || "Unknown member";
    const projectName = activity.projectName || "Site";
    const details = activity.details ? `\nDetails: ${activity.details}` : "";
    const when = activity.createdAt ? new Date(activity.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const text = [
      `New update added to ${projectName}`,
      "",
      `What: ${activity.title || "New site update"}`,
      `Who added it: ${actor}${activity.createdByEmail ? ` (${activity.createdByEmail})` : ""}`,
      `When: ${when} IST`,
      details.trim(),
      "",
      "This notification was sent by the site management app.",
    ].filter(Boolean).join("\n");

    await transporter.sendMail({
      from: `Site management app <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject: `New site update — ${projectName} — ${activity.title || "Added"}`,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notification email failed:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Notification failed" }, { status: 500 });
  }
}
