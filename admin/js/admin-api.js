// All admin operations call the Cloudflare Worker, which re-verifies the
// caller's admin role server-side. The frontend never asserts role=admin itself.
import { auth, waitForAuth } from "../../js/services/firebase.js";
import { WORKER_BASE_URL } from "../../js/config.js";

async function authedFetch(path, { method = "GET", body } = {}) {
  const user = await waitForAuth();

  console.log("[ADMIN AUTH]", {
    path,
    hasUser: !!user,
    uid: user?.uid || null,
    email: user?.email || null,
  });

  const token = user ? await user.getIdToken() : null;

  console.log("[ADMIN TOKEN]", {
    path,
    hasToken: !!token,
    tokenLength: token?.length || 0,
  });

  const res = await fetch(`${WORKER_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  });

export const AdminApi = {
  stats: (range) => authedFetch(`/admin/stats?range=${range}`),
  listUsers: (q) => authedFetch(`/admin/users?${new URLSearchParams(q)}`),
  listTasks: (q) => authedFetch(`/admin/tasks?${new URLSearchParams(q)}`),
  createTask: (payload) => authedFetch("/admin/tasks", { method: "POST", body: payload }),
  getTask: (id) => authedFetch(`/admin/tasks/${id}`),
  updateTask: (id, payload) => authedFetch(`/admin/tasks/${id}`, { method: "POST", body: payload }),
  listSubmissions: (q) => authedFetch(`/admin/submissions?${new URLSearchParams(q)}`),
  approveSubmission: (id) => authedFetch(`/task/approve`, { method: "POST", body: { submissionId: id } }),
  rejectSubmission: (id, reason) => authedFetch(`/task/reject`, { method: "POST", body: { submissionId: id, reason } }),
  listWithdrawals: (q) => authedFetch(`/admin/withdrawals?${new URLSearchParams(q)}`),
  approveWithdrawal: (id) => authedFetch(`/withdraw/approve`, { method: "POST", body: { withdrawalId: id } }),
  rejectWithdrawal: (id, reason) => authedFetch(`/withdraw/reject`, { method: "POST", body: { withdrawalId: id, reason } }),
  markWithdrawalPaid: (id) => authedFetch(`/withdraw/resolve`, { method: "POST", body: { withdrawalId: id, status: "paid" } }),
  listProviders: () => authedFetch(`/admin/providers`),
  listTransactions: (q) => authedFetch(`/admin/transactions?${new URLSearchParams(q)}`),
  listFraudFlags: (q) => authedFetch(`/admin/fraud?${new URLSearchParams(q)}`),
  resolveFraudFlag: (id, action) => authedFetch(`/admin/fraud/${id}`, { method: "POST", body: { action } }),
  manualBalanceAdjust: (userId, amountRupees, reason) =>
    authedFetch(`/admin/users/${userId}/adjust-balance`, { method: "POST", body: { amountRupees, reason } }),
  suspendUser: (userId, suspend) => authedFetch(`/admin/users/${userId}/suspend`, { method: "POST", body: { suspend } }),
  getUser: (userId) => authedFetch(`/admin/users/${userId}`),
  logs: (q) => authedFetch(`/admin/logs?${new URLSearchParams(q)}`),
  listBroadcasts: () => authedFetch(`/admin/broadcasts`),
  sendNotification: (audience, title, body) => authedFetch(`/admin/notifications/send`, { method: "POST", body: { audience, title, body } }),
};
