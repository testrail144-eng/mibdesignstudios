"use client";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useDoc } from "@/lib/store";
import { Modal, Field } from "../ui";

// Studio profile — reused on every PDF and for the signed-in app branding.
export default function Settings({ onClose }) {
  const { data, loading } = useDoc("settings/studio", {});

  const save = async (field, value) => {
    await setDoc(doc(db, "settings/studio"), {
      [field]: value,
      updatedAt: Date.now(),
    }, { merge: true });
  };

  const sp = data || {};

  return (
    <Modal title="Studio settings" onClose={onClose}>
      <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
        The app/site name is shown in the sidebar and browser tab for every signed-in member.
        Company details appear on quotations, purchase orders and invoices.
      </p>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <Field label="App / site name">
            <input defaultValue={sp.siteName || ""} placeholder="e.g. MIB Design Studios" onBlur={(e) => save("siteName", e.target.value.trim())} />
          </Field>
          <Field label="Company name on documents">
            <input defaultValue={sp.name || ""} placeholder="e.g. MIB Design Studios" onBlur={(e) => save("name", e.target.value.trim())} />
          </Field>
          <Field label="Contact number(s)">
            <input defaultValue={sp.contact || ""} placeholder="+91 …" onBlur={(e) => save("contact", e.target.value)} />
          </Field>
          <Field label="Email">
            <input defaultValue={sp.email || ""} placeholder="studio@example.com" onBlur={(e) => save("email", e.target.value)} />
          </Field>
          <Field label="Address">
            <input defaultValue={sp.address || ""} placeholder="Studio address" onBlur={(e) => save("address", e.target.value)} />
          </Field>
          <Field label="GSTIN">
            <input defaultValue={sp.gstin || ""} placeholder="Your GSTIN" onBlur={(e) => save("gstin", e.target.value)} />
          </Field>
          <Field label="Bank details (shown on invoices)">
            <textarea defaultValue={sp.bank || ""} placeholder="Bank name, account, IFSC…" style={{ minHeight: 64 }} onBlur={(e) => save("bank", e.target.value)} />
          </Field>
        </>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
