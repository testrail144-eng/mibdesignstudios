"use client";

import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext({ confirm: () => Promise.resolve(true), notify: () => {} });

// Global in-app dialogs & toasts — replaces the browser's native confirm()
// and alert() pop-ups so nothing ever flashes a browser dialog.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // confirmation dialog
  const [toast, setToast] = useState(null); // transient notice

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const confirm = (message, opts = {}) =>
    new Promise((resolve) => setState({ message, resolve, ...opts }));

  const notify = (message) => setToast(message);

  const close = (val) => {
    state?.resolve(val);
    setState(null);
  };

  return (
    <Ctx.Provider value={{ confirm, notify }}>
      {children}

      {state && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <h3>{state.title || "Are you sure?"}</h3>
            <p>{state.message}</p>
            <div className="modal-actions">
              <button className={"btn " + (state.danger ? "rust" : "")} onClick={() => close(true)}>
                {state.confirmText || "Confirm"}
              </button>
              <button className="btn ghost" onClick={() => close(false)}>
                {state.cancelText || "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "11px 18px",
            borderRadius: 4,
            fontSize: 13,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            zIndex: 300,
            maxWidth: "90vw",
          }}
        >
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  return useContext(Ctx);
}
