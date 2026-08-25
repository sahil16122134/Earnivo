/** Ledger Light design: auth always waits for Firebase restoration before protecting a page. */
import { getFirebaseServices } from "./services/firebase.js";
import { loginRedirectPath } from "./testing/behavior-contracts.js";

let authReadyPromise = null;

export async function waitForAuth() {
  if (authReadyPromise) return authReadyPromise;
  authReadyPromise = getFirebaseServices().then(({ auth, authModule }) => new Promise((resolve, reject) => {
    const unsubscribe = authModule.onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  }));
  return authReadyPromise;
}

export async function signInWithEmail(email, password) {
  const { auth, authModule } = await getFirebaseServices();
  return authModule.signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
  const { auth, authModule } = await getFirebaseServices();
  return authModule.createUserWithEmailAndPassword(auth, email, password);
}

export async function deleteAuthUser(user) {
  const { authModule } = await getFirebaseServices();
  await authModule.deleteUser(user);
  authReadyPromise = null;
}

export async function signOutUser() {
  const { auth, authModule } = await getFirebaseServices();
  await authModule.signOut(auth);
  window.location.assign("/pages/login.html");
}

export async function requireUser({ admin = false } = {}) {
  const user = await waitForAuth();
  if (!user) {
    const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(loginRedirectPath(requestedPath, { admin }));
    return null;
  }
  if (admin) {
    const { api } = await import("./api.js");
    const profile = await api.get("/v1/admin/session");
    if (!profile.isAdmin) {
      window.location.assign("/pages/home.html");
      return null;
    }
  }
  return user;
}
