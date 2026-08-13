"use client";

import { useState } from "react";
import { useCollection } from "@/lib/store";
import { money } from "@/lib/format";
import { Panel, Empty, Badge } from "../ui";

// Cross-site analytics: profit/loss and spend per project across the whole
// company, with a lightweight dependency-free bar chart.
export default function Dashboard() {
  const projects = useCollection("projects").data || [];
  const [rows, setRows] = useState(null);

  // We compute numbers per project by subscribing to each project's BOQ.
  // To keep this simple and robust we render one row per project and, for the
  // chart, use the project-level stored aggregates when available.
  return (
    <>
      <Panel title="All sites — overview">
        {projects.length === 0 ? (
          <Empty>No sites yet. Create one to see company-wide numbers.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Client</th>
                <th className="num">Contract value</th>
                <th className="num">Estimated</th>
                <th className="num">Expensed</th>
                <th className="num">Variance</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Budget used per site">
        {projects.length === 0 ? (
          <Empty>No data yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects.map((p) => (
              <ProjectBar key={p.id} project={p} />
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

function ProjectRow({ project }) {
  const { useCollection } = require("@/lib/store");
  const boq = useCollection(`projects/${project.id}/boq`).data || [];
  const est = boq.reduce((s, r) => s + (Number(r.estimated) || 0), 0);
  const exp = boq.reduce((s, r) => s + (Number(r.expensed) || 0), 0);
  const v = est - exp;
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{project.name}</td>
      <td>{project.client || "—"}</td>
      <td className="num">{money(project.contractValue)}</td>
      <td className="num">{money(est)}</td>
      <td className="num">{money(exp)}</td>
      <td className="num" style={{ color: v < 0 ? "var(--rust)" : "var(--green)" }}>{money(v)}</td>
    </tr>
  );
}

function ProjectBar({ project }) {
  const { useCollection } = require("@/lib/store");
  const boq = useCollection(`projects/${project.id}/boq`).data || [];
  const est = boq.reduce((s, r) => s + (Number(r.estimated) || 0), 0);
  const exp = boq.reduce((s, r) => s + (Number(r.expensed) || 0), 0);
  const pct = est ? Math.min(100, Math.round((exp / est) * 100)) : 0;
  const over = exp > est;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{project.name}</span>
        <span className="mono" style={{ color: "var(--ink-2)" }}>
          {money(exp)} / {money(est)} · {pct}%
        </span>
      </div>
      <div style={{ height: 10, background: "var(--paper-line)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: over ? "var(--rust)" : "var(--green)" }} />
      </div>
    </div>
  );
}
