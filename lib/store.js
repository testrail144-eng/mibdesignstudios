"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

// --- Live subscriptions to Firestore collections/docs -----------------------
// Each hook returns { data, loading, error } and keeps itself in sync via
// onSnapshot, so a change made on one device appears on every other device
// in real time — no manual refresh needed.

export function useDoc(path, fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, path),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : fallback);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, loading, error };
}

export function useCollection(path, options = {}) {
  const { orderBy: orderByField, where: whereClause, limit: limitCount } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryRef = useRef(null);
  queryRef.current = path;

  useEffect(() => {
    if (!db || !path) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = collection(db, path);
    if (whereClause) q = query(q, where(...whereClause));
    if (orderByField) q = query(q, orderBy(orderByField));
    if (limitCount) q = query(q, limit(limitCount));

    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setData(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, orderByField, JSON.stringify(whereClause), limitCount]);

  return { data, loading, error };
}

// Convenience: subscribe to everything about one project in a single hook.
export function useProject(projectId) {
  return {
    boq: useCollection(projectId ? `projects/${projectId}/boq` : null, { orderBy: "createdAt" }),
    vendors: useCollection(projectId ? `projects/${projectId}/vendors` : null, { orderBy: "createdAt" }),
    pos: useCollection(projectId ? `projects/${projectId}/pos` : null, { orderBy: "poDate" }),
    quotations: useCollection(projectId ? `projects/${projectId}/quotations` : null, { orderBy: "createdAt" }),
    milestones: useCollection(projectId ? `projects/${projectId}/milestones` : null, { orderBy: "dueDate" }),
    updates: useCollection(projectId ? `projects/${projectId}/updates` : null, { orderBy: "date" }),
    snags: useCollection(projectId ? `projects/${projectId}/snags` : null, { orderBy: "dateRaised" }),
    tasks: useCollection(projectId ? `projects/${projectId}/tasks` : null, { orderBy: "createdAt" }),
    invoices: useCollection(projectId ? `projects/${projectId}/invoices` : null, { orderBy: "createdAt" }),
  };
}
