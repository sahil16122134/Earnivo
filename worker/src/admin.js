import { json } from "./http.js";
import { AppError, reverseTransaction } from "./reward.js";
import { creditReward } from "./reward.js";

function q(url, key, fallback = null) {
  const v = url.searchParams.get(key);
  return v === null || v === "" ? fallback : v;
}

function businessDateKey(date, timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const SETTINGS_DEFAULTS = {
  minWithdrawRupees: 50,
  dailyWithdrawLimitRupees: 0,
  referralRewardRupees: 20,
  dailyBonusBaseRupees: 2,
  supportEmail: "",
  maintenanceMode: false,
  enabledMethods: ["upi"],
  businessTimezone: "Asia/Kolkata",
};

function validateSettings(payload) {
  const allowed = new Set(Object.keys(SETTINGS_DEFAULTS));
  for (const key of Object.keys(payload || {})) if (!allowed.has(key)) throw new AppError("INVALID_SETTING", `Unsupported setting: ${key}.`);
  const out = {};
  const money = (key, min, max) => {
    if (payload[key] === undefined) return;
    const value = Number(payload[key]);
    if (!Number.isFinite(value) || value < min || value > max) throw new AppError("INVALID_SETTING", `${key} must be between ${min} and ${max}.`);
    out[key] = Math.round(value * 100) / 100;
  };
  money("minWithdrawRupees", 0.01, 1000000);
  money("dailyWithdrawLimitRupees", 0, 10000000);
  money("referralRewardRupees", 0, 1000000);
  money("dailyBonusBaseRupees", 0.01, 100000);
  if (payload.supportEmail !== undefined) {
    if (typeof payload.supportEmail !== "string" || payload.supportEmail.length > 254 || (payload.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.supportEmail))) throw new AppError("INVALID_SETTING", "supportEmail is invalid.");
    out.supportEmail = payload.supportEmail.trim();
  }
  if (payload.maintenanceMode !== undefined) {
    if (typeof payload.maintenanceMode !== "boolean") throw new AppError("INVALID_SETTING", "maintenanceMode must be boolean.");
    out.maintenanceMode = payload.maintenanceMode;
  }
  if (payload.enabledMethods !== undefined) {
    if (!Array.isArray(payload.enabledMethods) || payload.enabledMethods.length === 0 || payload.enabledMethods.some((m) => !["upi", "amazon", "flipkart", "myntra"].includes(m))) throw new AppError("INVALID_SETTING", "enabledMethods contains an unsupported method.");
    out.enabledMethods = [...new Set(payload.enabledMethods)];
  }
  if (payload.businessTimezone !== undefined) {
    if (typeof payload.businessTimezone !== "string" || payload.businessTimezone.length > 64) throw new AppError("INVALID_SETTING", "businessTimezone is invalid.");
    try { new Intl.DateTimeFormat("en-CA", { timeZone: payload.businessTimezone }).format(); } catch { throw new AppError("INVALID_SETTING", "businessTimezone is invalid."); }
    out.businessTimezone = payload.businessTimezone;
  }
  return out;
}

export async function handleAdminStats(request, env, firestore) {
  const url = new URL(request.url);
  const range = q(url, "range", "7d");
  const since = rangeToDate(range);

  const [users, transactions, withdrawals, settings] = await Promise.all([
    firestore.runQuery("users"),
    firestore.runQuery("transactions", { where: [["createdAt", "GREATER_THAN_OR_EQUAL", since]], limit: 1000 }),
    firestore.runQuery("withdrawals", { where: [["status", "EQUAL", "pending"]], limit: 500 }),
    firestore.getDoc("settings/platform"),
  ]);

  const userRewards = transactions.filter((t) => t.amountRupees > 0 && t.type !== "manual_credit").reduce((s, t) => s + t.amountRupees, 0);
  // NOTE: revenue/profit/providerCosts below are an ESTIMATE (userRewards *
  // a fixed assumed margin), not real provider payout data — there is no
  // provider integration yet that reports actual network revenue. Flagged
  // as `isEstimate: true` so the admin UI can label it instead of presenting
  // it as a real, measured figure.
  const revenue = userRewards * 1.4;
  const profit = revenue - userRewards;

  const bySource = {};
  for (const t of transactions) {
    if (t.amountRupees <= 0) continue;
    bySource[t.type] = (bySource[t.type] || 0) + t.amountRupees;
  }

  return json({
    totalUsers: users.length,
    activeToday: users.filter((u) => u.updatedAt && businessDateKey(new Date(u.updatedAt), settings?.businessTimezone || SETTINGS_DEFAULTS.businessTimezone) === businessDateKey(new Date(), settings?.businessTimezone || SETTINGS_DEFAULTS.businessTimezone)).length,
    revenue, userRewards, profit, isEstimate: true,
    pendingWithdrawals: withdrawals.length,
    providerCosts: userRewards * 0.9,
    withdrawalsTotal: withdrawals.reduce((s, w) => s + (w.amountRupees || 0), 0),
    earningSources: Object.entries(bySource).map(([label, amountRupees]) => ({ label, amountRupees })),
    byProvider: [],
    byType: Object.entries(bySource).map(([type, revenue]) => ({ type, revenue, userRewards: revenue, profit: 0 })),
    recentActivity: transactions.slice(0, 10).map((t) => ({ event: t.type, actor: t.userId, detail: t.description, timestamp: t.createdAt })),
  });
}

function rangeToDate(range) {
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[range] || 7;
  return new Date(Date.now() - days * 86400000).toISOString();
}

export async function handleAdminListUsers(request, env, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const search = q(url, "q", "").trim().toLowerCase();
  let users = await firestore.runQuery("users", { limit: 200 });
  if (status === "Active") users = users.filter((u) => !u.suspended);
  if (status === "Suspended") users = users.filter((u) => u.suspended);
  users = users.map((u) => ({ ...u, riskLevel: u.riskLevel || "Low" }));
  if (status === "High Risk") users = users.filter((u) => u.riskLevel === "High");
  if (search) {
    users = users.filter((u) =>
      (u.displayName || "").toLowerCase().includes(search) ||
      (u.email || "").toLowerCase().includes(search) ||
      u.id.toLowerCase().includes(search)
    );
  }

  // referralCount isn't stored on the user doc (referrals are tracked in a
  // separate `referrals` collection), so compute it here for display.
  if (users.length > 0) {
    const allReferrals = await firestore.runQuery("referrals", { limit: 1000 });
    const counts = {};
    for (const r of allReferrals) counts[r.referrerId] = (counts[r.referrerId] || 0) + 1;
    users = users.map((u) => ({ ...u, referralCount: counts[u.id] || 0 }));
  }

  return json(users);
}

export async function handleAdminGetUserDetail(request, env, firestore, userId) {
  const user = await firestore.getDoc(`users/${userId}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);

  const [transactions, withdrawals, submissions, referred, referralsMade] = await Promise.all([
    firestore.runQuery("transactions", { where: [["userId", "EQUAL", userId]], orderBy: ["createdAt", "DESCENDING"], limit: 50 }),
    firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", userId]], orderBy: ["createdAt", "DESCENDING"], limit: 50 }),
    firestore.runQuery("taskSubmissions", { where: [["userId", "EQUAL", userId]], limit: 50 }),
    firestore.runQuery("referrals", { where: [["referredId", "EQUAL", userId]], limit: 1 }),
    firestore.runQuery("referrals", { where: [["referrerId", "EQUAL", userId]], limit: 200 }),
  ]);

  return json({
    user,
    transactions, withdrawals, submissions,
    referredBy: referred[0] || null,
    referralsMade,
  });
}

export async function handleAdminSuspendUser(request, env, firestore, userId, adminUid) {
  const { suspend } = await request.json();
  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  await firestore.setDoc(`users/${userId}`, { ...userMeta.doc, suspended: !!suspend, updatedAt: new Date().toISOString() }, { updateTime: userMeta.updateTime });
  await writeAdminLog(firestore, adminUid, suspend ? "user_suspended" : "user_unsuspended", userId, {});
  return json({ suspended: !!suspend });
}

export async function handleAdminAdjustBalance(request, env, firestore, userId, adminUid) {
  const { amountRupees, reason } = await request.json();
  if (typeof amountRupees !== "number" || !Number.isFinite(amountRupees) || amountRupees === 0) {
    throw new AppError("INVALID_INPUT", "amountRupees must be a non-zero number.");
  }

  if (amountRupees > 0) {
    const result = await creditReward(firestore, {
      userId, amountRupees, type: "manual_credit", source: "admin",
      providerTransactionId: `manual:${crypto.randomUUID()}`, description: reason || "Manual credit",
      metadata: { adminUid },
    });
    await writeAdminLog(firestore, adminUid, "manual_credit", userId, { amountRupees, reason });
    return json({ transactionId: result.transactionId });
  } else {
    const user = await firestore.getDoc(`users/${userId}`);
    if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
    if ((user.balanceRupees || 0) + amountRupees < 0) {
      throw new AppError("INSUFFICIENT_BALANCE", "This debit would take the user's balance below zero.");
    }
    const result = await reverseTransaction(firestore, {
      originalTransactionId: null, userId, amountRupees, reason: reason || "Manual debit", type: "manual_debit",
      // Keep coinBalance in step with balanceRupees on manual debits too,
      // same as withdrawal debits — otherwise the two ledgers drift apart.
      coinDelta: Math.round(amountRupees * 100),
    });
    await writeAdminLog(firestore, adminUid, "manual_debit", userId, { amountRupees, reason });
    return json({ transactionId: result.transactionId });
  }
}

export async function handleAdminListTasks(request, env, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const search = q(url, "q", "").trim().toLowerCase();
  let tasks = await firestore.runQuery("tasks", { limit: 300 });
  if (status !== "All") tasks = tasks.filter((t) => (t.status || "").toLowerCase() === status.toLowerCase());
  if (search) tasks = tasks.filter((t) => [t.title, t.provider, t.category].some((v) => String(v || "").toLowerCase().includes(search)));
  return json(tasks);
}

export async function handleAdminGetTask(request, env, firestore, taskId) {
  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task) throw new AppError("NOT_FOUND", "Task not found.", 404);
  const internal = await firestore.getDoc(`taskInternal/${taskId}`);
  return json({ ...task, notes: internal?.notes || "" });
}

export async function handleAdminCreateTask(request, env, firestore, adminUid) {
  const payload = await request.json();
  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { notes, ...publicPayload } = payload;
  await firestore.createDoc("tasks", taskId, { ...publicPayload, iconUrl: publicPayload.iconUrl || publicPayload.icon || "", id: taskId, completions: 0, createdAt: now, updatedAt: now });
  if (notes) await firestore.setDoc(`taskInternal/${taskId}`, { taskId, notes, updatedAt: now });
  await writeAdminLog(firestore, adminUid, "task_created", taskId, { title: payload.title });
  return json({ id: taskId });
}

export async function handleAdminUpdateTask(request, env, firestore, taskId, adminUid) {
  const payload = await request.json();
  const existingMeta = await firestore.getDocMeta(`tasks/${taskId}`);
  if (!existingMeta) throw new AppError("NOT_FOUND", "Task not found.", 404);
  const existing = existingMeta.doc;
  const { notes, ...publicPayload } = payload;
  await firestore.setDoc(`tasks/${taskId}`, { ...existing, ...publicPayload, completions: existing.completions || 0, iconUrl: publicPayload.iconUrl || existing.iconUrl || existing.icon || "", updatedAt: new Date().toISOString() }, { updateTime: existingMeta.updateTime });
  if (notes !== undefined) await firestore.setDoc(`taskInternal/${taskId}`, { taskId, notes: String(notes || ""), updatedAt: new Date().toISOString() });
  await writeAdminLog(firestore, adminUid, "task_updated", taskId, { ...publicPayload, notesChanged: notes !== undefined });
  return json({ id: taskId });
}

export async function handleAdminListSubmissions(request, env, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  const map = { "Pending": "verification", "Approved": "completed", "Rejected": "failed", "In Progress": "in_progress", "Verification": "verification", "Completed": "completed", "Failed": "failed" };
  const kind = q(url, "kind", "");
  let items = await firestore.runQuery("taskSubmissions", { orderBy: ["startedAt", "DESCENDING"], limit: 300 });
  if (status !== "All" && map[status]) items = items.filter((s) => s.status === map[status]);
  if (kind === "ongoing") items = items.filter((s) => s.status === "in_progress" || s.status === "verification");
  return json(items);
}

export async function handleAdminListWithdrawals(request, env, firestore) {
  const url = new URL(request.url);
  const status = q(url, "status", "All");
  let items = await firestore.runQuery("withdrawals", { orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  if (status !== "All") items = items.filter((w) => w.status === status.toLowerCase());
  return json(items);
}

export async function handleAdminListTransactions(request, env, firestore) {
  const items = await firestore.runQuery("transactions", { orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  return json(items);
}

export async function handleAdminListProviders(request, env, firestore) {
  const items = await firestore.runQuery("providers", { limit: 100 });
  return json(items);
}

export async function handleAdminListFraud(request, env, firestore) {
  const url = new URL(request.url);
  const risk = q(url, "risk", "All");
  let items = await firestore.runQuery("fraudFlags", { orderBy: ["detectedAt", "DESCENDING"], limit: 200 });
  items = items.map((f) => ({ ...f, riskLevel: f.riskLevel || f.risk || "Low" }));
  if (risk !== "All") items = items.filter((f) => (f.riskLevel || "").toLowerCase() === risk.toLowerCase());
  return json(items);
}

export async function handleAdminResolveFraud(request, env, firestore, flagId, adminUid) {
  const { action } = await request.json(); // review | suspend | clear
  const flagMeta = await firestore.getDocMeta(`fraudFlags/${flagId}`);
  if (!flagMeta) throw new AppError("NOT_FOUND", "Flag not found.", 404);
  const flag = flagMeta.doc;

  const normalizedRisk = flag.riskLevel || flag.risk || (action === "suspend" ? "High" : "Low");
  const writes = [{ path: `fraudFlags/${flagId}`, data: { ...flag, riskLevel: normalizedRisk, status: action === "clear" ? "cleared" : action, resolvedAt: new Date().toISOString() }, condition: { updateTime: flagMeta.updateTime } }];
  if (flag.userId) {
    const userMeta = await firestore.getDocMeta(`users/${flag.userId}`);
    if (userMeta) writes.push({ path: `users/${flag.userId}`, data: { ...userMeta.doc, riskLevel: action === "clear" ? "Low" : normalizedRisk, suspended: action === "suspend" ? true : userMeta.doc.suspended }, condition: { updateTime: userMeta.updateTime } });
  }
  await firestore.commit(writes);
  await writeAdminLog(firestore, adminUid, `fraud_${action}`, flagId, {});
  return json({ status: action });
}

export async function handleAdminListBroadcasts(request, env, firestore) {
  const items = await firestore.runQuery("broadcasts", { orderBy: ["sentAt", "DESCENDING"], limit: 100 });
  return json(items);
}

export async function handleAdminSendNotification(request, env, firestore, adminUid) {
  const { audience, title, body } = await request.json();
  if (!title || !body) throw new AppError("INVALID_INPUT", "title and body are required.");
  if (!["all", "active", "suspended"].includes(audience)) throw new AppError("INVALID_INPUT", "audience must be 'all', 'active', or 'suspended'.");

  let users = await firestore.runQuery("users");
  if (audience === "active") users = users.filter((u) => !u.suspended);
  if (audience === "suspended") users = users.filter((u) => u.suspended);

  const now = new Date().toISOString();
  const results = [];
  const chunkSize = 25;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((u) => firestore.createDoc(`users/${u.id}/notifications`, crypto.randomUUID(), { category: "system", title, body, read: false, createdAt: now })));
    results.push(...chunkResults);
  }
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;
  const broadcastId = crypto.randomUUID();
  await firestore.createDoc("broadcasts", broadcastId, { title, body, audience, attemptedCount: results.length, sentCount: sent, failedCount: failed, sentBy: adminUid, sentAt: now });
  await writeAdminLog(firestore, adminUid, "notification_broadcast", broadcastId, { audience, title, attemptedCount: results.length, sentCount: sent, failedCount: failed });
  return json({ broadcastId, attemptedCount: results.length, sentCount: sent, failedCount: failed, partialFailure: failed > 0 });
}

export async function handleAdminSettingsGet(request, env, firestore) {
  const settings = await firestore.getDoc("settings/platform");
  return json({ ...SETTINGS_DEFAULTS, ...(settings || {}) });
}

export async function handleAdminSettingsSet(request, env, firestore, adminUid) {
  const payload = await request.json();
  const validated = validateSettings(payload);
  const existing = await firestore.getDoc("settings/platform");
  await firestore.setDoc("settings/platform", { ...SETTINGS_DEFAULTS, ...(existing || {}), ...validated, updatedAt: new Date().toISOString() });
  await writeAdminLog(firestore, adminUid, "settings_updated", "platform", validated);
  return json({ saved: true });
}

export async function handleAdminLogs(request, env, firestore) {
  const url = new URL(request.url);
  const type = q(url, "type", "All");
  const CATEGORY_MAP = {
    Task: ["task_created", "task_updated"],
    User: ["manual_credit", "manual_debit", "fraud_review", "fraud_suspend", "fraud_clear", "user_suspended", "user_unsuspended"],
    Withdrawal: ["withdrawal_approved", "withdrawal_paid", "withdrawal_rejected"],
    Settings: ["settings_updated"],
  };
  let items = await firestore.runQuery("adminLogs", { orderBy: ["timestamp", "DESCENDING"], limit: 200 });
  if (type !== "All" && CATEGORY_MAP[type]) items = items.filter((l) => CATEGORY_MAP[type].includes(l.action));
  return json(items);
}

export async function writeAdminLog(firestore, adminUid, action, target, details) {
  const id = crypto.randomUUID();
  await firestore.createDoc("adminLogs", id, { admin: adminUid, action, target: String(target), details, timestamp: new Date().toISOString() });
}
