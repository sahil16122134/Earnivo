/** Ledger Light design: public Firebase settings live here; never store service-account credentials in browser code. */
export const APP_CONFIG = Object.freeze({
  appName: "Earnivo",
  workerApiUrl: "https://REPLACE_WITH_YOUR_WORKER.workers.dev",
  firebase: {
    apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
    authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
    projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
    storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_FIREBASE_APP_ID"
  }
});

export const isConfigured = () => !Object.values(APP_CONFIG.firebase).some((value) => value.startsWith("REPLACE_"))
  && !APP_CONFIG.workerApiUrl.includes("REPLACE_");

