"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, isConfigured } from "./firebase";

const AuthContext = createContext(null);

// Role is stored on a `users/{uid}` doc in Firestore.
async function fetchRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// The very first account created becomes the admin. Everyone after that is
// created as "staff" and an admin can promote them (or add them to a site)
// from the Team panel.
async function ensureUserDoc(uid, email, name) {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return existing.data();

  // Is there already an admin anywhere? If not, this is the first user.
  const admins = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
  const role = admins.empty ? "admin" : "staff";
  const data = { uid, email: email || "", name: name || "", role, createdAt: Date.now() };
  await setDoc(ref, data);
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // firebase auth user (or null)
  const [profile, setProfile] = useState(null); // users/{uid} doc (role, name)
  const [authError, setAuthError] = useState(null); // surfaced to the UI
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setAuthError(null);
      if (fbUser) {
        try {
          // Ensure the users/{uid} doc exists (first-ever user becomes admin).
          // This also self-heals the case where the Firestore database was
          // created *after* the account signed in.
          const p = await ensureUserDoc(fbUser.uid, fbUser.email, fbUser.displayName || "");
          setProfile(p);
        } catch (e) {
          setProfile(null);
          setAuthError(e?.message || String(e));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const p = await ensureUserDoc(cred.user.uid, cred.user.email, cred.user.displayName || "");
    setProfile(p);
    return p;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    const p = await ensureUserDoc(cred.user.uid, cred.user.email, name);
    setProfile(p);
    return p;
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);
  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email), []);

  // Keep the local profile in sync with any external change (e.g. admin edits role).
  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchRole(user.uid).catch(() => null);
      setProfile(p);
    }
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    authError,
    isConfigured,
    isAdmin: profile?.role === "admin",
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
