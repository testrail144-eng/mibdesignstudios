"use client";

import { useProject } from "@/lib/store";
import { money, today } from "@/lib/format";
import { SumCard, Panel, Empty, Badge } from "../ui";

// The operational "Today" view for one project.
export default function Today({ project, isAdmin, onJump, currentUser }) {
  const data = useProject(project.id);
  const boq = data.boq.data || [];
  const vendors = data.vendors.data || [];
  const pos = data.pos.data || [];
  const milestones = data.milestones.data || [];
  const updates = data.updates.data || [];
  const snags = data.snags.data || [];
  const tasks = data.tasks.data || [];
  const invoices = data.invoices.data || [];

  const tStr = today();
  const t = totals(boq);
  const pendingVendors = vendors.filter((v) => Number(v.pending) > 0).sort((a, b) => Number(b.pending) - Number(a.pending));
  const totalPending = pendingVendors.reduce((s, v) => s + (Number(v.pending) || 0), 0);
  const duePos = pos.filter((p) => p.requiredDelivery && p.requiredDelivery <= tStr);
  const dueMilestones = milestones.filter((m) => m.status !== "Paid" && m.dueDate && m.dueDate <= tStr).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const openSnags = snags.filter((s) => s.status !== "Fixed");
  const myUid = currentUser?.uid || currentUser?.id || "";
  const openTasks = tasks.filter((t) => t.status !== "Done" && (isAdmin || t.assignedTo === myUid));
  const latest = [...updates].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const unpaidInvoices = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + (Number(i.total) || 0), 0);

  if (!isAdmin) {
    return (
      <>
        <div className="summary-row">
          <SumCard label="Open snags" value={openSnags.length} tone={openSnags.length ? "rust" : "green"} />
          <SumCard label="My open tasks" value={openTasks.length} tone={openTasks.length ? "rust" : "green"} />
        </div>
        <Panel title="Latest site update" actions={<button className="btn sm ghost" onClick={() => onJump("log")}>Open Daily Log</button>}>
          {latest ? (
            <div className="entry">
              <div className="entry-date">{latest.date}</div>
              {latest.remarks && <><div className="entry-label">Report / remarks</div><div className="entry-body">{latest.remarks}</div></>}
              {latest.nextDay && <><div className="entry-label">Next day line-up</div><div className="entry-body">{latest.nextDay}</div></>}
            </div>
          ) : <Empty>No site updates logged yet.</Empty>}
        </Panel>
        <Panel title={`Open snags (${openSnags.length})`} actions={<button className="btn sm ghost" onClick={() => onJump("snags")}>Open Snags</button>}>
          {openSnags.length ? openSnags.slice(0, 8).map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #efebe1", fontSize: 13 }}>
              <span>{s.location || "(no location)"} — {(s.description || "").slice(0, 60)}</span>
              <span className="mono" style={{ color: "var(--ink-2)", marginLeft: 10 }}>{s.dateRaised || ""}</span>
            </div>
          )) : <Empty>No open snags. Nice.</Empty>}
        </Panel>
      </>
    );
  }

  return (
    <>
      <div className="summary-row">
        <SumCard label="Open snags" value={openSnags.length} tone={openSnags.length ? "rust" : "green"} />
        <SumCard label="Vendor payments pending" value={money(totalPending)} tone={totalPending ? "rust" : ""} />
        <SumCard label="Deliveries due / overdue" value={duePos.length} tone={duePos.length ? "rust" : "green"} />
        <SumCard label="Budget remaining" value={money(t.rem)} tone={t.rem < 0 ? "rust" : "green"} />
      </div>

      <div className="summary-row">
        <SumCard label="Total estimated" value={money(t.est)} />
        <SumCard label="Total expensed" value={money(t.exp)} />
        <SumCard label="Client received" value={money(milestones.filter((m) => m.status === "Paid").reduce((s, m) => s + (Number(m.amount) || 0), 0))} tone="green" />
        <SumCard label="Unpaid invoices" value={money(unpaidInvoices)} tone={unpaidInvoices ? "rust" : "green"} />
      </div>

      {dueMilestones.length > 0 && (
        <Panel title="Client payment milestones due" actions={<button className="btn sm ghost" onClick={() => onJump("payments")}>Open Payments</button>}>
          {dueMilestones.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #efebe1", fontSize: 13 }}>
              <span>{m.title || "(untitled)"} — due {m.dueDate}</span>
              <span className="mono" style={{ fontWeight: 600 }}>{money(m.amount)}</span>
            </div>
          ))}
        </Panel>
      )}

      <Panel title="Latest site update" actions={<button className="btn sm ghost" onClick={() => onJump("log")}>Open Daily Log</button>}>
        {latest ? (
          <div className="entry">
            <div className="entry-date">{latest.date}</div>
            {latest.remarks && <><div className="entry-label">Report / remarks</div><div className="entry-body">{latest.remarks}</div></>}
            {latest.nextDay && <><div className="entry-label">Next day line-up</div><div className="entry-body">{latest.nextDay}</div></>}
          </div>
        ) : <Empty>No site updates logged yet.</Empty>}
      </Panel>

      <Panel title={`Open snags (${openSnags.length})`} actions={<button className="btn sm ghost" onClick={() => onJump("snags")}>Open Snags</button>}>
        {openSnags.length ? openSnags.slice(0, 5).map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #efebe1", fontSize: 13 }}>
            <span>{s.location || "(no location)"} — {(s.description || "").slice(0, 60)}{(s.description || "").length > 60 ? "…" : ""}</span>
            <span className="mono" style={{ color: "var(--ink-2)", marginLeft: 10 }}>{s.dateRaised || ""}</span>
          </div>
        )) : <Empty>No open snags. Nice.</Empty>}
      </Panel>

      <Panel title="Vendor payments pending" actions={<button className="btn sm ghost" onClick={() => onJump("vendors")}>Open Vendors</button>}>
        {pendingVendors.length ? pendingVendors.slice(0, 5).map((v) => (
          <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #efebe1", fontSize: 13 }}>
            <span>{v.name || "(unnamed vendor)"}{v.category ? ` — ${v.category}` : ""}</span>
            <span className="mono" style={{ fontWeight: 600 }}>{money(v.pending)}</span>
          </div>
        )) : <Empty>No pending vendor payments.</Empty>}
      </Panel>

      <Panel title="Deliveries due or overdue" actions={<button className="btn sm ghost" onClick={() => onJump("vendors")}>Open Vendors</button>}>
        {duePos.length ? duePos.map((po) => {
          const overdue = po.requiredDelivery < tStr;
          return (
            <div key={po.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #efebe1", fontSize: 13 }}>
              <span>{po.poNumber || "(no PO number)"} — required {po.requiredDelivery}</span>
              <Badge status={overdue ? "overdue" : "pending"}>{overdue ? "Overdue" : "Due today"}</Badge>
            </div>
          );
        }) : <Empty>Nothing due or overdue right now.</Empty>}
      </Panel>
    </>
  );
}

function totals(boq) {
  const est = boq.reduce((s, r) => s + (Number(r.estimated) || 0), 0);
  const exp = boq.reduce((s, r) => s + (Number(r.expensed) || 0), 0);
  return { est, exp, rem: est - exp, pct: est ? Math.round((exp / est) * 100) : 0 };
}
