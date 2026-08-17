"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCollection } from "@/lib/store";
import { money, today, dateTime } from "@/lib/format";
import { Panel, Empty, SumCard } from "../ui";

// Admin-only cross-site command centre. Each hidden ProjectMetrics component
// subscribes to one site's operational collections, then sends a compact
// snapshot back to this page for totals, alerts and the site table.
export default function Dashboard() {
  const projects = useCollection("projects").data || [];
  const users = useCollection("users").data || [];
  const [metricsByProject, setMetricsByProject] = useState({});

  const onMetrics = useCallback((id, metrics) => {
    setMetricsByProject((previous) => {
      const old = previous[id];
      if (old && JSON.stringify(old) === JSON.stringify(metrics)) return previous;
      return { ...previous, [id]: metrics };
    });
  }, []);

  const metrics = projects.map((project) => metricsByProject[project.id]).filter(Boolean);
  const totals = useMemo(() => metrics.reduce((sum, row) => ({
    estimated: sum.estimated + row.estimated,
    expensed: sum.expensed + row.expensed,
    expenses: sum.expenses + row.expenses,
    outstanding: sum.outstanding + row.outstanding,
    openSnags: sum.openSnags + row.openSnags,
    openTasks: sum.openTasks + row.openTasks,
    pendingVendor: sum.pendingVendor + row.pendingVendor,
    visitsToday: sum.visitsToday + row.visitsToday,
  }), { estimated: 0, expensed: 0, expenses: 0, outstanding: 0, openSnags: 0, openTasks: 0, pendingVendor: 0, visitsToday: 0 }), [metrics]);

  const recent = metrics
    .flatMap((row) => row.recentActivity || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 12);

  return (
    <>
      {projects.map((project) => <ProjectMetrics key={project.id} project={project} onMetrics={onMetrics} />)}

      <div className="summary-row">
        <SumCard label="Sites" value={projects.length} />
        <SumCard label="Team members" value={users.length} />
        <SumCard label="Open snags" value={totals.openSnags} tone={totals.openSnags ? "rust" : "green"} />
        <SumCard label="Site visits today" value={totals.visitsToday} tone="green" />
      </div>
      <div className="summary-row">
        <SumCard label="Estimated budget" value={money(totals.estimated)} />
        <SumCard label="BOQ expensed" value={money(totals.expensed)} />
        <SumCard label="Expense log" value={money(totals.expenses)} />
        <SumCard label="Invoices outstanding" value={money(totals.outstanding)} tone={totals.outstanding ? "rust" : "green"} />
      </div>
      <div className="summary-row">
        <SumCard label="Vendor payments pending" value={money(totals.pendingVendor)} tone={totals.pendingVendor ? "rust" : "green"} />
        <SumCard label="Open tasks" value={totals.openTasks} tone={totals.openTasks ? "rust" : "green"} />
        <SumCard label="Budget variance" value={money(totals.estimated - totals.expensed - totals.expenses)} tone={totals.estimated - totals.expensed - totals.expenses < 0 ? "rust" : "green"} />
        <SumCard label="Live activity feed" value={recent.length} />
      </div>

      <Panel title="All sites — live overview">
        {projects.length === 0 ? (
          <Empty>No sites yet. Create one to see company-wide numbers.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Client</th>
                  <th className="num">Contract</th>
                  <th className="num">Estimated</th>
                  <th className="num">BOQ expensed</th>
                  <th className="num">Expenses</th>
                  <th>Open snags</th>
                  <th>Tasks</th>
                  <th>Visits today</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const row = metricsByProject[project.id] || emptyMetrics();
                  return (
                    <tr key={project.id}>
                      <td style={{ fontWeight: 600 }}>{project.name || "Untitled site"}</td>
                      <td>{project.client || "—"}</td>
                      <td className="num">{money(project.contractValue)}</td>
                      <td className="num">{money(row.estimated)}</td>
                      <td className="num">{money(row.expensed)}</td>
                      <td className="num">{money(row.expenses)}</td>
                      <td style={{ color: row.openSnags ? "var(--rust)" : "var(--green)" }}>{row.openSnags}</td>
                      <td>{row.openTasks}</td>
                      <td>{row.visitsToday}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Budget used per site">
        {projects.length === 0 ? (
          <Empty>No data yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects.map((project) => {
              const row = metricsByProject[project.id] || emptyMetrics();
              const denominator = row.estimated || Number(project.contractValue) || 0;
              const used = row.expensed + row.expenses;
              const pct = denominator ? Math.round((used / denominator) * 100) : 0;
              return (
                <div key={project.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{project.name || "Untitled site"}</span>
                    <span className="mono" style={{ color: "var(--ink-2)" }}>{money(used)} / {money(denominator)} · {pct}%</span>
                  </div>
                  <div style={{ height: 10, background: "var(--paper-line)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.min(100, Math.max(0, pct)) + "%", background: pct > 100 ? "var(--rust)" : "var(--green)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Recent additions">
        {recent.length === 0 ? (
          <Empty>New site activity will appear here with the member who added it.</Empty>
        ) : (
          recent.map((event, index) => (
            <div className="activity-row" key={`${event.resourceId || event.title}-${event.createdAt || index}-${index}`}>
              <div>
                <strong>{event.title}</strong>
                <div className="muted-small">{event.projectName || "Site"}{event.details ? ` · ${event.details}` : ""}</div>
              </div>
              <div className="activity-by">{event.createdByName || "Unknown member"}<br /><span>{event.createdAt ? dateTime(event.createdAt) : "—"}</span></div>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

function ProjectMetrics({ project, onMetrics }) {
  const boq = useCollection(`projects/${project.id}/boq`).data || [];
  const snags = useCollection(`projects/${project.id}/snags`).data || [];
  const tasks = useCollection(`projects/${project.id}/tasks`).data || [];
  const invoices = useCollection(`projects/${project.id}/invoices`).data || [];
  const expenses = useCollection(`projects/${project.id}/expenses`).data || [];
  const vendors = useCollection(`projects/${project.id}/vendors`).data || [];
  const visits = useCollection(`projects/${project.id}/attendance`).data || [];
  const activity = useCollection(`projects/${project.id}/activity`, { orderBy: "createdAt", limit: 12 }).data || [];

  const snapshot = useMemo(() => {
    const estimated = boq.reduce((sum, row) => sum + (Number(row.estimated) || 0), 0);
    const expensed = boq.reduce((sum, row) => sum + (Number(row.expensed) || 0), 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const outstanding = invoices.filter((invoice) => invoice.status !== "Paid").reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
    return {
      estimated,
      expensed,
      expenses: expenseTotal,
      outstanding,
      openSnags: snags.filter((row) => row.status !== "Fixed").length,
      openTasks: tasks.filter((row) => row.status !== "Done").length,
      pendingVendor: vendors.reduce((sum, vendor) => sum + (Number(vendor.pending) || 0), 0),
      visitsToday: visits.filter((visit) => visit.siteDate === today()).length,
      recentActivity: activity,
    };
  }, [boq, snags, tasks, invoices, expenses, vendors, visits, activity]);

  const signature = JSON.stringify(snapshot);
  useEffect(() => {
    onMetrics(project.id, snapshot);
  }, [onMetrics, project.id, signature]);

  return null;
}

function invoiceTotal(invoice) {
  const subtotal = (invoice.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const afterDiscount = subtotal - (Number(invoice.discount) || 0);
  return afterDiscount + afterDiscount * (Number(invoice.taxPct) || 0) / 100;
}

function emptyMetrics() {
  return { estimated: 0, expensed: 0, expenses: 0, outstanding: 0, openSnags: 0, openTasks: 0, pendingVendor: 0, visitsToday: 0, recentActivity: [] };
}
