"use client";

import { useState } from "react";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCollection } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { recordActivity } from "@/lib/activity";
import { money, today, dateTime } from "@/lib/format";
import { Panel, Empty, Field, SumCard, Badge } from "../ui";

const STATUSES = ["Pending", "Approved", "Reimbursed", "Rejected"];

export default function Expenses({ projectId, projectName, isAdmin, currentUser }) {
  const myUid = currentUser?.uid || currentUser?.id || "";
  const expenses = useCollection(
    `projects/${projectId}/expenses`,
    isAdmin ? {} : { where: ["createdBy", "==", myUid] }
  ).data || [];
  const { confirm, notify } = useConfirm();
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = [...expenses].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const staffTotal = rows.filter((row) => row.createdRole === "staff").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const adminTotal = rows.filter((row) => row.createdRole === "admin").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const pending = rows.filter((row) => row.status === "Pending").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    const cleanDescription = description.trim();
    const cleanAmount = Number(amount);
    if (!cleanDescription || !cleanAmount || cleanAmount < 0 || saving) {
      notify("Add a description and a valid expense amount.");
      return;
    }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, `projects/${projectId}/expenses`), {
        date,
        description: cleanDescription,
        category: category.trim(),
        amount: cleanAmount,
        notes: notes.trim(),
        status: "Pending",
        createdBy: myUid,
        createdByName: currentUser?.name || currentUser?.email || "Unknown member",
        createdByEmail: currentUser?.email || "",
        createdRole: isAdmin ? "admin" : "staff",
        createdAt: Date.now(),
      });
      void recordActivity({
        projectId,
        projectName,
        type: "expense",
        title: "New expense added",
        details: `${cleanDescription} · ${money(cleanAmount)} · ${isAdmin ? "Admin" : "Staff"}`,
        actor: currentUser,
        resourceId: ref.id,
      });
      setDescription("");
      setCategory("");
      setAmount("");
      setNotes("");
    } catch (err) {
      notify("Could not save expense: " + (err?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (row, status) => {
    try {
      await setDoc(doc(db, `projects/${projectId}/expenses`, row.id), {
        status,
        updatedAt: Date.now(),
        updatedBy: myUid,
        updatedByName: currentUser?.name || currentUser?.email || "",
      }, { merge: true });
    } catch (err) {
      notify("Could not update expense: " + (err?.message || "permission denied"));
    }
  };

  const remove = async (row) => {
    if (!(await confirm("Delete this expense?", { confirmText: "Delete", danger: true }))) return;
    try {
      await deleteDoc(doc(db, `projects/${projectId}/expenses`, row.id));
    } catch (err) {
      notify("Could not delete expense: " + (err?.message || "permission denied"));
    }
  };

  return (
    <>
      <div className="summary-row">
        <SumCard label={isAdmin ? "Site expenses" : "My expenses"} value={money(total)} />
        {isAdmin ? (
          <>
            <SumCard label="Staff expenses" value={money(staffTotal)} />
            <SumCard label="Admin expenses" value={money(adminTotal)} />
            <SumCard label="Pending review" value={money(pending)} tone={pending ? "rust" : "green"} />
          </>
        ) : (
          <>
            <SumCard label="Pending review" value={money(pending)} tone={pending ? "rust" : "green"} />
            <SumCard label="Approved / paid" value={money(rows.filter((r) => r.status === "Approved" || r.status === "Reimbursed").reduce((s, r) => s + (Number(r.amount) || 0), 0))} tone="green" />
          </>
        )}
      </div>

      <Panel title={isAdmin ? "Add an admin expense" : "Add my expense"}>
        <form onSubmit={save}>
          <div className="grid2">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Amount"><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
            <Field label="Description"><input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Site travel, material advance" /></Field>
            <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Travel, food, material…" /></Field>
          </div>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details or receipt reference" style={{ minHeight: 52 }} /></Field>
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button>
        </form>
      </Panel>

      <Panel title={isAdmin ? `All expense entries (${rows.length})` : `My expense entries (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty>{isAdmin ? "No expenses logged for this site yet." : "You have not logged an expense for this site yet."}</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Category</th>{isAdmin && <th>Added by</th>}<th className="num">Amount</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="mono" style={{ fontSize: 11.5 }}>{row.date || "—"}</td>
                    <td>
                      <div>{row.description || "—"}</div>
                      {row.notes && <div className="muted-small">{row.notes}</div>}
                      <div className="muted-small">Added {row.createdAt ? dateTime(row.createdAt) : "—"}</div>
                    </td>
                    <td>{row.category || "—"}</td>
                    {isAdmin && <td><div>{row.createdByName || "Unknown member"}</div><div className="muted-small">{row.createdRole || "member"}</div></td>}
                    <td className="num">{money(row.amount)}</td>
                    <td>
                      {isAdmin ? (
                        <select className="status-select" value={row.status || "Pending"} onChange={(e) => updateStatus(row, e.target.value)}>
                          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      ) : <Badge status={row.status === "Reimbursed" ? "paid" : row.status === "Rejected" ? "rejected" : "pending"}>{row.status || "Pending"}</Badge>}
                    </td>
                    <td><button className="row-del" onClick={() => remove(row)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
