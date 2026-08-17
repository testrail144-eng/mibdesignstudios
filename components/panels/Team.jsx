"use client";

import { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/components/ConfirmProvider";
import { recordActivity } from "@/lib/activity";
import { normalizeEmail } from "@/lib/format";
import { Panel, Empty, Badge, Field } from "../ui";

// Team management: prepare invitations, then promote/demote every account.
// Firebase Auth accounts still have to be created by the member themselves;
// this keeps passwords out of the admin browser session.
export default function Team({ projectId, projectName }) {
  const users = useCollection("users").data || [];
  const invites = useCollection("teamInvites", { orderBy: "createdAt" }).data || [];
  const { profile } = useAuth();
  const { confirm, notify } = useConfirm();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [saving, setSaving] = useState(false);

  const setRole = async (u, role) => {
    if (!(await confirm(`Change ${u.name || u.email} to ${role}?`, { confirmText: "Change role" }))) return;
    try {
      await setDoc(doc(db, "users", u.id), { role }, { merge: true });
      notify(`${u.name || u.email} is now ${role}.`);
    } catch (err) {
      const message = err?.code === "permission-denied"
        ? "Role change was blocked by Firebase. Publish the updated firestore.rules file, then try again."
        : "Could not change role: " + (err?.message || "permission denied");
      notify(message);
    }
  };

  const setName = async (u, name) => {
    try {
      await setDoc(doc(db, "users", u.id), { name }, { merge: true });
    } catch (err) {
      notify("Could not update name: " + (err?.message || "unknown error"));
    }
  };

  const createInvite = async (e) => {
    e?.preventDefault();
    const email = normalizeEmail(inviteEmail);
    if (!email || !email.includes("@") || saving) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "teamInvites", email), {
        email,
        name: inviteName.trim(),
        role: inviteRole,
        createdAt: Date.now(),
        createdBy: profile?.uid || profile?.id || "",
        createdByName: profile?.name || profile?.email || "",
      }, { merge: true });
      if (projectId) {
        void recordActivity({
          projectId,
          projectName,
          type: "team member",
          title: "Team member invitation prepared",
          details: `${inviteName.trim() || email} · ${inviteRole} · ${email}`,
          actor: profile,
        });
      }
      setInviteName("");
      setInviteEmail("");
      setInviteRole("staff");
      setShowInvite(false);
      notify("Invitation saved. Ask the member to create an account with this email address.");
    } catch (err) {
      notify("Could not save invitation: " + (err?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (invite) => {
    if (!(await confirm(`Cancel the invitation for ${invite.email}?`, { confirmText: "Cancel invitation", danger: true }))) return;
    await deleteDoc(doc(db, "teamInvites", invite.id));
  };

  const pendingInvites = invites.filter((invite) => !users.some((u) => normalizeEmail(u.email) === normalizeEmail(invite.email)));

  return (
    <>
      <Panel
        title="Team & roles"
        actions={<button className="btn sm" onClick={() => setShowInvite((v) => !v)}>{showInvite ? "Close" : "+ Add team member"}</button>}
      >
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Prepare an invitation below, then ask the member to open the app and use <b>Create an account</b> with that exact email.
          The invited role is applied automatically. You can also promote any existing account from the list.
        </p>

        {showInvite && (
          <form className="invite-form" onSubmit={createInvite}>
            <div className="grid2">
              <Field label="Member name">
                <input autoFocus value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Arif Shaikh" />
              </Field>
              <Field label="Member email">
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" />
              </Field>
              <Field label="Role after sign-up">
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            </div>
            <div className="modal-actions">
              <button className="btn" disabled={!inviteEmail.trim() || saving} type="submit">{saving ? "Saving…" : "Save invitation"}</button>
              <button className="btn ghost" type="button" onClick={() => setShowInvite(false)}>Cancel</button>
            </div>
          </form>
        )}
      </Panel>

      {pendingInvites.length > 0 && (
        <Panel title={`Pending invitations (${pendingInvites.length})`}>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Prepared</th><th></th></tr></thead>
            <tbody>
              {pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.name || "—"}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{invite.email}</td>
                  <td><Badge status={invite.role === "admin" ? "accepted" : "pending"}>{invite.role}</Badge></td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{invite.createdAt ? new Date(invite.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td><button className="btn sm ghost" onClick={() => cancelInvite(invite)}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title={`People (${users.length})`}>
        {users.length === 0 ? (
          <Empty>No accounts yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th style={{ width: 120 }}>Role</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input defaultValue={u.name || ""} placeholder="Name" onBlur={(e) => setName(u, e.target.value.trim())} />
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{u.email || ""}</td>
                  <td><Badge status={u.role === "admin" ? "accepted" : "pending"}>{u.role}</Badge></td>
                  <td>
                    {u.id !== profile?.uid && (
                      <button className="btn sm ghost" onClick={() => setRole(u, u.role === "admin" ? "staff" : "admin")}>
                        {u.role === "admin" ? "Make staff" : "Make admin"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
