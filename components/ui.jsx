"use client";

// Tiny shared UI primitives.

export function Panel({ title, actions, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function SumCard({ label, value, tone }) {
  return (
    <div className="sum-card">
      <div className="sum-label">{label}</div>
      <div className={"sum-val" + (tone ? " " + tone : "")}>{value}</div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty-hint">{children}</div>;
}

export function Badge({ status, children }) {
  const cls = {
    draft: "draft",
    sent: "sent",
    "sent-to-client": "sent",
    "under-negotiation": "negotiation",
    revised: "revised",
    accepted: "accepted",
    rejected: "rejected",
    paid: "paid",
    invoiced: "negotiation",
    pending: "pending",
    open: "open",
    fixed: "fixed",
    done: "done",
    overdue: "overdue",
  }[String(status || "").toLowerCase()] || "";
  return <span className={"badge " + cls}>{children}</span>;
}

export function Modal({ title, onClose, children, width }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={width ? { maxWidth: width } : undefined}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="row-del" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
