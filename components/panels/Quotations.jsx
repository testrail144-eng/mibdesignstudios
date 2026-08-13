"use client";

import { useState } from "react";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProject, useDoc } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { money, today, uid, esc, slug } from "@/lib/format";
import { Panel, Empty, Badge } from "../ui";

const STATUSES = ["Draft", "Sent to Client", "Under Negotiation", "Revised", "Accepted", "Rejected"];

export default function Quotations({ project }) {
  const { quotations } = useProject(project.id);
  const [openId, setOpenId] = useState(null);
  const { confirm } = useConfirm();
  const studio = useDoc("settings/studio", {}).data || {};

  const add = async () => {
    const seq = (quotations.data || []).length + 1;
    const ref = await addDoc(collection(db, `projects/${project.id}/quotations`), {
      quotationNo: "EST-" + String(seq).padStart(3, "0"),
      status: "Draft",
      date: today(),
      scope: "",
      sections: [],
      createdAt: Date.now(),
    });
    setOpenId(ref.id);
  };

  const update = async (id, patch) => {
    await setDoc(doc(db, `projects/${project.id}/quotations`, id), patch, { merge: true });
  };

  const remove = async (id) => {
    if (!(await confirm("Delete this quotation? This cannot be undone.", { confirmText: "Delete", danger: true }))) return;
    await deleteDoc(doc(db, `projects/${project.id}/quotations`, id));
  };

  return (
    <Panel title="Quotations" actions={<button className="btn sm" onClick={add}>+ New quotation</button>}>
      {(quotations.data || []).length === 0 ? (
        <Empty>No quotations yet. Add one for each stage of work — breaking, waterproofing, plumbing, carpentry, electrical, etc.</Empty>
      ) : (
        (quotations.data || []).map((q) => {
          const totals = quotationTotals(q);
          const isOpen = openId === q.id;
          return (
            <div className="po-row" key={q.id}>
              <div className="po-row-summary" onClick={() => setOpenId(isOpen ? null : q.id)}>
                <span className="po-no">{q.quotationNo || "(no number)"}</span>
                <Badge status={slug(q.status)}>{q.status || "Draft"}</Badge>
                <span className="po-date">{q.date || ""}</span>
                <span className="po-total">{money(totals.grand)}</span>
                <span className="po-caret">{isOpen ? "▾" : "▸"}</span>
              </div>
              {isOpen && (
                <QuoteForm q={q} project={project} studio={studio} onUpdate={update} onDelete={remove} />
              )}
            </div>
          );
        })
      )}
    </Panel>
  );
}

function QuoteForm({ q, project, studio, onUpdate, onDelete }) {
  const { confirm } = useConfirm();
  const updateField = (field, value) => onUpdate(q.id, { [field]: value });
  const totals = quotationTotals(q);

  const updateSection = (secId, patch) => {
    const sections = (q.sections || []).map((s) => (s.id === secId ? { ...s, ...patch } : s));
    onUpdate(q.id, { sections });
  };
  const updateItem = (secId, itemId, patch) => {
    const sections = (q.sections || []).map((s) =>
      s.id === secId ? { ...s, items: (s.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) } : s
    );
    onUpdate(q.id, { sections });
  };
  const addSection = () => {
    const sections = [...(q.sections || []), { id: uid(), title: "", items: [{ id: uid(), particulars: "", area: "", units: "", price: "" }] }];
    onUpdate(q.id, { sections });
  };
  const delSection = async (secId) => {
    if (!(await confirm("Delete this section and all its items?", { confirmText: "Delete", danger: true }))) return;
    onUpdate(q.id, { sections: (q.sections || []).filter((s) => s.id !== secId) });
  };
  const addItem = (secId) => {
    const sections = (q.sections || []).map((s) =>
      s.id === secId ? { ...s, items: [...(s.items || []), { id: uid(), particulars: "", area: "", units: "", price: "" }] } : s
    );
    onUpdate(q.id, { sections });
  };
  const delItem = (secId, itemId) => {
    const sections = (q.sections || []).map((s) =>
      s.id === secId ? { ...s, items: (s.items || []).filter((it) => it.id !== itemId) } : s
    );
    onUpdate(q.id, { sections });
  };

  const duplicate = () => {
    const copy = JSON.parse(JSON.stringify(q));
    copy.id = undefined;
    copy.quotationNo = nextRevision(q.quotationNo);
    copy.status = "Draft";
    copy.date = today();
    copy.sections = (copy.sections || []).map((s) => ({ ...s, id: uid(), items: (s.items || []).map((it) => ({ ...it, id: uid() })) }));
    const { createdAt, ...rest } = copy;
    addDoc(collection(db, `projects/${project.id}/quotations`), rest).then((ref) => {
      // keep the new one open
    });
  };

  return (
    <div className="po-form">
      <div className="grid2">
        <div className="field">
          <label>Quotation No.</label>
          <input defaultValue={q.quotationNo || ""} onBlur={(e) => updateField("quotationNo", e.target.value)} />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" defaultValue={q.date || today()} onChange={(e) => updateField("date", e.target.value)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select defaultValue={q.status || "Draft"} onChange={(e) => updateField("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Scope of work</label>
          <input defaultValue={q.scope || ""} placeholder="e.g. Refurbishing and renovation" onBlur={(e) => updateField("scope", e.target.value)} />
        </div>
      </div>

      {(q.sections || []).map((sec, si) => {
        const items = sec.items && sec.items.length ? sec.items : [{ id: uid(), particulars: "", area: "", units: "", price: "" }];
        return (
          <div className="quote-section" key={sec.id}>
            <div className="quote-section-head">
              <span className="quote-letter">{String.fromCharCode(65 + si)}</span>
              <input defaultValue={sec.title || ""} placeholder="Section title, e.g. Breaking of existing tiles" onBlur={(e) => updateSection(sec.id, { title: e.target.value })} />
              <button className="row-del" onClick={() => delSection(sec.id)}>✕</button>
            </div>
            <table className="quote-items-table">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th style={{ width: 70 }}>Area</th>
                  <th style={{ width: 70 }}>Units</th>
                  <th style={{ width: 90 }}>Per unit price</th>
                  <th style={{ width: 90 }} className="num">Amount</th>
                  <th style={{ width: 26 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const amt = (Number(it.area) || 0) * (Number(it.price) || 0);
                  return (
                    <tr key={it.id}>
                      <td><input defaultValue={it.particulars || ""} placeholder="Description of work" onBlur={(e) => updateItem(sec.id, it.id, { particulars: e.target.value })} /></td>
                      <td><input type="number" defaultValue={it.area || ""} placeholder="0" onBlur={(e) => updateItem(sec.id, it.id, { area: e.target.value })} /></td>
                      <td><input defaultValue={it.units || ""} placeholder="sq.ft" onBlur={(e) => updateItem(sec.id, it.id, { units: e.target.value })} /></td>
                      <td><input type="number" defaultValue={it.price || ""} placeholder="0" onBlur={(e) => updateItem(sec.id, it.id, { price: e.target.value })} /></td>
                      <td className="num">{money(amt)}</td>
                      <td><button className="row-del" onClick={() => delItem(sec.id, it.id)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="quote-section-foot">
              <button className="btn sm ghost" onClick={() => addItem(sec.id)}>+ Add item</button>
              <span className="quote-section-total">Section total: {money(totals.sections[si] || 0)}</span>
            </div>
          </div>
        );
      })}

      <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={addSection}>+ Add section</button>

      <div className="quote-grand-total">
        <span className="label">Grand total</span>
        <span className="val">{money(totals.grand)}</span>
      </div>

      <div className="po-form-actions" style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn sm ghost" onClick={() => downloadQuotationPdf(q, project, studio)}>Download PDF</button>
        <button className="btn sm ghost" onClick={duplicate}>Duplicate for negotiation</button>
        <button className="btn sm rust" style={{ marginLeft: "auto" }} onClick={() => onDelete(q.id)}>Delete quotation</button>
      </div>
    </div>
  );
}

export function quotationTotals(q) {
  let grand = 0;
  const sections = (q.sections || []).map((sec) => {
    const total = (sec.items || []).reduce((s, it) => s + (Number(it.area) || 0) * (Number(it.price) || 0), 0);
    grand += total;
    return total;
  });
  return { sections, grand };
}

function nextRevision(no) {
  if (!no) return "EST-001";
  const m = /^(.*?)-Rev(\d+)$/i.exec(no);
  if (m) return m[1] + "-Rev" + (parseInt(m[2], 10) + 1);
  return no + "-Rev2";
}

function downloadQuotationPdf(q, project, studio) {
  const totals = quotationTotals(q);
  const sectionsHtml = (q.sections || []).map((sec, si) => {
    const items = (sec.items || []).filter((it) => it.particulars || it.area || it.price);
    const rows = items.map((it) => {
      const amt = (Number(it.area) || 0) * (Number(it.price) || 0);
      return `<tr><td></td><td>${esc(it.particulars)}</td><td class="num">${esc(it.area || "")}</td><td>${esc(it.units || "")}</td><td class="num">${money(it.price || 0)}</td><td class="num">${money(amt)}</td></tr>`;
    }).join("");
    return `<tr class="doc-section-title"><td>${String.fromCharCode(65 + si)}</td><td colspan="4">${esc(sec.title)}</td><td class="num">${money(totals.sections[si] || 0)}</td></tr>${rows}`;
  }).join("");

  const html = `
    <div class="doc-letterhead">
      <div>
        <div class="doc-studio-name">${esc(studio.name || "Studio")}</div>
        <div class="doc-studio-sub">${esc(studio.address || "")}${studio.contact ? "<br>" + esc(studio.contact) : ""}</div>
      </div>
    </div>
    <div class="doc-title-bar">ESTIMATE / QUOTATION</div>
    <table class="doc-meta">
      <tr><td class="k">Quotation No.</td><td>${esc(q.quotationNo || "")}</td><td class="k">Date</td><td>${esc(q.date || "")}</td></tr>
      <tr><td class="k">Status</td><td>${esc(q.status || "Draft")}</td><td class="k">Client</td><td>${esc(project.client || "")}</td></tr>
      <tr><td class="k">Project</td><td>${esc(project.name || "")}</td><td class="k">Location</td><td>${esc(project.location || "")}</td></tr>
      ${q.scope ? `<tr><td class="k">Scope</td><td colspan="3">${esc(q.scope)}</td></tr>` : ""}
    </table>
    <table class="doc-table">
      <tr><th style="width:26px">Sr</th><th>Particulars</th><th class="num" style="width:55px">Area</th><th style="width:55px">Units</th><th class="num" style="width:70px">Per Unit Price</th><th class="num" style="width:90px">Amount</th></tr>
      ${sectionsHtml || '<tr><td colspan="6" style="text-align:center">No sections added</td></tr>'}
      <tr class="doc-total-row"><td colspan="5" style="text-align:right">GRAND TOTAL</td><td class="num">${money(totals.grand)}</td></tr>
    </table>
  `;
  printDoc(html);
}

function printDoc(html) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>Document</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#16283d;padding:24px;}
    .doc-letterhead{display:flex;align-items:center;gap:18px;border-bottom:4px solid #E8672F;padding-bottom:14px;margin-bottom:6px;}
    .doc-studio-name{font-size:26px;font-weight:800;color:#E8672F;}
    .doc-studio-sub{font-size:10.5px;color:#3a4d68;margin-top:4px;}
    .doc-title-bar{text-align:center;font-weight:700;font-size:14px;letter-spacing:3px;margin:14px 0 16px;}
    .doc-meta{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;}
    .doc-meta td{border:1px solid #999;padding:5px 8px;}
    .doc-meta td.k{font-weight:600;width:150px;background:#f0ede4;}
    .doc-table{width:100%;border-collapse:collapse;font-size:11.5px;}
    .doc-table th,.doc-table td{border:1px solid #999;padding:5px 7px;text-align:left;}
    .doc-table th{background:#f0ede4;font-size:10px;text-transform:uppercase;}
    .doc-table td.num,.doc-table th.num{text-align:right;}
    .doc-section-title{background:#ede4d3;font-weight:700;}
    .doc-total-row td{font-weight:700;background:#f0ede4;}
    </style></head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}
