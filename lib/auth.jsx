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
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { auth, db, isConfigured } from "./firebase";
import { normalizeEmail } from "./format";

const AuthContext = createContext(null);

// Role is stored on a `users/{uid}` doc in Firestore.
// We always normalize to { id, uid, ...fields } so the profile object is
// consistent — the doc's own id is the auth uid, but older/migrated docs may
// not have a `uid` field stored *inside* the data. Normalizing here prevents
// "undefined" from leaking into writes (e.g. createdBy).
async function fetchRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, uid, ...snap.data() };
}

// An admin can prepare an invitation in teamInvites/{email}. When that email
// creates an account, the invited role is applied automatically. Accounts
// without an invitation retain the original first-user-admin / later-staff
// behaviour for backwards compatibility with existing installations.
async function ensureUserDoc(uid, email, name) {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return { id: uid, uid, ...existing.data() };

  const emailKey = normalizeEmail(email);
  let invitedRole = "";
  if (emailKey) {
    try {
      const invite = await getDoc(doc(db, "teamInvites", emailKey));
      if (invite.exists() && invite.data()?.email === emailKey) {
        invitedRole = invite.data()?.role === "admin" ? "admin" : "staff";
      }
    } catch (err) {
      // A missing invitation is normal. Rules deliberately allow a signed-in
      // user to check only the invitation document matching their email.
      console.warn("Could not check team invitation:", err?.message || err);
    }
  }

  // Is there already an admin anywhere? If not, this is the first user.
  const admins = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
  const role = invitedRole || (admins.empty ? "admin" : "staff");
  const data = {
    uid,
    email: emailKey || email || "",
    name: name || "",
    role,
    createdAt: Date.now(),
  };
  await setDoc(ref, data);
  return { id: uid, uid, ...data };
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

  // Role changes made by an admin are reflected immediately for the member,
  // without requiring a sign-out/sign-in cycle.
  useEffect(() => {
    if (!user || !db) return undefined;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) setProfile({ id: snap.id, uid: user.uid, ...snap.data() });
      },
      (error) => console.warn("Live profile sync failed:", error?.message || error)
    );
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    const p = await ensureUserDoc(cred.user.uid, cred.user.email, cred.user.displayName || "");
    setProfile(p);
    return p;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const cleanEmail = normalizeEmail(email);
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    const p = await ensureUserDoc(cred.user.uid, cred.user.email, name);
    setProfile(p);
    return p;
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);
  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, normalizeEmail(email)), []);

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
