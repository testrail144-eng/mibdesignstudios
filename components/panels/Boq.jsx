"use client";

import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject } from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import { money } from "@/lib/format";
import { Panel, SumCard, Empty } from "../ui";

// Bill of Quantities — cost by trade/category with estimated vs. expensed.
export default function Boq({ projectId, projectName, currentUser }) {
  const { boq } = useProject(projectId);
  const rows = boq.data || [];
  const est = rows.reduce((s, r) => s + (Number(r.estimated) || 0), 0);
  const exp = rows.reduce((s, r) => s + (Number(r.expensed) || 0), 0);
  const rem = est - exp;
  const pct = est ? Math.round((exp / est) * 100) : 0;

  const add = async () => {
    const ref = await addDoc(collection(db, `projects/${projectId}/boq`), { category: "", estimated: "", expensed: "", createdAt: Date.now(), createdBy: currentUser?.uid || currentUser?.id || "", createdByName: currentUser?.name || currentUser?.email || "Unknown member" });
    void recordActivity({ projectId, projectName, type: "BOQ category", title: "New BOQ category added", details: "A new cost category was created", actor: currentUser, resourceId: ref.id });
  };
  const update = async (id, field, value) => {
    await setDoc(doc(db, `projects/${projectId}/boq`, id), { [field]: value }, { merge: true });
  };
  const remove = async (id) => {
    await deleteDoc(doc(db, `projects/${projectId}/boq`, id));
  };

  return (
    <>
      <div className="summary-row">
        <SumCard label="Total estimated" value={money(est)} />
        <SumCard label="Total expensed" value={money(exp)} />
        <SumCard label="Remaining" value={money(rem)} tone={rem < 0 ? "rust" : "green"} />
        <SumCard label="Budget used" value={pct + "%"} tone={pct > 100 ? "rust" : ""} />
      </div>

      <Panel title="Bill of quantities — cost by category" actions={<button className="btn sm" onClick={add}>+ Add category</button>}>
        {rows.length ? (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Estimated</th>
                <th style={{ textAlign: "right" }}>Expensed</th>
                <th style={{ textAlign: "right" }}>Variance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = (Number(r.estimated) || 0) - (Number(r.expensed) || 0);
                return (
                  <tr key={r.id}>
                    <td><input defaultValue={r.category} placeholder="e.g. Carpentry" onBlur={(e) => update(r.id, "category", e.target.value)} /></td>
                    <td className="num"><input type="number" defaultValue={r.estimated || ""} placeholder="0" onBlur={(e) => update(r.id, "estimated", e.target.value)} /></td>
                    <td className="num"><input type="number" defaultValue={r.expensed || ""} placeholder="0" onBlur={(e) => update(r.id, "expensed", e.target.value)} /></td>
                    <td className="num" style={{ color: v < 0 ? "var(--rust)" : "var(--green)" }}>{money(v)}</td>
                    <td><button className="row-del" onClick={() => remove(r.id)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No cost categories yet. Add one for each trade — civil, electrical, plumbing, carpentry, painting, furnishing, etc.</Empty>
        )}
      </Panel>
    </>
  );
}
