"use client";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/components/ConfirmProvider";
import { Panel, Empty, Badge } from "../ui";

// Team management: list every account, promote/demote between admin and staff.
// New staff simply sign up from the login page (their account starts as staff).
export default function Team() {
  const users = useCollection("users").data || [];
  const { profile } = useAuth();
  const { confirm } = useConfirm();

  const setRole = async (u, role) => {
    if (!(await confirm(`Change ${u.name || u.email} to ${role}?`, { confirmText: "Change role" }))) return;
    await setDoc(doc(db, "users", u.id), { role }, { merge: true });
  };

  const setName = async (u, name) => {
    await setDoc(doc(db, "users", u.id), { name }, { merge: true });
  };

  return (
    <>
      <Panel title="Team & roles">
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Everyone signs up with their own email. The first person to create an account becomes the
          Admin; everyone after that starts as Staff. Promote or rename people here.
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginTop: 6 }}>
          To add someone new: just have them open the app and tap <b>Create an account</b> — they&apos;ll appear in this list automatically.
        </p>
      </Panel>

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
