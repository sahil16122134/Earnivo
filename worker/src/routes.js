import { verifyIdToken } from "./firebaseAuth.js";
import { creditReward, reverseTransaction, AppError } from "./reward.js";
import { json } from "./http.js";
import { writeAdminLog } from "./admin.js";

// Platform-configurable values live in settings/platform (editable from the
// admin Settings page). These defaults are used whenever that doc is
// missing a field, so behavior is unaffected until an admin actually
// changes something.
const SETTINGS_DEFAULTS = {
  minWithdrawRupees: 50,
  referralRewardRupees: 20,
  dailyBonusBaseRupees: 2,
  dailyWithdrawLimitRupees: 0,
  businessTimezone: "Asia/Kolkata",
  enabledMethods: ["upi"],
  maintenanceMode: false,
  supportEmail: "",
};
const DAILY_BONUS_CURVE = [2, 3, 5, 5, 8, 10, 20];
function dailyBonusSchedule(settings) {
  const scale = Number(settings.dailyBonusBaseRupees || 2) / DAILY_BONUS_CURVE[0];
  return DAILY_BONUS_CURVE.map((amount) => Math.round(amount * scale * 100) / 100);
}
async function getPlatformSettings(firestore) {
  const settings = await firestore.getDoc("settings/platform");
  return { ...SETTINGS_DEFAULTS, ...(settings || {}) };
}

async function requireUser(request, env, firestore) {
  const auth = await verifyIdToken(request, env);
  if (!auth) throw new AppError("UNAUTHENTICATED", "Sign-in required.", 401);
  const user = await firestore.getDoc(`users/${auth.uid}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  if (user.suspended) throw new AppError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
  return auth.uid;
}

function listValue(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
  return String(value || "").split(/[,|]/).map((v) => v.trim().toUpperCase()).filter(Boolean);
}

function deviceClasses(request) {
  const ua = request.headers.get("user-agent") || "";
  const mobileHint = request.headers.get("sec-ch-ua-mobile") || "";
  const platform = request.headers.get("sec-ch-ua-platform") || "";
  const isTablet = /ipad|tablet|playbook|silk/i.test(ua) ||
    (/android/i.test(ua) && !/mobile/i.test(ua)) ||
    (/macintosh/i.test(ua) && /ipad|iphone/i.test(ua));
  const isMobile = isTablet || /mobile|android|iphone|ipod/i.test(ua) || mobileHint === "?1";
  const classes = new Set(isMobile ? ["MOBILE"] : ["DESKTOP"]);
  if (isTablet) classes.add("TABLET");
  if (/windows|macintosh|linux|chromeos/i.test(`${ua} ${platform}`) && !isMobile) classes.add("DESKTOP");
  return classes;
}

function businessDateKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || SETTINGS_DEFAULTS.businessTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function previousBusinessDateKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function publicTask(task) {
  // Only strip fields that are genuinely internal (admin-only notes never
  // even live on this doc — see taskInternal/{taskId} in admin.js — so this
  // destructure is a no-op safety net for that one). Everything else here
  // (userLimit, dailyLimit, maxRewardRupees, country, device, startDate,
  // expiryDate) is surfaced by the task-detail page, so it must stay on the
  // object returned to the client.
  const { notes, internalNotes, ...safe } = task;
  return safe;
}

function enforceTaskEligibility(request, task) {
  const now = Date.now();
  if (task.startDate && now < Date.parse(task.startDate)) throw new AppError("TASK_NOT_STARTED", "This task is not available yet.", 409);
  if (task.expiryDate && now > Date.parse(task.expiryDate)) throw new AppError("TASK_EXPIRED", "This task has expired.", 409);
  const countries = listValue(task.country);
  if (countries.length && !countries.includes("ALL")) {
    const country = String(request.cf?.country || request.headers.get("CF-IPCountry") || "").toUpperCase();
    if (!country || !countries.includes(country)) throw new AppError("COUNTRY_RESTRICTED", "This task is not available in your country.", 403);
  }
  const devices = listValue(task.device);
  if (devices.length && !devices.includes("ALL")) {
    const classes = deviceClasses(request);
    if (!devices.some((device) => classes.has(device))) throw new AppError("DEVICE_RESTRICTED", "This task is not available on this device.", 403);
  }
}

// Public (auth-required, non-admin) subset of platform settings the frontend
// needs to render withdraw limits/methods correctly instead of hardcoding
// them. Deliberately excludes anything admin-only (e.g. business timezone
// internals aren't secret, but keep this list to what the UI actually uses).
export async function handleGetPublicSettings(request, env, firestore) {
  const settings = await getPlatformSettings(firestore);
  return json({
    minWithdrawRupees: settings.minWithdrawRupees,
    dailyWithdrawLimitRupees: settings.dailyWithdrawLimitRupees,
    enabledMethods: settings.enabledMethods,
    maintenanceMode: settings.maintenanceMode,
    supportEmail: settings.supportEmail,
  });
}

export async function handleGetUser(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  return json(user);
}

export async function handleGetTransactions(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const items = await firestore.runQuery("transactions", {
    where: [["userId", "EQUAL", uid]],
    orderBy: ["createdAt", "DESCENDING"],
    limit,
  });
  return json(items);
}

export async function handleGetWithdrawals(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const items = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid]], orderBy: ["createdAt", "DESCENDING"], limit: 50 });
  return json(items);
}

// ---- Tasks ----
export async function handleListTasks(request, env, firestore) {
  await requireUser(request, env, firestore);
  const tasks = await firestore.runQuery("tasks", { where: [["status", "EQUAL", "active"]], orderBy: ["createdAt", "DESCENDING"], limit: 300 });
  const eligible = tasks.filter((task) => { try { enforceTaskEligibility(request, task); return true; } catch { return false; } });
  return json(eligible.map(publicTask));
}

export async function handleGetTask(request, env, firestore, taskId) {
  await requireUser(request, env, firestore);
  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task || task.status !== "active") throw new AppError("TASK_UNAVAILABLE", "This task is not available.", 404);
  enforceTaskEligibility(request, task);
  return json(publicTask(task));
}

export async function handleTaskStart(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const { taskId } = await request.json();
  if (!taskId) throw new AppError("INVALID_INPUT", "taskId is required.");

  const task = await firestore.getDoc(`tasks/${taskId}`);
  if (!task || task.status !== "active") throw new AppError("TASK_UNAVAILABLE", "This task is not available.", 404);
  enforceTaskEligibility(request, task);
  const configuredReward = Number(task.rewardRupees || 0);
  const maxReward = Number(task.maxRewardRupees || 0);
  if (!Number.isFinite(configuredReward) || configuredReward <= 0) throw new AppError("INVALID_TASK_REWARD", "This task has an invalid reward configuration.", 409);
  if (maxReward > 0 && configuredReward > maxReward) throw new AppError("INVALID_TASK_REWARD", "This task reward exceeds its configured maximum.", 409);

  // Prevent duplicate active or reviewable submissions for the same user + task.
  const existing = await firestore.runQuery("taskSubmissions", {
    where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId]],
    limit: 20,
  });
  const activeSubmission = existing.find((s) => s.status === "in_progress" || s.status === "verification");
  if (activeSubmission) return json({ submissionId: activeSubmission.id, status: activeSubmission.status });

  // Reserve user and daily quota slots in the same atomic commit as the
  // submission. Every retry performs fresh reads and recalculates the next
  // slot from that fresh state. A concurrent starter that wins a deterministic
  // exists:false reservation therefore cannot be bypassed by a stale counter.
  const settings = await getPlatformSettings(firestore);
  const userLimit = task.repeatable ? 0 : (Number(task.userLimit) > 0 ? Number(task.userLimit) : 1);
  const dailyLimit = Number(task.dailyLimit || 0);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nowMs = Date.now();
    const userCompletions = userLimit > 0 ? await firestore.runQuery("taskSubmissions", {
      where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId], ["status", "EQUAL", "completed"]],
      limit: Math.max(userLimit, 100),
    }) : [];
    const userSlotsRaw = userLimit > 0 ? await firestore.runQuery("taskUserSlots", {
      where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId]],
      limit: userLimit + 100,
    }) : [];
    const userSlots = userSlotsRaw.filter((slot) => !slot.expiresAt || Date.parse(slot.expiresAt) > nowMs);
    const todayKey = businessDateKey(new Date(), settings.businessTimezone);
    const dailySlotsRaw = dailyLimit > 0 ? await firestore.runQuery("taskDailySlots", {
      where: [["taskId", "EQUAL", taskId], ["businessDateKey", "EQUAL", todayKey]],
      limit: dailyLimit + 100,
    }) : [];
    const dailySlots = dailySlotsRaw.filter((slot) => !slot.expiresAt || Date.parse(slot.expiresAt) > nowMs);
    const usedUserSlots = userCompletions.length + userSlots.length;
    if (userLimit > 0 && usedUserSlots >= userLimit) throw new AppError("TASK_ALREADY_COMPLETED", "You've already reached this task's completion limit.", 409);
    if (dailyLimit > 0 && dailySlots.length >= dailyLimit) throw new AppError("TASK_DAILY_LIMIT_REACHED", "This task has reached its daily completion limit. Try again tomorrow.", 409);

    const submissionId = crypto.randomUUID();
    const providerAttemptId = await firestore.deterministicId(`${uid}:${taskId}:${submissionId}`);
    const now = new Date().toISOString();
    const submissionStatus = task.requiresProof ? "in_progress" : "verification";
    const writes = [{
      path: `taskSubmissions/${submissionId}`,
      data: { userId: uid, taskId, taskTitle: task.title, provider: task.provider || "", providerAttemptId, attemptId: providerAttemptId, iconUrl: task.iconUrl || task.icon || "", rewardRupees: configuredReward, maxRewardRupees: maxReward || null, status: submissionStatus, startedAt: now, updatedAt: now },
      condition: { exists: false },
    }];
    let userSlotId = null;
    let dailySlotId = null;
    if (userLimit > 0) {
      const userSlot = usedUserSlots;
      userSlotId = await firestore.deterministicId(`${uid}:${taskId}:user:${userSlot}`);
      writes.push({ path: `taskUserSlots/${userSlotId}`, data: { userId: uid, taskId, submissionId, slot: userSlot, createdAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, condition: { exists: false } });
    }
    if (dailyLimit > 0) {
      const dailySlot = dailySlots.length;
      dailySlotId = await firestore.deterministicId(`${taskId}:${todayKey}:daily:${dailySlot}`);
      writes.push({ path: `taskDailySlots/${dailySlotId}`, data: { taskId, businessDateKey: todayKey, submissionId, slot: dailySlot, createdAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, condition: { exists: false } });
    }
    writes[0].data.userSlotId = userSlotId;
    writes[0].data.dailySlotId = dailySlotId;
    try {
      await firestore.commit(writes);
      return json({ submissionId, attemptId: providerAttemptId, providerAttemptId, status: submissionStatus });
    } catch (err) {
      // The failed conditional reservation invalidates all counters and slot
      // numbers read above. Discard them and retry from fresh Firestore reads.
      if (err.code === "PRECONDITION_FAILED") continue;
      throw err;
    }
  }
  throw new AppError("TASK_LIMIT_RACE", "This task's limit changed while starting it. Please try again.", 409);
}

export async function handleTaskSubmit(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const { taskId, proof, submissionId, attemptId } = await request.json();
  const subs = submissionId
    ? [{ id: submissionId }]
    : await firestore.runQuery("taskSubmissions", {
      where: [["userId", "EQUAL", uid], ["taskId", "EQUAL", taskId], ["status", "EQUAL", "in_progress"]],
      limit: 1,
    });
  if (subs.length === 0) throw new AppError("SUBMISSION_NOT_FOUND", "No active submission for this task.", 404);
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${subs[0].id}`);
  if (!subMeta || !subMeta.updateTime || subMeta.doc.userId !== uid || subMeta.doc.status !== "in_progress" || (attemptId && subMeta.doc.providerAttemptId !== attemptId)) throw new AppError("INVALID_STATE", "This submission is no longer active or does not match the attempt.", 409);
  await firestore.setDoc(`taskSubmissions/${subs[0].id}`, {
    ...subMeta.doc, status: "verification", proof: proof || null, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }, { updateTime: subMeta.updateTime });
  return json({ status: "verification" });
}

// Admin approves a manually-reviewed submission — credits the reward atomically.
// Writes a notification doc under users/{uid}/notifications, read by the
// client via watchUserNotifications() — best-effort, never blocks the
// caller's primary action if it fails.
async function notifyUser(firestore, userId, { category, title, body }) {
  try {
    await firestore.createDoc(`users/${userId}/notifications`, crypto.randomUUID(), {
      category, title, body, read: false, createdAt: new Date().toISOString(),
    });
  } catch (e) { /* notification delivery is non-critical */ }
}

export async function handleTaskApprove(request, env, firestore, adminUid) {
  const { submissionId } = await request.json();
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${submissionId}`);
  if (!subMeta) throw new AppError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
  const sub = subMeta.doc;
  if (sub.status === "completed") return json({ status: "completed", alreadyProcessed: true });
  if (sub.status !== "verification") throw new AppError("INVALID_STATE", "Only submissions awaiting verification can be approved.", 409);
  const amount = Number(sub.rewardRupees || 0);
  const max = Number(sub.maxRewardRupees || 0);
  if (!Number.isFinite(amount) || amount <= 0 || (max > 0 && amount > max)) throw new AppError("INVALID_REWARD", "Submission reward is outside the permitted range.", 409);
  const taskMeta = sub.taskId ? await firestore.getDocMeta(`tasks/${sub.taskId}`) : null;
  const task = taskMeta?.doc;
  const additionalWrites = [
    { path: `taskSubmissions/${submissionId}`, data: { ...sub, status: "completed", updatedAt: new Date().toISOString() }, condition: subMeta.updateTime ? { updateTime: subMeta.updateTime } : undefined },
  ];
  if (sub.userSlotId) additionalWrites.push({ path: `taskUserSlots/${sub.userSlotId}`, delete: true, condition: { exists: true } });
  if (sub.dailySlotId) additionalWrites.push({ path: `taskDailySlots/${sub.dailySlotId}`, delete: true, condition: { exists: true } });
  if (taskMeta) additionalWrites.push({ path: `tasks/${sub.taskId}`, data: { completions: Number(task.completions || 0) + 1, updatedAt: new Date().toISOString() }, updateMask: ["completions", "updatedAt"], condition: taskMeta.updateTime ? { updateTime: taskMeta.updateTime } : undefined });
  const result = await creditReward(firestore, {
    userId: sub.userId, amountRupees: amount, type: "task", source: "manual_review",
    provider: sub.provider, providerTransactionId: `manual:${submissionId}`, transactionKey: `submission:${submissionId}`,
    description: `${sub.taskTitle} — approved`, additionalWrites,
  });
  if (result.alreadyProcessed) return json({ status: "completed", alreadyProcessed: true });
  await notifyUser(firestore, sub.userId, { category: "reward", title: "Task approved", body: `"${sub.taskTitle}" was approved — ₹${amount} added to your balance.` });
  try {
    const pendingReferral = await firestore.runQuery("referrals", { where: [["referredId", "EQUAL", sub.userId], ["status", "EQUAL", "pending"]], limit: 1 });
    if (pendingReferral.length > 0) await creditReferralReward(firestore, pendingReferral[0].id);
  } catch (e) { /* referral credit is non-critical */ }
  return json({ status: "completed", transactionId: result.transactionId });
}

export async function handleTaskReject(request, env, firestore, adminUid) {
  const { submissionId, reason } = await request.json();
  const subMeta = await firestore.getDocMeta(`taskSubmissions/${submissionId}`);
  if (!subMeta) throw new AppError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
  const sub = subMeta.doc;
  if (sub.status === "completed") throw new AppError("INVALID_STATE", "Completed submissions cannot be rejected; use the audited reward-reversal flow.", 409);
  if (sub.status !== "verification" && sub.status !== "in_progress") throw new AppError("INVALID_STATE", "Only active or reviewable submissions can be rejected.", 409);
  if (!subMeta.updateTime) throw new AppError("INVALID_STATE", "Submission metadata is missing an update precondition.", 409);
  const rejectWrites = [{ path: `taskSubmissions/${submissionId}`, data: { ...sub, status: "failed", rejectReason: reason || "", updatedAt: new Date().toISOString() }, condition: { updateTime: subMeta.updateTime } }];
  if (sub.userSlotId) rejectWrites.push({ path: `taskUserSlots/${sub.userSlotId}`, delete: true, condition: { exists: true } });
  if (sub.dailySlotId) rejectWrites.push({ path: `taskDailySlots/${sub.dailySlotId}`, delete: true, condition: { exists: true } });
  await firestore.commit(rejectWrites);
  await notifyUser(firestore, sub.userId, { category: "system", title: "Task submission rejected", body: `"${sub.taskTitle}" wasn't approved${reason ? `: ${reason}` : "."}` });
  return json({ status: "failed" });
}

// ---- Daily bonus ----
export async function handleDailyBonusSchedule(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const settings = await getPlatformSettings(firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  const todayKey = businessDateKey(new Date(), settings.businessTimezone);
  const claimedToday = !!user && (user.dailyBonusDateKey || (user.lastDailyLogin ? businessDateKey(new Date(user.lastDailyLogin), settings.businessTimezone) : null)) === todayKey;
  return json({ amounts: dailyBonusSchedule(settings), businessDateKey: todayKey, businessTimezone: settings.businessTimezone, claimedToday, streak: Number(user?.dailyStreak || 0) });
}

export async function handleDailyLoginReward(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const user = await firestore.getDoc(`users/${uid}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);

  const settings = await getPlatformSettings(firestore);
  const todayKey = businessDateKey(new Date(), settings.businessTimezone);
  const previousKey = previousBusinessDateKey(todayKey);
  const storedDateKey = user.dailyBonusDateKey || (user.lastDailyLogin ? businessDateKey(new Date(user.lastDailyLogin), settings.businessTimezone) : null);
  if (storedDateKey === todayKey) throw new AppError("ALREADY_CLAIMED", "You've already claimed today's bonus.");

  const streakContinues = storedDateKey === previousKey;
  // Streak is 1-based: 1 = first day, 7 = seventh day, then cycles back to 1.
  const prevStreak = user.dailyStreak || 0;
  const newStreak = streakContinues ? ((prevStreak % 7) + 1) : 1;
  const schedule = dailyBonusSchedule(settings);
  const amount = schedule[(newStreak - 1) % 7];

  const dailyTimestamp = new Date().toISOString();
  const result = await creditReward(firestore, {
    userId: uid, amountRupees: amount, type: "daily_bonus", source: "daily_bonus",
    providerTransactionId: `daily:${uid}:${todayKey}`, description: `Daily bonus — day ${newStreak}`,
    userFields: { dailyStreak: newStreak, lastDailyLogin: dailyTimestamp, dailyBonusDateKey: todayKey },
    userUpdateMask: ["dailyStreak", "lastDailyLogin", "dailyBonusDateKey"],
  });
  return json({ amountRupees: amount, streak: newStreak, transactionId: result.transactionId });
}

// ---- Referral ----
export async function handleRecordReferral(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const { referralCode } = await request.json();
  if (!referralCode) throw new AppError("INVALID_INPUT", "referralCode is required.");

  const referrers = await firestore.runQuery("users", { where: [["referralCode", "EQUAL", referralCode]], limit: 1 });
  if (referrers.length === 0) throw new AppError("INVALID_CODE", "Referral code not found.");
  const referrer = referrers[0];
  if (referrer.id === uid) throw new AppError("SELF_REFERRAL", "You can't refer yourself.");

  const already = await firestore.runQuery("referrals", { where: [["referredId", "EQUAL", uid]], limit: 1 });
  if (already.length > 0) throw new AppError("ALREADY_REFERRED", "This account was already referred.");

  const referredUser = await firestore.getDoc(`users/${uid}`);
  const referralId = crypto.randomUUID();
  await firestore.createDoc("referrals", referralId, {
    referrerId: referrer.id, referredId: uid, referredName: referredUser?.displayName || "New user",
    status: "pending", createdAt: new Date().toISOString(),
  });
  return json({ referralId, status: "pending" });
}

// Called internally once a referred user completes their qualifying activity
// (wire this from wherever that qualifying event is detected, e.g. after
// their first approved task).
export async function creditReferralReward(firestore, referralId) {
  const refMeta = await firestore.getDocMeta(`referrals/${referralId}`);
  if (!refMeta || refMeta.doc.status === "rewarded") return;
  const ref = refMeta.doc;
  const settings = await getPlatformSettings(firestore);
  const rewardAmount = settings.referralRewardRupees;
  try {
    const result = await creditReward(firestore, {
      userId: ref.referrerId, amountRupees: rewardAmount, type: "referral", source: "referral",
      providerTransactionId: `referral:${referralId}`, transactionKey: `referral:${referralId}`, description: "Referral reward",
    });
    const latest = await firestore.getDocMeta(`referrals/${referralId}`);
    if (latest && latest.doc.status !== "rewarded") await firestore.setDoc(`referrals/${referralId}`, { ...latest.doc, status: "rewarded", rewardRupees: rewardAmount, qualifiedAt: latest.doc.qualifiedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, { updateTime: latest.updateTime });
    await notifyUser(firestore, ref.referrerId, {
      category: "reward", title: "Referral reward earned",
      body: `Your referral completed their first task — ₹${rewardAmount} added to your balance.`,
    });
    return result;
  } catch (err) {
    const attempts = Number(ref.rewardAttempts || 0) + 1;
    const delayMs = Math.min(24 * 60 * 60 * 1000, 60_000 * (2 ** Math.min(attempts, 10)));
    try {
      await firestore.setDoc(`referrals/${referralId}`, { ...ref, status: "pending", qualifiedAt: ref.qualifiedAt || new Date().toISOString(), rewardAttempts: attempts, lastRewardError: String(err.message || err).slice(0, 500), nextRetryAt: new Date(Date.now() + delayMs).toISOString(), updatedAt: new Date().toISOString() }, { updateTime: refMeta.updateTime });
    } catch (_) { /* preserve original failure; scheduled retry will re-read the referral */ }
    throw err;
  }
}

const QUOTA_CLEANUP_BATCH = 100;

async function cleanupExpiredQuotaSlots(firestore, nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  let cleaned = 0;
  let inspected = 0;
  for (const collection of ["taskUserSlots", "taskDailySlots"]) {
    // The server supplies both the cutoff and the bounded page size. The
    // existing schema stores expiresAt as an ISO string, so the final Date
    // comparison below remains the authoritative expiration check.
    const candidates = await firestore.runQuery(collection, {
      where: [["expiresAt", "LESS_THAN_OR_EQUAL", nowIso]],
      limit: QUOTA_CLEANUP_BATCH,
    });
    for (const candidate of candidates) {
      if (inspected >= QUOTA_CLEANUP_BATCH * 2) break;
      inspected += 1;
      if (!candidate.expiresAt || Date.parse(candidate.expiresAt) > nowMs) continue;

      // Never remove a reservation belonging to an active attempt. Completed
      // and failed attempts are safe to clean; normal completion paths also
      // remove their slot in the same commit as the state transition.
      if (candidate.submissionId) {
        const submission = await firestore.getDoc(`taskSubmissions/${candidate.submissionId}`);
        if (submission && (submission.status === "in_progress" || submission.status === "verification")) continue;
      }

      // Re-read metadata and use its updateTime so a concurrent slot change
      // cannot be deleted from a stale read. The write is server-only and is
      // bounded to the candidates returned above.
      const slotMeta = await firestore.getDocMeta(`${collection}/${candidate.id}`);
      if (!slotMeta || !slotMeta.doc.expiresAt || Date.parse(slotMeta.doc.expiresAt) > nowMs) continue;
      if (slotMeta.doc.submissionId) {
        const submission = await firestore.getDoc(`taskSubmissions/${slotMeta.doc.submissionId}`);
        if (submission && (submission.status === "in_progress" || submission.status === "verification")) continue;
      }
      try {
        await firestore.commit([{ path: `${collection}/${candidate.id}`, delete: true, condition: slotMeta.updateTime ? { updateTime: slotMeta.updateTime } : { exists: true } }]);
        cleaned += 1;
      } catch (err) {
        if (err.code !== "PRECONDITION_FAILED") throw err;
      }
    }
  }
  return { cleaned, inspected };
}

export async function handleScheduledMaintenance(firestore) {
  const now = Date.now();
  // Filter to pending referrals server-side instead of pulling up to 1000
  // referrals of any status on every scheduled run — this collection only
  // grows over time, so an unfiltered scan gets slower and eventually
  // truncates (silently missing older pending referrals past the cap).
  const referrals = await firestore.runQuery("referrals", { where: [["status", "EQUAL", "pending"]], limit: 1000 });
  let retriedReferrals = 0;
  for (const ref of referrals) {
    if (ref.qualifiedAt && (!ref.nextRetryAt || Date.parse(ref.nextRetryAt) <= now)) {
      try { await creditReferralReward(firestore, ref.id); retriedReferrals += 1; } catch (_) { /* leave retry metadata for the next run */ }
    }
  }
  const quotaCleanup = await cleanupExpiredQuotaSlots(firestore, now);
  return { retriedReferrals, cleanedQuotaSlots: quotaCleanup.cleaned, inspectedQuotaSlots: quotaCleanup.inspected };
}

// ---- Rewarded ads ----
// This endpoint MUST NOT credit users based solely on a client-side "I watched
// an ad" claim. It is only enabled when an actual server-side ad provider
// postback is configured (AD_PROVIDER_ENABLED=true in wrangler.toml [vars]).
// Until a real postback-verified ad provider integration exists, the endpoint
// returns 503 so no one can farm rewards by calling it directly.
export async function handleWatchAdReward(request, env, firestore) {
  if (env.AD_PROVIDER_ENABLED !== "true") {
    throw new AppError(
      "NOT_CONFIGURED",
      "Rewarded ads are not yet enabled on this platform.",
      503
    );
  }

  const uid = await requireUser(request, env, firestore);
  const { placementId, providerToken } = await request.json();

  if (!providerToken) throw new AppError("MISSING_TOKEN", "Ad completion token is required.", 400);
  if (!env.AD_PROVIDER_VERIFY_URL) throw new AppError("NOT_CONFIGURED", "Rewarded-ad verification is not configured.", 503);
  const verifyResponse = await fetch(env.AD_PROVIDER_VERIFY_URL, {
    method: "POST", headers: { "Content-Type": "application/json", ...(env.AD_PROVIDER_VERIFY_SECRET ? { Authorization: `Bearer ${env.AD_PROVIDER_VERIFY_SECRET}` } : {}) },
    body: JSON.stringify({ providerToken, userId: uid, placementId: placementId || "default" }),
  });
  if (!verifyResponse.ok) throw new AppError("AD_VERIFICATION_FAILED", "The ad completion could not be verified.", 400);
  const verification = await verifyResponse.json();
  if (!verification.verified || (verification.userId && verification.userId !== uid)) throw new AppError("AD_VERIFICATION_FAILED", "The ad completion could not be verified.", 400);

  const user = await firestore.getDoc(`users/${uid}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);

  const COOLDOWN_MS = 60_000;
  if (user.lastRewardedAdTime && Date.now() - new Date(user.lastRewardedAdTime).getTime() < COOLDOWN_MS) {
    throw new AppError("COOLDOWN", "Please wait before watching another ad.");
  }

  const AD_REWARD = 0.5;
  const result = await creditReward(firestore, {
    userId: uid, amountRupees: AD_REWARD, type: "ad", source: "rewarded_ad",
    providerTransactionId: `ad:${uid}:${providerToken}`, description: `Rewarded ad — ${placementId || "default"}`,
    userFields: { lastRewardedAdTime: new Date().toISOString() },
    userUpdateMask: ["lastRewardedAdTime"],
  });
  return json({ amountRupees: AD_REWARD, transactionId: result.transactionId });
}

// ---- Withdrawals ----
export async function handleWithdraw(request, env, firestore) {
  const uid = await requireUser(request, env, firestore);
  const { method, amountRupees, upiId } = await request.json();

  if (!["upi", "amazon", "flipkart", "myntra"].includes(method)) throw new AppError("INVALID_METHOD", "Unsupported payment method.");
  const settings = await getPlatformSettings(firestore);
  if (settings.maintenanceMode) throw new AppError("MAINTENANCE_MODE", "Withdrawals are temporarily paused for maintenance. Please try again later.", 503);
  if (settings.enabledMethods && !settings.enabledMethods.includes(method)) throw new AppError("INVALID_METHOD", "This withdrawal method is currently unavailable.");
  const minWithdraw = Number(settings.minWithdrawRupees);
  const amount = Number(amountRupees);
  if (!Number.isFinite(amount) || amount <= 0 || amount < minWithdraw) throw new AppError("BELOW_MINIMUM", `Minimum withdrawal is ₹${minWithdraw}.`);
  if (method === "upi" && (!upiId || !upiId.includes("@"))) throw new AppError("INVALID_UPI", "Enter a valid UPI ID.");

  const userMeta = await firestore.getDocMeta(`users/${uid}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const user = userMeta.doc;
  if ((user.balanceRupees || 0) < amount) throw new AppError("INSUFFICIENT_BALANCE", "Insufficient balance.");
  const dailyCap = Number(settings.dailyWithdrawLimitRupees || 0);
  if (dailyCap > 0) {
    const todayKey = businessDateKey(new Date(), settings.businessTimezone);
    // Filter by businessDateKey server-side (rather than pulling up to 500
    // of the user's withdrawals of any date and filtering in memory) so the
    // daily cap is computed correctly even for long-time users who have
    // accumulated more than 500 lifetime withdrawal records.
    const todayWithdrawals = await firestore.runQuery("withdrawals", {
      where: [["userId", "EQUAL", uid], ["businessDateKey", "EQUAL", todayKey]],
      limit: 200,
    });
    const usedToday = todayWithdrawals.filter((w) => ["pending", "processing", "paid"].includes(w.status)).reduce((sum, w) => sum + Number(w.amountRupees || 0), 0);
    if (usedToday + amount > dailyCap) throw new AppError("DAILY_WITHDRAW_LIMIT", `Daily withdrawal limit is ₹${dailyCap}.`, 409);
  }

  const pending = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid], ["status", "EQUAL", "pending"]], limit: 1 });
  if (pending.length > 0) throw new AppError("PENDING_EXISTS", "You already have a pending withdrawal request.");
  const processing = await firestore.runQuery("withdrawals", { where: [["userId", "EQUAL", uid], ["status", "EQUAL", "processing"]], limit: 1 });
  if (processing.length > 0) throw new AppError("PENDING_EXISTS", "You already have a withdrawal request being processed.");

  const withdrawalId = crypto.randomUUID();
  const withdrawalTransactionId = crypto.randomUUID();
  const requestId = `WD-${withdrawalId.slice(0, 8).toUpperCase()}`;
  const businessDateKeyValue = businessDateKey(new Date(), settings.businessTimezone);
  const now = new Date().toISOString();

  // Reserve the balance immediately via a debit transaction, then create the
  // withdrawal request — both happen together so the ledger always matches
  // the balance.
  await firestore.commit([
    { path: `withdrawals/${withdrawalId}`, data: { withdrawalId, requestId, userId: uid, method, amountRupees: amount, upiId: upiId || null, withdrawalTransactionId, businessDateKey: businessDateKeyValue, status: "pending", createdAt: now, updatedAt: now } },
    {
      path: `transactions/${withdrawalTransactionId}`,
      data: { transactionId: withdrawalTransactionId, userId: uid, type: "withdrawal", amountRupees: -amount, status: "pending", description: `Withdrawal — ${method}`, metadata: { withdrawalId }, createdAt: now, updatedAt: now },
      condition: { exists: false },
    },
    {
      path: `users/${uid}`,
      data: {
        balanceRupees: (user.balanceRupees || 0) - amount,
        coinBalance: Math.max((user.coinBalance || 0) - Math.round(amount * 100), 0),
        pendingWithdrawal: (user.pendingWithdrawal || 0) + amount,
        updatedAt: now,
      },
      updateMask: ["balanceRupees", "coinBalance", "pendingWithdrawal", "updatedAt"],
      condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : undefined,
    },
  ]);

  return json({ requestId, withdrawalId, status: "pending" });
}

export async function handleWithdrawApprove(request, env, firestore, adminUid) {
  const { withdrawalId } = await request.json();
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "pending") throw new AppError("INVALID_STATE", "Only pending withdrawals can be approved.", 409);
  await firestore.setDoc(`withdrawals/${withdrawalId}`, { ...w, status: "processing", updatedAt: new Date().toISOString() }, wMeta.updateTime ? { updateTime: wMeta.updateTime } : undefined);
  await writeAdminLog(firestore, adminUid, "withdrawal_approved", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees });
  return json({ status: "processing" });
}

export async function handleWithdrawResolve(request, env, firestore, adminUid) {
  const { withdrawalId, status } = await request.json();
  if (status !== "paid") throw new AppError("INVALID_STATUS", "Withdrawal can only be resolved as paid.");
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "processing") throw new AppError("INVALID_STATE", "Only processing withdrawals can be marked paid.", 409);
  const userMeta = await firestore.getDocMeta(`users/${w.userId}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const txns = await firestore.runQuery("transactions", { where: [["metadata.withdrawalId", "EQUAL", withdrawalId]], limit: 1 });
  const txnMeta = txns.length ? await firestore.getDocMeta(`transactions/${txns[0].id}`) : null;
  const now = new Date().toISOString();
  const writes = [
    { path: `withdrawals/${withdrawalId}`, data: { ...w, status: "paid", updatedAt: now }, condition: wMeta.updateTime ? { updateTime: wMeta.updateTime } : undefined },
    { path: `users/${w.userId}`, data: { pendingWithdrawal: Math.max((userMeta.doc.pendingWithdrawal || 0) - w.amountRupees, 0), totalWithdrawn: (userMeta.doc.totalWithdrawn || 0) + w.amountRupees, totalRedeemedCoins: (userMeta.doc.totalRedeemedCoins || 0) + Math.round(w.amountRupees * 100), updatedAt: now }, updateMask: ["pendingWithdrawal", "totalWithdrawn", "totalRedeemedCoins", "updatedAt"], condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : undefined },
  ];
  if (txnMeta) writes.push({ path: `transactions/${txnMeta.doc.id}`, data: { ...txnMeta.doc, status: "completed", updatedAt: now }, condition: txnMeta.updateTime ? { updateTime: txnMeta.updateTime } : undefined });
  await firestore.commit(writes);
  await writeAdminLog(firestore, adminUid, "withdrawal_paid", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees });
  await notifyUser(firestore, w.userId, { category: "withdrawal", title: "Withdrawal paid", body: `Your withdrawal of ₹${w.amountRupees} has been paid out.` });
  return json({ status: "paid" });
}

export async function handleWithdrawReject(request, env, firestore, adminUid) {
  const { withdrawalId, reason } = await request.json();
  const wMeta = await firestore.getDocMeta(`withdrawals/${withdrawalId}`);
  if (!wMeta) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  const w = wMeta.doc;
  if (w.status !== "pending" && w.status !== "processing") throw new AppError("INVALID_STATE", "Only pending/processing withdrawals can be rejected.", 409);
  const userMeta = await firestore.getDocMeta(`users/${w.userId}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
  const txns = await firestore.runQuery("transactions", { where: [["metadata.withdrawalId", "EQUAL", withdrawalId]], limit: 1 });
  const txnMeta = w.withdrawalTransactionId ? await firestore.getDocMeta(`transactions/${w.withdrawalTransactionId}`) : (txns.length ? await firestore.getDocMeta(`transactions/${txns[0].id}`) : null);
  const now = new Date().toISOString();
  const additionalWrites = [
    { path: `withdrawals/${withdrawalId}`, data: { ...w, status: "rejected", rejectReason: reason || "", updatedAt: now }, condition: wMeta.updateTime ? { updateTime: wMeta.updateTime } : undefined },
  ];
  if (txnMeta) additionalWrites.push({
    path: `transactions/${txnMeta.doc.id}`,
    data: { ...txnMeta.doc, status: "reversed", updatedAt: now },
    condition: txnMeta.updateTime ? { updateTime: txnMeta.updateTime } : undefined,
  });
  const result = await reverseTransaction(firestore, {
    originalTransactionId: txnMeta?.doc?.id || withdrawalId, userId: w.userId, amountRupees: w.amountRupees,
    reason: reason || "Withdrawal rejected", type: "withdrawal_reversal", idempotencyKey: `withdrawal:${withdrawalId}:reversal`,
    userFields: { pendingWithdrawal: Math.max((userMeta.doc.pendingWithdrawal || 0) - w.amountRupees, 0) },
    userUpdateMask: ["pendingWithdrawal"], additionalWrites,
  });
  if (result.alreadyProcessed) return json({ status: "rejected", alreadyProcessed: true });
  await writeAdminLog(firestore, adminUid, "withdrawal_rejected", withdrawalId, { userId: w.userId, amountRupees: w.amountRupees, reason });
  await notifyUser(firestore, w.userId, { category: "withdrawal", title: "Withdrawal rejected", body: `Your withdrawal of ₹${w.amountRupees} was rejected${reason ? `: ${reason}` : "."} The amount has been returned to your balance.` });
  return json({ status: "rejected" });
}
