/** Ledger Light design: Firebase is initialized once and remains behind a clear configuration guard. */
import { APP_CONFIG, isConfigured } from "../config.js";

let firebaseServices = null;

export async function getFirebaseServices() {
  if (!isConfigured()) {
    throw new Error("Earnivo has not been configured yet. Add Firebase settings and the Worker URL in js/config.js.");
  }
  if (firebaseServices) return firebaseServices;

  const [{ initializeApp, getApps }, authModule, firestoreModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
  ]);
  const app = getApps().length ? getApps()[0] : initializeApp(APP_CONFIG.firebase);
  firebaseServices = {
    app,
    auth: authModule.getAuth(app),
    firestore: firestoreModule.getFirestore(app),
    authModule,
    firestoreModule
  };
  return firebaseServices;
}

