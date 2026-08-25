// ─────────────────────────────────────────────────────────────────────────
// REQUIRED CONFIG — this is the ONE place Firebase Web config lives.
// This is your Firebase project's public client config (Project Settings →
// General → "Your apps" → Web app). It is safe to ship in frontend JS — it
// is not a secret (Firestore/Firebase Auth security comes from Firestore
// Rules + the Worker's server-side checks, not from hiding this object).
//
// Get it from: Firebase Console → ⚙️ Project Settings → General →
// scroll to "Your apps" → select your web app → "SDK setup and configuration".
// ─────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCB5T2i_wMUc_hEUkjMQIcekB9yWjk5zFs",
  authDomain: "earnivo-edac2.firebaseapp.com",
  projectId: "earnivo-edac2",
  storageBucket: "earnivo-edac2.firebasestorage.app",
  messagingSenderId: "603238592685",
  appId: "1:603238592685:web:83eb245d062c3e36021624",
  measurementId: "G-8W2F9J5L5L"
};

if (firebaseConfig.apiKey === "REPLACE_ME") {
  // Fail loudly and clearly instead of letting the Firebase SDK throw a
  // cryptic low-level error later. See README.md → "Firebase Web config".
  console.error(
    "[Earnivo] Firebase is not configured yet. Open js/services/firebase.js " +
    "and paste your Firebase project's Web app config (Firebase Console → " +
    "Project Settings → General → Your apps)."
  );
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where, orderBy, limit, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let authReadyPromise;

let authReadyPromise;

export function waitForAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  return authReadyPromise;
}
export const db = getFirestore(app);
export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";

// ---- Safe direct reads only (no writes to financial fields from client) ----
// Sensitive/financial operations always go through the Cloudflare Worker (see api.js).

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export function watchUserProfile(uid, cb) {
  return onSnapshot(doc(db, "users", uid), (snap) => cb(snap.exists() ? snap.data() : null));
}

// Public task data is loaded through Api.getTasks()/Api.getTask(), which strips
// internal fields and enforces server-side eligibility. This legacy helper is
// intentionally removed to prevent direct task reads from bypassing that layer.

export function watchUserNotifications(uid, cb, max = 20) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

