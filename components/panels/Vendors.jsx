"use client";

import { useState } from "react";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { recordActivity } from "@/lib/activity";
import { money, today, uid, esc } from "@/lib/format";
import { Panel, Empty } from "../ui";

export default function Vendors({ project, currentUser }) {
  const { vendors, pos } = useProject(project.id);
  const [openPo, setOpenPo] = useState(null);
  const { confirm, notify } = useConfirm();

  const addVendor = async () => {
    const ref = await addDoc(collection(db, `projects/${project.id}/vendors`), { name: "", phone: "", email: "", category: "", pending: "", received: "", createdAt: Date.now(), createdBy: currentUser?.uid || currentUser?.id || "", createdByName: currentUser?.name || currentUser?.email || "Unknown member" });
    void recordActivity({ projectId: project.id, projectName: project.name, type: "vendor", title: "New vendor added", details: "A vendor record was created", actor: currentUser, resourceId: ref.id });
  };
  const updateVendor = async (id, field, value) => {
    await setDoc(doc(db, `projects/${project.id}/vendors`, id), { [field]: value }, { merge: true });
  };
  const delVendor = async (id) => {
    if (!(await confirm("Delete this vendor?", { confirmText: "Delete", danger: true }))) return;
    await deleteDoc(doc(db, `projects/${project.id}/vendors`, id));
  };

  const vendorPos = (vId) => (pos.data || []).filter((p) => p.vendorId === vId);

  const addPo = async (vId) => {
    const seq = (pos.data || []).length + 1;
    const ref = await addDoc(collection(db, `projects/${project.id}/pos`), {
      vendorId: vId,
      poNumber: "PO-" + String(seq).padStart(3, "0"),
      poDate: today(),
      requiredDelivery: "",
      vendorAddress: "", vendorGSTIN: "", contactPerson: "",
      billingAddress: "", billingGSTIN: "", siteAddress: "", siteContact: "", deliveryInstructions: "",
      items: [{ id: uid(), desc: "", unit: "", qty: "", rate: "" }],
      discount: "", gstPercent: "18", paymentTerms: "", creditPeriod: "", preparedBy: "", checkedBy: "", approvedBy: "",
      createdAt: Date.now(),
      createdBy: currentUser?.uid || currentUser?.id || "",
      createdByName: currentUser?.name || currentUser?.email || "Unknown member",
    });
    setOpenPo(ref.id);
    void recordActivity({ projectId: project.id, projectName: project.name, type: "purchase order", title: "New purchase order added", details: `PO ${"PO-" + String(seq).padStart(3, "0")}`, actor: currentUser, resourceId: ref.id });
  };

  return (
    <Panel title="Vendors" actions={<button className="btn sm" onClick={addVendor}>+ Add vendor</button>}>
      {(vendors.data || []).length === 0 ? (
        <Empty>No vendors yet. Add a vendor&apos;s phone or email to send them a one-tap pending/received amount update.</Empty>
      ) : (
        (vendors.data || []).map((v) => (
          <div className="vendor-card" key={v.id}>
            <div className="vendor-top">
              <div>
                <div className="vendor-name">
                  <input defaultValue={v.name} placeholder="Vendor / contractor name" onBlur={(e) => updateVendor(v.id, "name", e.target.value)}
                    style={{ border: "none", font: "inherit", fontWeight: 600, minWidth: 180, background: "transparent" }} />
                </div>
                <div className="vendor-meta">
                  <input defaultValue={v.category || ""} placeholder="Trade (e.g. Electrical)" onBlur={(e) => updateVendor(v.id, "category", e.target.value)} style={{ border: "none", font: "inherit", background: "transparent", width: 150 }} />
                  {" · "}
                  <input defaultValue={v.phone || ""} placeholder="Phone (+91…)" onBlur={(e) => updateVendor(v.id, "phone", e.target.value)} style={{ border: "none", font: "inherit", background: "transparent", width: 130 }} />
                  {" · "}
                  <input defaultValue={v.email || ""} placeholder="Email" onBlur={(e) => updateVendor(v.id, "email", e.target.value)} style={{ border: "none", font: "inherit", background: "transparent", width: 170 }} />
                </div>
              </div>
              <button className="row-del" style={{ fontSize: 16 }} onClick={() => delVendor(v.id)}>✕</button>
            </div>

            <div className="vendor-amts">
              <div className="amt-field">
                <label>Amount pending</label>
                <input type="number" defaultValue={v.pending || ""} placeholder="0" onBlur={(e) => updateVendor(v.id, "pending", e.target.value)} />
              </div>
              <div className="amt-field">
                <label>Amount received</label>
                <input type="number" defaultValue={v.received || ""} placeholder="0" onBlur={(e) => updateVendor(v.id, "received", e.target.value)} />
              </div>
            </div>

            <div className="vendor-actions">
              <button className="btn sm green" onClick={() => waUpdate(v)}>WhatsApp update</button>
              <button className="btn sm ghost" onClick={() => mailUpdate(v)}>Email update</button>
            </div>

            <div className="section-divider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", color: "var(--ink-2)" }}>
                Purchase orders ({vendorPos(v.id).length})
              </span>
              <button className="btn sm ghost" onClick={() => addPo(v.id)}>+ New PO</button>
            </div>

            {vendorPos(v.id).map((po) => {
              const isOpen = openPo === po.id;
              const t = poTotals(po);
              return (
                <div className="po-row" key={po.id}>
                  <div className="po-row-summary" onClick={() => setOpenPo(isOpen ? null : po.id)}>
                    <span className="po-no">{po.poNumber || "(no PO number)"}</span>
                    <span className="po-date">{po.poDate || ""}</span>
                    <span className="po-total">{money(t.grandTotal)}</span>
                    <span className="po-caret">{isOpen ? "▾" : "▸"}</span>
                  </div>
                  {isOpen && <PoForm po={po} vendor={v} project={project} />}
                </div>
              );
            })}
            {vendorPos(v.id).length === 0 && <Empty>No purchase orders yet for this vendor.</Empty>}
          </div>
        ))
      )}
    </Panel>
  );

  function waUpdate(v) {
    const phone = (v.phone || "").replace(/[^0-9]/g, "");
    if (!phone) return notify("Add a phone number for this vendor first.");
    const msg = `Hi ${v.name || ""}, sharing a payment update for ${project.name} as of ${today()}:\n\nAmount received to date: ${money(v.received || 0)}\nAmount pending: ${money(v.pending || 0)}\n\nPlease confirm at your end. Thank you.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  function mailUpdate(v) {
    if (!v.email) return notify("Add an email for this vendor first.");
    const msg = `Hi ${v.name || ""},\n\nPayment update for ${project.name} as of ${today()}:\nAmount received to date: ${money(v.received || 0)}\nAmount pending: ${money(v.pending || 0)}\n\nPlease confirm at your end. Thank you.`;
    window.location.href = `mailto:${v.email}?subject=${encodeURIComponent("Payment update — " + project.name)}&body=${encodeURIComponent(msg)}`;
  }
}

function PoForm({ po, vendor, project }) {
  const { confirm, notify } = useConfirm();
  const update = (field, value) => setDoc(doc(db, `projects/${project.id}/pos`, po.id), { [field]: value }, { merge: true });
  const updateItem = (itemId, patch) => {
    const items = (po.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    update("items", items);
  };
  const addItem = () => update("items", [...(po.items || []), { id: uid(), desc: "", unit: "", qty: "", rate: "" }]);
  const delItem = (itemId) => update("items", (po.items || []).filter((it) => it.id !== itemId));
  const delPo = async () => {
    if (!(await confirm("Delete this purchase order?", { confirmText: "Delete", danger: true }))) return;
    await deleteDoc(doc(db, `projects/${project.id}/pos`, po.id));
  };
  const t = poTotals(po);

  return (
    <div className="po-form">
      <div className="grid2">
        <div className="field"><label>PO number</label><input defaultValue={po.poNumber || ""} onBlur={(e) => update("poNumber", e.target.value)} /></div>
        <div className="field"><label>PO date</label><input type="date" defaultValue={po.poDate || ""} onBlur={(e) => update("poDate", e.target.value)} /></div>
        <div className="field"><label>Required delivery</label><input type="date" defaultValue={po.requiredDelivery || ""} onBlur={(e) => update("requiredDelivery", e.target.value)} /></div>
        <div className="field"><label>Vendor GSTIN</label><input defaultValue={po.vendorGSTIN || ""} placeholder="22AAAAA0000A1Z5" onBlur={(e) => update("vendorGSTIN", e.target.value)} /></div>
        <div className="field"><label>Contact person</label><input defaultValue={po.contactPerson || ""} onBlur={(e) => update("contactPerson", e.target.value)} /></div>
        <div className="field"><label>Vendor address</label><input defaultValue={po.vendorAddress || ""} onBlur={(e) => update("vendorAddress", e.target.value)} /></div>
      </div>

      <div className="grid2" style={{ marginTop: 10 }}>
        <div className="field"><label>Billing address (yours)</label><input defaultValue={po.billingAddress || ""} onBlur={(e) => update("billingAddress", e.target.value)} /></div>
        <div className="field"><label>Billing GSTIN (yours)</label><input defaultValue={po.billingGSTIN || ""} onBlur={(e) => update("billingGSTIN", e.target.value)} /></div>
        <div className="field"><label>Site address (deliver to)</label><input defaultValue={po.siteAddress || project.location || ""} onBlur={(e) => update("siteAddress", e.target.value)} /></div>
        <div className="field"><label>Site contact</label><input defaultValue={po.siteContact || ""} onBlur={(e) => update("siteContact", e.target.value)} /></div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Delivery instructions</label>
        <textarea defaultValue={po.deliveryInstructions || ""} onBlur={(e) => update("deliveryInstructions", e.target.value)} style={{ minHeight: 44 }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 6px" }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Order details</span>
        <button className="btn sm ghost" onClick={addItem}>+ Add item</button>
      </div>
      <table className="po-items-table">
        <thead>
          <tr><th style={{ width: 36 }}>Sr</th><th>Description / specification</th><th style={{ width: 70 }}>Unit</th><th style={{ width: 60 }}>Qty</th><th style={{ width: 90 }}>Rate</th><th style={{ width: 100 }} className="num">Amount</th><th style={{ width: 26 }}></th></tr>
        </thead>
        <tbody>
          {(po.items || []).map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td>
              <td><input defaultValue={it.desc || ""} placeholder="Material / specification" onBlur={(e) => updateItem(it.id, { desc: e.target.value })} /></td>
              <td><input defaultValue={it.unit || ""} placeholder="nos/sqft" onBlur={(e) => updateItem(it.id, { unit: e.target.value })} /></td>
              <td><input type="number" defaultValue={it.qty || ""} placeholder="0" onBlur={(e) => updateItem(it.id, { qty: e.target.value })} /></td>
              <td><input type="number" defaultValue={it.rate || ""} placeholder="0" onBlur={(e) => updateItem(it.id, { rate: e.target.value })} /></td>
              <td className="num">{money((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
              <td><button className="row-del" onClick={() => delItem(it.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Discount</label>
          <input type="number" defaultValue={po.discount || ""} placeholder="0" style={{ width: 90 }} onBlur={(e) => update("discount", e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>GST %</label>
          <input type="number" defaultValue={po.gstPercent || ""} placeholder="18" style={{ width: 90 }} onBlur={(e) => update("gstPercent", e.target.value)} />
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>Subtotal: {money(t.subtotal)}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>Grand total: {money(t.grandTotal)}</div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Payment terms</label>
          <select defaultValue={po.paymentTerms || ""} onChange={(e) => update("paymentTerms", e.target.value)}>
            <option value="">Select…</option>
            <option value="100% Advance">100% Advance</option>
            <option value="50% Advance / 50% Against Delivery">50% Advance / 50% Against Delivery</option>
            <option value="Against Measurement & Bill">Against Measurement &amp; Bill</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field"><label>Credit period (days)</label><input type="number" defaultValue={po.creditPeriod || ""} placeholder="0" onBlur={(e) => update("creditPeriod", e.target.value)} /></div>
        <div className="field"><label>Prepared by</label><input defaultValue={po.preparedBy || ""} onBlur={(e) => update("preparedBy", e.target.value)} /></div>
        <div className="field"><label>Checked by</label><input defaultValue={po.checkedBy || ""} onBlur={(e) => update("checkedBy", e.target.value)} /></div>
        <div className="field"><label>Approved by</label><input defaultValue={po.approvedBy || ""} onBlur={(e) => update("approvedBy", e.target.value)} /></div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button className="btn sm green" onClick={() => sendPo(po, vendor, project, "wa")}>Send PO via WhatsApp</button>
        <button className="btn sm ghost" onClick={() => sendPo(po, vendor, project, "mail")}>Send PO via email</button>
        <button className="btn sm ghost" onClick={() => downloadPoPdf(po, vendor, project)}>Download PDF</button>
        <button className="btn sm rust" style={{ marginLeft: "auto" }} onClick={delPo}>Delete PO</button>
      </div>
    </div>
  );
}

export function poTotals(po) {
  const items = po.items || [];
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const discount = Number(po.discount) || 0;
  const afterDiscount = subtotal - discount;
  const gstPct = Number(po.gstPercent) || 0;
  const gstAmt = afterDiscount * gstPct / 100;
  return { subtotal, discount, afterDiscount, gstAmt, grandTotal: afterDiscount + gstAmt };
}

function poMessage(po, v, project) {
  const t = poTotals(po);
  const lines = (po.items || []).filter((it) => it.desc).map((it, i) =>
    `${i + 1}. ${it.desc} — ${it.qty || 0} ${it.unit || ""} x ${money(it.rate || 0)} = ${money((Number(it.qty) || 0) * (Number(it.rate) || 0))}`
  ).join("\n");
  return `Purchase Order ${po.poNumber || ""}\nProject: ${project.name}${project.location ? " (" + project.location + ")" : ""}\nDate: ${po.poDate || today()}${po.requiredDelivery ? "\nRequired delivery: " + po.requiredDelivery : ""}\n\nTo: ${v.name || ""}${po.contactPerson ? " (Attn: " + po.contactPerson + ")" : ""}\n\nORDER DETAILS:\n${lines || "(no items added yet)"}\n\nSubtotal: ${money(t.subtotal)}\nDiscount: ${money(t.discount)}\nGST (${po.gstPercent || 0}%): ${money(t.gstAmt)}\nGRAND TOTAL: ${money(t.grandTotal)}\n\nPayment terms: ${po.paymentTerms || "—"}\n\nPlease confirm receipt of this PO. Thank you.`;
}

function sendPo(po, v, project, mode) {
  const msg = poMessage(po, v, project);
  if (mode === "wa") {
    const phone = (v.phone || "").replace(/[^0-9]/g, "");
    if (!phone) return notify("Add a phone number for this vendor first.");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  } else {
    if (!v.email) return notify("Add an email for this vendor first.");
    window.location.href = `mailto:${v.email}?subject=${encodeURIComponent("Purchase Order " + (po.poNumber || "") + " — " + project.name)}&body=${encodeURIComponent(msg)}`;
  }
}

function downloadPoPdf(po, v, project) {
  const t = poTotals(po);
  const items = (po.items || []).filter((it) => it.desc || it.qty || it.rate);
  const html = `
    <div class="doc-letterhead"><div><div class="doc-studio-name">${esc(project.name || "Studio")}</div><div class="doc-studio-sub">${esc(po.billingAddress || "")}</div></div></div>
    <div class="doc-title-bar">PURCHASE ORDER</div>
    <table class="doc-meta">
      <tr><td class="k">PO No.</td><td>${esc(po.poNumber || "")}</td><td class="k">PO Date</td><td>${esc(po.poDate || "")}</td></tr>
      <tr><td class="k">Project</td><td>${esc(project.name || "")}</td><td class="k">Required Delivery</td><td>${esc(po.requiredDelivery || "")}</td></tr>
      <tr><td class="k">Vendor</td><td>${esc(v.name || "")}</td><td class="k">Contact</td><td>${esc(v.phone || "")}</td></tr>
      <tr><td class="k">Vendor GSTIN</td><td>${esc(po.vendorGSTIN || "")}</td><td class="k">Contact Person</td><td>${esc(po.contactPerson || "")}</td></tr>
      <tr><td class="k">Bill To</td><td>${esc(po.billingAddress || "")}</td><td class="k">Deliver To</td><td>${esc(po.siteAddress || project.location || "")}</td></tr>
    </table>
    <table class="doc-table">
      <tr><th style="width:26px">Sr</th><th>Description</th><th style="width:60px">Unit</th><th class="num" style="width:50px">Qty</th><th class="num" style="width:70px">Rate</th><th class="num" style="width:90px">Amount</th></tr>
      ${items.length ? items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.desc)}</td><td>${esc(it.unit || "")}</td><td class="num">${esc(it.qty || "")}</td><td class="num">${money(it.rate || 0)}</td><td class="num">${money((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td></tr>`).join("") : '<tr><td colspan="6" style="text-align:center">No items added</td></tr>'}
      <tr><td colspan="5" style="text-align:right">Subtotal</td><td class="num">${money(t.subtotal)}</td></tr>
      <tr><td colspan="5" style="text-align:right">Discount</td><td class="num">${money(t.discount)}</td></tr>
      <tr><td colspan="5" style="text-align:right">GST (${po.gstPercent || 0}%)</td><td class="num">${money(t.gstAmt)}</td></tr>
      <tr class="doc-total-row"><td colspan="5" style="text-align:right">GRAND TOTAL</td><td class="num">${money(t.grandTotal)}</td></tr>
    </table>
  `;
  printDoc(html);
}

function printDoc(html) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Purchase Order</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#16283d;padding:24px;}
    .doc-letterhead{border-bottom:4px solid #E8672F;padding-bottom:14px;margin-bottom:6px;}
    .doc-studio-name{font-size:26px;font-weight:800;color:#E8672F;}
    .doc-studio-sub{font-size:10.5px;color:#3a4d68;margin-top:4px;}
    .doc-title-bar{text-align:center;font-weight:700;font-size:14px;letter-spacing:3px;margin:14px 0 16px;}
    .doc-meta{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;}
    .doc-meta td{border:1px solid #999;padding:5px 8px;}
    .doc-meta td.k{font-weight:600;width:140px;background:#f0ede4;}
    .doc-table{width:100%;border-collapse:collapse;font-size:11.5px;}
    .doc-table th,.doc-table td{border:1px solid #999;padding:5px 7px;text-align:left;}
    .doc-table th{background:#f0ede4;font-size:10px;text-transform:uppercase;}
    .doc-table td.num,.doc-table th.num{text-align:right;}
    .doc-total-row td{font-weight:700;background:#f0ede4;}
    </style></head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}
