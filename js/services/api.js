
import { auth, waitForAuth } from "./firebase.js";
import { WORKER_BASE_URL } from "../config.js";

const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_CACHE_MS = 30000;

let cachedToken = null;
let cachedTokenAt = 0;

async function getAuthToken() {
  const user = await waitForAuth();

  if (!user) return null;

  const now = Date.now();

  if (cachedToken && now - cachedTokenAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }

  const token = await Promise.race([
    user.getIdToken(),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new ApiError(
              "AUTH_TIMEOUT",
              "Authentication is taking too long. Please try again."
            )
          ),
        REQUEST_TIMEOUT_MS
      )
    ),
  ]);

  cachedToken = token;
  cachedTokenAt = now;

  return token;
}

async function authedFetch(
  path,
  {
    method = "GET",
    body,
    authRequired = true,
  } = {}
) {
  let token = null;

  if (authRequired) {
    token = await getAuthToken();
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let res;

  try {
    res = await fetch(`${WORKER_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        "TIMEOUT",
        "The server took too long to respond."
      );
    }

    throw new ApiError(
      "NETWORK_ERROR",
      "Unable to connect to the server."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let json;

  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      "BAD_RESPONSE",
      "The server returned an invalid response."
    );
  }

  if (!res.ok || json.success === false) {
    const err = json.error || {};

    throw new ApiError(
      err.code || "UNKNOWN",
      err.message || "Something went wrong."
    );
  }

  return json.data;
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export const Api = {
  // Public endpoints
  getPublicSettings: () =>
    authedFetch("/settings/public", {
      authRequired: false,
    }),

  getTasks: () =>
    authedFetch("/tasks"),

  getTask: (taskId) =>
    authedFetch(`/tasks/${encodeURIComponent(taskId)}`),

  getDailyBonusSchedule: () =>
    authedFetch("/daily-bonus-schedule"),

  // Authenticated user endpoints
  getMe: () =>
    authedFetch("/user"),

  getTransactions: (params = {}) =>
    authedFetch(
      `/transactions?${new URLSearchParams(params)}`
    ),

  getWithdrawals: () =>
    authedFetch("/withdrawals"),

  startTask: (taskId) =>
    authedFetch("/task/start", {
      method: "POST",
      body: { taskId },
    }),

  submitTaskProof: (
    taskId,
    proof,
    submissionId,
    attemptId
  ) =>
    authedFetch("/task/submit", {
      method: "POST",
      body: {
        taskId,
        proof,
        submissionId,
        attemptId,
      },
    }),

  claimDailyBonus: () =>
    authedFetch("/daily-login-reward", {
      method: "POST",
    }),

  recordReferral: (referralCode) =>
    authedFetch("/record-referral", {
      method: "POST",
      body: { referralCode },
    }),

  claimAdReward: (
    placementId,
    providerToken
  ) =>
    authedFetch("/watch-ad-reward", {
      method: "POST",
      body: {
        placementId,
        providerToken,
      },
    }),

  requestWithdrawal: (payload) =>
    authedFetch("/withdraw", {
      method: "POST",
      body: payload,
    }),

  adminStats: (range = "7d") =>
    authedFetch(
      `/admin/stats?range=${encodeURIComponent(range)}`
    ),
};