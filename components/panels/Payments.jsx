"use client";

import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import { money } from "@/lib/format";
import { Panel, SumCard, Empty } from "../ui";

const STATUSES = ["Pending", "Invoiced", "Paid"];

export default function Payments({ project, currentUser }) {
  const { milestones } = useProject(project.id);

  const add = async () => {
    const ref = await addDoc(collection(db, `projects/${project.id}/milestones`), { title: "", dueDate: "", amount: "", status: "Pending", createdAt: Date.now(), createdBy: currentUser?.uid || currentUser?.id || "", createdByName: currentUser?.name || currentUser?.email || "Unknown member" });
    void recordActivity({ projectId: project.id, projectName: project.name, type: "payment milestone", title: "New payment milestone added", details: "A client payment milestone was created", actor: currentUser, resourceId: ref.id });
  };
  const update = async (id, field, value) => {
    await setDoc(doc(db, `projects/${project.id}/milestones`, id), { [field]: value }, { merge: true });
  };
  const remove = async (id) => {
    await deleteDoc(doc(db, `projects/${project.id}/milestones`, id));
  };

  const rows = [...(milestones.data || [])].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const cv = Number(project.contractValue) || 0;
  const totalM = rows.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const paid = rows.filter((m) => m.status === "Paid").reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const invoiced = rows.filter((m) => m.status === "Invoiced").reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const variance = cv - totalM;

  return (
    <>
      <Panel title="Contract value">
        <div className="field">
          <label>Total contract value (what the client owes overall)</label>
          <input type="number" defaultValue={project.contractValue || ""} placeholder="0" onBlur={(e) =>
            setDoc(doc(db, "projects", project.id), { contractValue: Number(e.target.value) || 0 }, { merge: true })
          } />
        </div>
      </Panel>

      <div className="summary-row">
        <SumCard label="Contract value" value={money(cv)} />
        <SumCard label="Received" value={money(paid)} tone="green" />
        <SumCard label="Invoiced, awaiting" value={money(invoiced)} tone={invoiced ? "rust" : ""} />
        <SumCard label="Not yet milestoned" value={money(variance)} tone={variance < 0 ? "rust" : ""} />
      </div>

      <Panel title="Payment milestones" actions={<button className="btn sm" onClick={add}>+ Add milestone</button>}>
        {rows.length ? (
          <table>
            <thead>
              <tr><th>Milestone</th><th style={{ width: 110 }}>Due date</th><th style={{ width: 100, textAlign: "right" }}>Amount</th><th style={{ width: 120 }}>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td><input defaultValue={m.title || ""} placeholder="e.g. Design approval" onBlur={(e) => update(m.id, "title", e.target.value)} /></td>
                  <td><input type="date" defaultValue={m.dueDate || ""} onBlur={(e) => update(m.id, "dueDate", e.target.value)} /></td>
                  <td className="num"><input type="number" defaultValue={m.amount || ""} placeholder="0" onBlur={(e) => update(m.id, "amount", e.target.value)} /></td>
                  <td>
                    <select defaultValue={m.status || "Pending"} onChange={(e) => update(m.id, "status", e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="row-del" onClick={() => remove(m.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No payment milestones yet. Add one for each stage — e.g. 30% on design approval, 40% on execution start, 30% on handover.</Empty>
        )}
      </Panel>
    </>
  );
}
