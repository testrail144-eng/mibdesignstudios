"use client";

import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject, useCollection } from "@/lib/store";
import { Panel, Empty, Badge } from "../ui";

export default function Tasks({ projectId, isAdmin, currentUser }) {
  const { tasks } = useProject(projectId);
  const users = useCollection("users").data || [];

  const add = async () => {
    await addDoc(collection(db, `projects/${projectId}/tasks`), { title: "", assignedTo: "", dueDate: "", status: "Open", createdAt: Date.now() });
  };
  const update = async (id, field, value) => {
    await setDoc(doc(db, `projects/${projectId}/tasks`, id), { [field]: value }, { merge: true });
  };
  const remove = async (id) => {
    await deleteDoc(doc(db, `projects/${projectId}/tasks`, id));
  };

  const nameOf = (uid) => users.find((u) => u.id === uid)?.name || "Unassigned";

  if (!isAdmin) {
    const mine = (tasks.data || []).filter((t) => t.assignedTo === currentUser?.uid);
    const open = mine.filter((t) => t.status !== "Done");
    const done = mine.filter((t) => t.status === "Done");
    const card = (t) => (
      <div className="entry" key={t.id} style={{ opacity: t.status === "Done" ? 0.7 : 1 }}>
        <div className="entry-date" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{t.title || "(untitled task)"}</span>
          <Badge status={t.status === "Done" ? "done" : "open"}>{t.status === "Done" ? "Done" : "Open"}</Badge>
        </div>
        {t.dueDate && <><div className="entry-label">Due</div><div className="entry-body">{t.dueDate}</div></>}
        <div className="vendor-actions">
          <button className={"btn sm " + (t.status === "Done" ? "ghost" : "green")} onClick={() => update(t.id, "status", t.status === "Done" ? "Open" : "Done")}>
            {t.status === "Done" ? "Reopen" : "Mark done"}
          </button>
        </div>
      </div>
    );
    return (
      <>
        <Panel title={`Open (${open.length})`}>
          {open.length ? open.map(card) : <Empty>No open tasks assigned to you.</Empty>}
        </Panel>
        {done.length > 0 && <Panel title={`Done (${done.length})`}>{done.map(card)}</Panel>}
      </>
    );
  }

  const rows = [...(tasks.data || [])].sort((a, b) => (a.status === "Done" ? 1 : 0) - (b.status === "Done" ? 1 : 0));

  return (
    <Panel title="Tasks" actions={<button className="btn sm" onClick={add}>+ Add task</button>}>
      {rows.length ? (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: 150 }}>Assigned to</th>
              <th style={{ width: 110 }}>Due date</th>
              <th style={{ width: 100 }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><input defaultValue={t.title || ""} placeholder="Task title" onBlur={(e) => update(t.id, "title", e.target.value)} /></td>
                <td>
                  <select defaultValue={t.assignedTo || ""} onChange={(e) => update(t.id, "assignedTo", e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {users.filter((u) => u.role !== "admin").map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </td>
                <td><input type="date" defaultValue={t.dueDate || ""} onBlur={(e) => update(t.id, "dueDate", e.target.value)} /></td>
                <td>
                  <select defaultValue={t.status || "Open"} onChange={(e) => update(t.id, "status", e.target.value)}>
                    <option value="Open">Open</option>
                    <option value="Done">Done</option>
                  </select>
                </td>
                <td><button className="row-del" onClick={() => remove(t.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No tasks yet. Add one and assign it to a staff member — it&apos;ll show up on their Today page and Tasks tab.</Empty>
      )}
    </Panel>
  );
}
