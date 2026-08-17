"use client";

import { useState } from "react";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject, useDoc } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { recordActivity } from "@/lib/activity";
import { money, today, uid, esc } from "@/lib/format";
import { Panel, Empty, Badge, Field } from "../ui";

const STATUSES = ["Draft", "Sent", "Part Paid", "Paid", "Overdue"];

export default function Invoices({ project, currentUser }) {
  const { invoices } = useProject(project.id);
  const [openId, setOpenId] = useState(null);
  const { confirm, notify } = useConfirm();
  const studio = useDoc("settings/studio", {}).data || {};

  const add = async () => {
    const seq = (invoices.data || []).length + 1;
    const ref = await addDoc(collection(db, `projects/${project.id}/invoices`), {
      number: "INV-" + String(seq).padStart(3, "0"),
      date: today(),
      dueDate: "",
      status: "Draft",
      items: [{ id: uid(), description: "", amount: "" }],
      discount: "", taxPct: "18",
      notes: "",
      createdAt: Date.now(),
      createdBy: currentUser?.uid || currentUser?.id || "",
      createdByName: currentUser?.name || currentUser?.email || "Unknown member",
      createdByEmail: currentUser?.email || "",
    });
    setOpenId(ref.id);
    void recordActivity({
      projectId: project.id,
      projectName: project.name,
      type: "invoice",
      title: "New invoice added",
      details: `Invoice ${"INV-" + String(seq).padStart(3, "0")}`,
      actor: currentUser,
      resourceId: ref.id,
    });
  };

  const update = (id, patch) => setDoc(doc(db, `projects/${project.id}/invoices`, id), patch, { merge: true });
  const remove = async (id) => {
    if (!(await confirm("Delete this invoice?", { confirmText: "Delete", danger: true }))) return;
    await deleteDoc(doc(db, `projects/${project.id}/invoices`, id));
  };

  const rows = invoices.data || [];
  const totalOutstanding = rows.filter((i) => i.status !== "Paid").reduce((s, i) => s + (Number(invoiceTotals(i).grand) || 0), 0);

  return (
    <>
      <div className="summary-row">
        <div className="sum-card"><div className="sum-label">Invoices</div><div className="sum-val">{rows.length}</div></div>
        <div className="sum-card"><div className="sum-label">Outstanding</div><div className={"sum-val " + (totalOutstanding ? "rust" : "green")}>{money(totalOutstanding)}</div></div>
      </div>

      <Panel title="Client invoices" actions={<button className="btn sm" onClick={add}>+ New invoice</button>}>
        {rows.length === 0 ? (
          <Empty>No invoices yet. Raise a GST invoice against your client here — handy when a milestone is due.</Empty>
        ) : (
          rows.map((inv) => {
            const t = invoiceTotals(inv);
            const isOpen = openId === inv.id;
            return (
              <div className="po-row" key={inv.id}>
                <div className="po-row-summary" onClick={() => setOpenId(isOpen ? null : inv.id)}>
                  <span className="po-no">{inv.number || "(no number)"}</span>
                  <Badge status={slugStatus(inv.status)}>{inv.status || "Draft"}</Badge>
                  <span className="po-date">{inv.date || ""}</span>
                  <span className="po-total">{money(t.grand)}</span>
                  <span className="po-caret">{isOpen ? "▾" : "▸"}</span>
                </div>
                {isOpen && <InvoiceForm inv={inv} project={project} studio={studio} onUpdate={update} onDelete={remove} />}
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
}

function slugStatus(s) {
  return String(s || "draft").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function InvoiceForm({ inv, project, studio, onUpdate, onDelete }) {
  const update = (patch) => onUpdate(inv.id, patch);
  const updateItem = (itemId, patch) => {
    update({ items: (inv.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) });
  };
  const addItem = () => update({ items: [...(inv.items || []), { id: uid(), description: "", amount: "" }] });
  const delItem = (itemId) => update({ items: (inv.items || []).filter((it) => it.id !== itemId) });
  const t = invoiceTotals(inv);

  return (
    <div className="po-form">
      <div className="grid2">
        <Field label="Invoice number"><input defaultValue={inv.number || ""} onBlur={(e) => update({ number: e.target.value })} /></Field>
        <Field label="Invoice date"><input type="date" defaultValue={inv.date || today()} onChange={(e) => update({ date: e.target.value })} /></Field>
        <Field label="Due date"><input type="date" defaultValue={inv.dueDate || ""} onChange={(e) => update({ dueDate: e.target.value })} /></Field>
        <Field label="Status">
          <select defaultValue={inv.status || "Draft"} onChange={(e) => update({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 6px" }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Line items</span>
        <button className="btn sm ghost" onClick={addItem}>+ Add item</button>
      </div>
      <table className="po-items-table">
        <thead>
          <tr><th>Description</th><th style={{ width: 110 }} className="num">Amount</th><th style={{ width: 26 }}></th></tr>
        </thead>
        <tbody>
          {(inv.items || []).map((it) => (
            <tr key={it.id}>
              <td><input defaultValue={it.description || ""} placeholder="e.g. Design stage — 30% of contract" onBlur={(e) => updateItem(it.id, { description: e.target.value })} /></td>
              <td><input type="number" defaultValue={it.amount || ""} placeholder="0" onBlur={(e) => updateItem(it.id, { amount: e.target.value })} /></td>
              <td><button className="row-del" onClick={() => delItem(it.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label="Discount"><input type="number" defaultValue={inv.discount || ""} placeholder="0" style={{ width: 90 }} onBlur={(e) => update({ discount: e.target.value })} /></Field>
        <Field label="GST %"><input type="number" defaultValue={inv.taxPct || ""} placeholder="18" style={{ width: 90 }} onBlur={(e) => update({ taxPct: e.target.value })} /></Field>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>Subtotal: {money(t.subtotal)}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>Total: {money(t.grand)}</div>
        </div>
      </div>

      <Field label="Notes / payment instructions">
        <textarea defaultValue={inv.notes || ""} onBlur={(e) => update({ notes: e.target.value })} style={{ minHeight: 44 }} />
      </Field>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button className="btn sm green" onClick={() => downloadInvoicePdf(inv, project, studio)}>Download invoice PDF</button>
        <button className="btn sm ghost" onClick={() => {
          if (!project.client) return notify("Add a client name in the title block first.");
          window.open(`mailto:?subject=${encodeURIComponent("Invoice " + (inv.number || "") + " — " + project.name)}&body=${encodeURIComponent("Please find your invoice attached. Total due: " + money(t.grand) + " — " + (inv.notes || ""))}`, "_blank");
        }}>Email to client</button>
        <button className="btn sm rust" style={{ marginLeft: "auto" }} onClick={() => onDelete(inv.id)}>Delete</button>
      </div>
    </div>
  );
}

function invoiceTotals(inv) {
  const subtotal = (inv.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const afterDiscount = subtotal - (Number(inv.discount) || 0);
  const tax = afterDiscount * (Number(inv.taxPct) || 0) / 100;
  return { subtotal, afterDiscount, tax, grand: afterDiscount + tax };
}

function downloadInvoicePdf(inv, project, studio) {
  const t = invoiceTotals(inv);
  const items = (inv.items || []).filter((it) => it.description || it.amount);
  const html = `
    <div class="doc-letterhead">
      <div>
        <div class="doc-studio-name">${esc(studio.name || project.name || "Studio")}</div>
        <div class="doc-studio-sub">${esc(studio.address || "")}${studio.gstin ? "<br>GSTIN: " + esc(studio.gstin) : ""}${studio.contact ? "<br>" + esc(studio.contact) : ""}</div>
      </div>
    </div>
    <div class="doc-title-bar">TAX INVOICE</div>
    <table class="doc-meta">
      <tr><td class="k">Invoice No.</td><td>${esc(inv.number || "")}</td><td class="k">Date</td><td>${esc(inv.date || "")}</td></tr>
      <tr><td class="k">Client</td><td>${esc(project.client || "")}</td><td class="k">Due Date</td><td>${esc(inv.dueDate || "")}</td></tr>
      <tr><td class="k">Project</td><td>${esc(project.name || "")}</td><td class="k">Location</td><td>${esc(project.location || "")}</td></tr>
    </table>
    <table class="doc-table">
      <tr><th>Description</th><th class="num" style="width:110px">Amount</th></tr>
      ${items.map((it) => `<tr><td>${esc(it.description || "")}</td><td class="num">${money(it.amount || 0)}</td></tr>`).join("") || '<tr><td colspan="2" style="text-align:center">No items</td></tr>'}
      <tr><td style="text-align:right">Subtotal</td><td class="num">${money(t.subtotal)}</td></tr>
      <tr><td style="text-align:right">Discount</td><td class="num">${money(inv.discount || 0)}</td></tr>
      <tr><td style="text-align:right">GST (${inv.taxPct || 0}%)</td><td class="num">${money(t.tax)}</td></tr>
      <tr class="doc-total-row"><td style="text-align:right">TOTAL</td><td class="num">${money(t.grand)}</td></tr>
    </table>
    ${inv.notes ? `<p style="font-size:11px;margin-top:12px;"><b>Notes:</b> ${esc(inv.notes)}</p>` : ""}
    ${studio.bank ? `<p style="font-size:11px;margin-top:12px;"><b>Payment details:</b><br>${esc(studio.bank)}</p>` : ""}
  `;
  printDoc(html);
}

function printDoc(html) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#16283d;padding:24px;}
    .doc-letterhead{border-bottom:4px solid #E8672F;padding-bottom:14px;margin-bottom:6px;}
    .doc-studio-name{font-size:26px;font-weight:800;color:#E8672F;}
    .doc-studio-sub{font-size:10.5px;color:#3a4d68;margin-top:4px;line-height:1.5;}
    .doc-title-bar{text-align:center;font-weight:700;font-size:14px;letter-spacing:3px;margin:14px 0 16px;}
    .doc-meta{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;}
    .doc-meta td{border:1px solid #999;padding:5px 8px;}
    .doc-meta td.k{font-weight:600;width:120px;background:#f0ede4;}
    .doc-table{width:100%;border-collapse:collapse;font-size:11.5px;}
    .doc-table th,.doc-table td{border:1px solid #999;padding:5px 7px;text-align:left;}
    .doc-table th{background:#f0ede4;font-size:10px;text-transform:uppercase;}
    .doc-table td.num,.doc-table th.num{text-align:right;}
    .doc-total-row td{font-weight:700;background:#f0ede4;}
    </style></head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}
