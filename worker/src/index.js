import { createFirestoreClient } from "./firestore.js";
import { requireAdmin } from "./firebaseAuth.js";
import { corsHeaders, json, jsonError, rateLimit } from "./http.js";
import { AppError } from "./reward.js";
import {
  handleGetPublicSettings,
  handleGetUser, handleGetTransactions, handleGetWithdrawals,
  handleListTasks, handleGetTask, handleTaskStart, handleTaskSubmit, handleTaskApprove, handleTaskReject,
  handleDailyLoginReward, handleDailyBonusSchedule, handleRecordReferral, handleWatchAdReward, handleScheduledMaintenance,
  handleWithdraw, handleWithdrawApprove, handleWithdrawResolve, handleWithdrawReject,
} from "./routes.js";
import {
  handleProviderGenericPostback, handleAdsgramPostback, handleSurveyPostback, handleOfferPostback,
} from "./postbacks.js";
import { handleEnsureUser } from "./userAuth.js";
import {
  handleAdminStats, handleAdminListUsers, handleAdminGetUserDetail, handleAdminSuspendUser, handleAdminAdjustBalance,
  handleAdminListTasks, handleAdminGetTask, handleAdminCreateTask, handleAdminUpdateTask, handleAdminListSubmissions,
  handleAdminListWithdrawals, handleAdminListTransactions, handleAdminListProviders,
  handleAdminListFraud, handleAdminResolveFraud, handleAdminSettingsGet, handleAdminSettingsSet, handleAdminLogs,
  handleAdminSendNotification, handleAdminListBroadcasts,
} from "./admin.js";

// Endpoints that must be rate-limited more strictly (financial / auth-sensitive).
const SENSITIVE_PREFIXES = ["/withdraw", "/task/", "/daily-login-reward", "/watch-ad-reward", "/record-referral", "/auth/ensure-user", "/provider/", "/adsgram/", "/survey/", "/offer/"];

export default {
  async scheduled(event, env, ctx) {
    const firestore = createFirestoreClient(env);
    ctx.waitUntil(handleScheduledMaintenance(firestore));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { headers });

    try {
      const firestore = createFirestoreClient(env);

      // Basic per-IP rate limiting on sensitive endpoints.
      if (SENSITIVE_PREFIXES.some((p) => url.pathname.startsWith(p))) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        if (!rateLimit(`${ip}:${url.pathname}`, { limit: 20, windowMs: 60_000 })) {
          throw new AppError("RATE_LIMITED", "Too many requests. Please slow down.", 429);
        }
      }

      const res = await route(request, env, firestore, url);
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
      return res;
    } catch (err) {
console.error("[WORKER ERROR]", err?.stack || err);
      const res = jsonError(err, { status: err instanceof AppError ? err.status : 500 });
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
      return res;
    }
  },
};

async function route(request, env, firestore, url) {
  const { pathname } = url;
  const method = request.method;

  // ---- Auth ----
  // Client signs in directly via the Firebase Auth SDK (email/password,
  // Google, etc.). This endpoint just bootstraps/refreshes the Firestore
  // profile doc, which the client itself isn't allowed to create/write to
  // for financial fields (see firestore.rules).
  if (pathname === "/auth/ensure-user" && method === "POST") return handleEnsureUser(request, env, firestore);

  // ---- User-facing ----
  if (pathname === "/settings/public" && method === "GET") return handleGetPublicSettings(request, env, firestore);
  if (pathname === "/user" && method === "GET") return handleGetUser(request, env, firestore);
  if (pathname === "/transactions" && method === "GET") return handleGetTransactions(request, env, firestore);
  if (pathname === "/withdrawals" && method === "GET") return handleGetWithdrawals(request, env, firestore);

  if (pathname === "/tasks" && method === "GET") return handleListTasks(request, env, firestore);
  if (pathname.match(/^\/tasks\/[^/]+$/) && method === "GET") return handleGetTask(request, env, firestore, pathname.split("/")[2]);
  if (pathname === "/task/start" && method === "POST") return handleTaskStart(request, env, firestore);
  if (pathname === "/task/submit" && method === "POST") return handleTaskSubmit(request, env, firestore);

  if (pathname === "/daily-bonus-schedule" && method === "GET") return handleDailyBonusSchedule(request, env, firestore);
  if (pathname === "/daily-login-reward" && method === "POST") return handleDailyLoginReward(request, env, firestore);
  if (pathname === "/record-referral" && method === "POST") return handleRecordReferral(request, env, firestore);
  if (pathname === "/watch-ad-reward" && method === "POST") return handleWatchAdReward(request, env, firestore);

  if (pathname === "/withdraw" && method === "POST") return handleWithdraw(request, env, firestore);

  // ---- Provider postbacks (secret-authenticated, not user-authenticated) ----
  if (pathname === "/provider/postback" && method === "POST") return handleProviderGenericPostback(request, env, firestore);
  if (pathname === "/adsgram/postback" && method === "POST") return handleAdsgramPostback(request, env, firestore);
  if (pathname === "/survey/postback" && method === "POST") return handleSurveyPostback(request, env, firestore);
  if (pathname === "/offer/postback" && method === "POST") return handleOfferPostback(request, env, firestore);

  // ---- Diagnostics ----
  if (pathname === "/diagnose" && method === "GET") return json({ ok: true, time: new Date().toISOString() });

  // ---- Admin (every branch re-verifies admin role server-side) ----
  if (pathname.startsWith("/admin/") || pathname.startsWith("/withdraw/") || pathname.startsWith("/task/approve") || pathname.startsWith("/task/reject")) {
    const adminCheck = await requireAdmin(request, env, firestore);
    if (!adminCheck.ok) throw new AppError(adminCheck.error, adminCheck.error === "FORBIDDEN" ? "Admin access required." : "Sign-in required.", adminCheck.status);
    const adminUid = adminCheck.uid;

    if (pathname === "/task/approve" && method === "POST") return handleTaskApprove(request, env, firestore, adminUid);
    if (pathname === "/task/reject" && method === "POST") return handleTaskReject(request, env, firestore, adminUid);
    if (pathname === "/withdraw/approve" && method === "POST") return handleWithdrawApprove(request, env, firestore, adminUid);
    if (pathname === "/withdraw/reject" && method === "POST") return handleWithdrawReject(request, env, firestore, adminUid);
    if (pathname === "/withdraw/resolve" && method === "POST") return handleWithdrawResolve(request, env, firestore, adminUid);

    if (pathname === "/admin/stats" && method === "GET") return handleAdminStats(request, env, firestore);
    if (pathname === "/admin/users" && method === "GET") return handleAdminListUsers(request, env, firestore);
    if (pathname.match(/^\/admin\/users\/[^/]+$/) && method === "GET")
      return handleAdminGetUserDetail(request, env, firestore, pathname.split("/")[3]);
    if (pathname.match(/^\/admin\/users\/[^/]+\/suspend$/) && method === "POST")
      return handleAdminSuspendUser(request, env, firestore, pathname.split("/")[3], adminUid);
    if (pathname.match(/^\/admin\/users\/[^/]+\/adjust-balance$/) && method === "POST")
      return handleAdminAdjustBalance(request, env, firestore, pathname.split("/")[3], adminUid);

    if (pathname === "/admin/tasks" && method === "GET") return handleAdminListTasks(request, env, firestore);
    if (pathname === "/admin/tasks" && method === "POST") return handleAdminCreateTask(request, env, firestore, adminUid);
    if (pathname.match(/^\/admin\/tasks\/[^/]+$/) && method === "GET")
      return handleAdminGetTask(request, env, firestore, pathname.split("/")[3]);
    if (pathname.match(/^\/admin\/tasks\/[^/]+$/) && method === "POST")
      return handleAdminUpdateTask(request, env, firestore, pathname.split("/")[3], adminUid);

    if (pathname === "/admin/submissions" && method === "GET") return handleAdminListSubmissions(request, env, firestore);
    if (pathname === "/admin/withdrawals" && method === "GET") return handleAdminListWithdrawals(request, env, firestore);
    if (pathname === "/admin/transactions" && method === "GET") return handleAdminListTransactions(request, env, firestore);
    if (pathname === "/admin/providers" && method === "GET") return handleAdminListProviders(request, env, firestore);

    if (pathname === "/admin/fraud" && method === "GET") return handleAdminListFraud(request, env, firestore);
    if (pathname.match(/^\/admin\/fraud\/[^/]+$/) && method === "POST")
      return handleAdminResolveFraud(request, env, firestore, pathname.split("/")[3], adminUid);

    if (pathname === "/admin/settings" && method === "GET") return handleAdminSettingsGet(request, env, firestore);
    if (pathname === "/admin/settings" && method === "POST") return handleAdminSettingsSet(request, env, firestore, adminUid);

    if (pathname === "/admin/logs" && method === "GET") return handleAdminLogs(request, env, firestore);
    if (pathname === "/admin/notifications/send" && method === "POST") return handleAdminSendNotification(request, env, firestore, adminUid);
    if (pathname === "/admin/broadcasts" && method === "GET") return handleAdminListBroadcasts(request, env, firestore);
  }

  throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
}
