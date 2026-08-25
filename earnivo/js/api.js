/** Ledger Light design: all privileged records flow through the Worker, never direct Firestore browser writes. */
import { APP_CONFIG, isConfigured } from "./config.js";
import { waitForAuth } from "./auth.js";
import { apiErrorMessage } from "./testing/behavior-contracts.js";

async function request(path, { method = "GET", body, signal } = {}) {
  if (!isConfigured()) throw new Error("Configure js/config.js before connecting Earnivo to its services.");
  const user = await waitForAuth();
  const headers = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const response = await fetch(`${APP_CONFIG.workerApiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(apiErrorMessage(data)); error.code = data?.error?.code; throw error; }
  return data.data ?? data;
}

export const api = Object.freeze({
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, body, options) => request(path, { ...options, method: "DELETE", body })
});
