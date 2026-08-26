/** Ledger Light backend: routes centralize verified identities, explicit state transitions, and privileged operational actions. */
import { HttpError, methodNotAllowed, readJson } from "./http.js";
import { verifyFirebaseToken } from "./firebaseAuth.js";
import { ensureUser } from "./userAuth.js";
import { referralFeedQuery, referralRewardConfig, referralStatusCountQuery } from "./referral.js";
import { assertAdmin, assertSuperAdmin, isSuperAdmin } from "./admin.js";
import { countCollection, deleteDocument, getDocument, listCollection, patchDocument, queryCollection, setDocument, commit, writeCreate, writeDelete, writeIncrement, writePatch } from "./firestore.js";
import { approveSubmission, rejectSubmission, markSubmissionForVerification } from "./reward.js";
import { processPostback } from "./postbacks.js";
import { nextWithdrawalStatus } from "./withdrawal.js";
import { adminReadableResources } from "./admin-policy.js";
import { isDeviceEligible, normaliseCompatibility, resolveMemberDevice } from "./eligibility.js";
import { applyCounterChanges, campaignCounterId, campaignCounterIncrements, campaignCounterSeed, campaignRewardTotals, canReserveCampaignSlot, canReserveRewardBudget, counterState, rewardBudgetIncrements } from "./campaign.js";
import { normalizeTaskDate, normalizeTaskDates } from "./task-dates.js";
import { isMemberVisibleTaskStatus, isTaskStatus } from "./task-lifecycle.js";
import { isHttpsDestination, normaliseCountryCode, normaliseOptionalHttpsDestination, tryNormaliseCountryCode } from "./task-validation.js";
import { notificationAudience, notificationFeedQuery, notificationRecipient, unreadNotificationCountQuery } from "./notifications.js";
import { assertWithdrawalPolicy, normalisePayoutMethod, normalisePayoutReference, withdrawalDailyCounterId, withdrawalDay, withdrawalPayoutDetails, withdrawalPolicy } from "./withdrawal-policy.js";
import { collectEligibleTaskPage, memberTaskOrder } from "./task-feed.js";

const now = () => new Date().toISOString();
const cleanString = (value, length = 2000) => typeof value === "string" ? value.trim().slice(0, length) : "";
const validNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const required = (value, name) => { const output = cleanString(value); if (!output) throw new HttpError(400, `${name} is required.`, "missing_field"); return output; };
const safeArray = (value, max = 30) => Array.isArray(value) ? value.map((item) => cleanString(item, 500)).filter(Boolean).slice(0, max) : [];
const activeSubmissionLockId = (userId, taskId) => `${userId}_${taskId}`;
const pageFromUrl = (url, fallback = 20, maximum = 50) => ({ limit: url.searchParams.get("limit") || fallback, cursor: url.searchParams.get("cursor") || null, maximum });

function taskShape(input, { partial = false } = {}) {
  const fields = {};
  if (!partial || input.title !== undefined) fields.title = required(input.title, "Task title");
  if (!partial || input.category !== undefined) fields.category = required(input.category, "Task category");
  if (!partial || input.provider !== undefined) fields.provider = required(input.provider, "Provider");
  if (!partial || input.reward !== undefined) { const reward = validNumber(input.reward, NaN); if (!(reward > 0)) throw new HttpError(400, "Reward must be greater than zero.", "invalid_reward"); fields.reward = reward; }
  ["maximumReward", "userLimit", "dailyLimit"].forEach((key) => { if (input[key] !== undefined) { const amount = validNumber(input[key], NaN); if (amount < 0 || Number.isNaN(amount)) throw new HttpError(400, `${key} is invalid.`, "invalid_task_field"); fields[key] = amount; } });
  if (input.country !== undefined) fields.country = normaliseCountryCode(input.country, { allowAll: true, fieldName: "Task country" });
  if (input.startUrl !== undefined) fields.startUrl = normaliseOptionalHttpsDestination(input.startUrl);
  ["icon", "description", "proofInstructions"].forEach((key) => { if (input[key] !== undefined) fields[key] = cleanString(input[key], key === "description" || key === "proofInstructions" ? 5000 : 500); });
  if (input.startDate !== undefined) fields.startDate = normalizeTaskDate(input.startDate, "start");
  if (input.expiryDate !== undefined) fields.expiryDate = normalizeTaskDate(input.expiryDate, "expiry");
  if (input.deviceCompatibility !== undefined) { const suppliedDevices = safeArray(input.deviceCompatibility, 5); const invalidDevice = suppliedDevices.some((device) => !["mobile", "desktop", "tablet", "all"].includes(device.toLowerCase())); if (invalidDevice) throw new HttpError(400, "Device compatibility must use mobile, desktop, tablet, or all.", "invalid_device_compatibility"); fields.deviceCompatibility = normaliseCompatibility(suppliedDevices); }
  if (input.steps !== undefined) fields.steps = safeArray(input.steps, 30);
  if (input.requiresProof !== undefined) fields.requiresProof = Boolean(input.requiresProof);
  if (input.status !== undefined) { const status = cleanString(input.status); if (!isTaskStatus(status)) throw new HttpError(400, "Task status is invalid.", "invalid_task_status"); fields.status = status; }
  return fields;
}

function eligible(task, profile, request) {
  const timestamp = new Date().toISOString();
  if (!isMemberVisibleTaskStatus(task.status)) return false;
  const startDate = normalizeTaskDate(task.startDate, "start"); const expiryDate = normalizeTaskDate(task.expiryDate, "expiry");
  if (startDate && startDate > timestamp) return false;
  if (expiryDate && expiryDate < timestamp) return false;
  const taskCountry = task.country ? tryNormaliseCountryCode(task.country, { allowAll: true }) : "all"; const memberCountry = profile.country ? tryNormaliseCountryCode(profile.country) : null;
  if (!taskCountry) return false;
  if (taskCountry !== "all" && taskCountry !== memberCountry) return false;
  return isDeviceEligible(task, profile, request);
}

async function audit(env, actorId, event, details = {}) { await setDocument(env, "logs", crypto.randomUUID(), { actorId, event, details, createdAt: now() }); }
async function requireActiveProvider(env, providerId) { const provider = await getDocument(env, "providers", providerId); if (!provider || provider.status !== "active") throw new HttpError(400, "Choose an active provider from the provider directory.", "invalid_task_provider"); return provider; }
async function authenticated(request, env, options = {}) { const identity = await verifyFirebaseToken(request, env); const profile = await ensureUser(env, identity, options); if (profile.accountStatus === "suspended") throw new HttpError(403, "This account has been suspended. Contact support if you believe this is an error.", "account_suspended"); return { identity, profile }; }
async function adminRequest(request, env) { const context = await authenticated(request, env); await assertAdmin(env, context.identity); return context; }

async function dashboard(request, env, url) {
  if (request.method !== "GET") methodNotAllowed();
  const { identity, profile } = await authenticated(request, env);
  const page = pageFromUrl(url); const [wallet, taskPage, submissionPage] = await Promise.all([getDocument(env, "wallets", identity.uid), queryCollection(env, "tasks", { filters: [{ field: "status", value: "active" }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...page }), queryCollection(env, "submissions", { filters: [{ field: "userId", value: identity.uid }, { field: "status", op: "IN", value: ["in_progress", "verification"] }], orderBy: [{ field: "startedAt", direction: "DESCENDING" }], ...page })]);
  const ongoingSubmissions = submissionPage.items;
  return { wallet: { availableBalance: wallet?.availableBalance || 0, pendingWithdrawalAmount: wallet?.pendingWithdrawalAmount || 0, verificationCount: ongoingSubmissions.filter((entry) => entry.status === "verification").length }, tasks: taskPage.items.filter((task) => eligible(task, profile, request)), ongoingSubmissions, nextCursor: { tasks: taskPage.nextCursor, submissions: submissionPage.nextCursor } };
}

async function tasks(request, env, url) {
  const { identity, profile } = await authenticated(request, env);
  const match = url.pathname.match(/^\/v1\/tasks(?:\/([^/]+)\/start)?$/);
  if (!match) throw new HttpError(404, "The requested task endpoint was not found.", "not_found");
  if (request.method === "GET" && !match[1]) { const page = pageFromUrl(url); return collectEligibleTaskPage({ cursor: page.cursor, limit: page.limit, isEligible: (task) => eligible(task, profile, request), queryPage: ({ cursor, limit }) => queryCollection(env, "tasks", { filters: [{ field: "status", value: "active" }], orderBy: memberTaskOrder, cursor, limit, maximum: 50 }) }); }
  if (request.method !== "POST" || !match[1]) methodNotAllowed();
  const task = await getDocument(env, "tasks", decodeURIComponent(match[1]));
  if (!task || (task.startUrl && !isHttpsDestination(task.startUrl))) throw new HttpError(404, "This task is not available to your account.", "task_unavailable");
  if (!eligible(task, profile, request)) { if (!isDeviceEligible(task, profile, request)) throw new HttpError(403, "This task is not available on your current device.", "device_ineligible"); throw new HttpError(404, "This task is not available to your account.", "task_unavailable"); }
  const lockId = activeSubmissionLockId(identity.uid, task.id); const [activeSubmission, existingCounter] = await Promise.all([getDocument(env, "activeSubmissions", lockId), getDocument(env, "campaignCounters", campaignCounterId(task.id))]);
  if (activeSubmission) throw new HttpError(409, "You already have an active submission for this task.", "duplicate_submission");
  const legacySubmissions = existingCounter ? [] : await listCollection(env, "submissions", 500); const state = counterState(task, existingCounter, legacySubmissions);
  if (!canReserveCampaignSlot(state)) throw new HttpError(409, "The campaign completion cap has been reached.", "campaign_limit_reached");
  const reward = Number(task.reward || 0);
  if (!canReserveRewardBudget(state, [], reward)) throw new HttpError(409, "The campaign reward budget has been reached.", "maximum_reward_reached");
  const id = crypto.randomUUID(); const createdAt = now(); const campaignCounters = campaignCounterIncrements(state, [], { reserved: 1 }); const budgetCounters = rewardBudgetIncrements(state, [], { reserved: reward }); const counterChanges = { ...campaignCounters, ...budgetCounters }; const counterWrite = existingCounter ? writeIncrement(env, "campaignCounters", existingCounter.id, counterChanges, { updateTime: existingCounter.updatedAt }) : writeCreate(env, "campaignCounters", campaignCounterId(task.id), { taskId: task.id, ...applyCounterChanges(campaignCounterSeed(task, legacySubmissions), counterChanges), createdAt, updatedAt: createdAt });
  await commit(env, [
    writeCreate(env, "submissions", id, { userId: identity.uid, taskId: task.id, taskTitle: task.title, provider: task.provider, startedAt: createdAt, completedAt: null, status: "in_progress", proof: null, rejectionReason: null, reward, country: profile.country || null, device: resolveMemberDevice(request, profile) || "unknown", startUrl: task.startUrl || null, requiresProof: Boolean(task.requiresProof) }),
    writeCreate(env, "activeSubmissions", lockId, { userId: identity.uid, taskId: task.id, submissionId: id, createdAt }),
    counterWrite,
    writeCreate(env, "notifications", `task_started_${id}`, { userId: identity.uid, category: "task", title: "Task started", body: `You started ${task.title || "a task"}.`, unread: true, readAt: null, createdAt })
  ]);
  await audit(env, identity.uid, "task_started", { taskId: task.id, submissionId: id });
  return { submissionId: id, startUrl: task.startUrl || null };
}

async function submissions(request, env, url) {
  const { identity } = await authenticated(request, env);
  const match = url.pathname.match(/^\/v1\/submissions\/([^/]+)\/complete$/);
  if (!match) throw new HttpError(404, "The requested submission endpoint was not found.", "not_found");
  if (request.method !== "POST") methodNotAllowed();
  const submissionId = decodeURIComponent(match[1]); const submission = await getDocument(env, "submissions", submissionId);
  if (!submission || submission.userId !== identity.uid) throw new HttpError(404, "The submission was not found.", "submission_not_found");
  const body = await readJson(request); const result = await markSubmissionForVerification(env, submissionId, identity.uid, { proof: cleanString(body.proof, 5000), providerReference: cleanString(body.providerReference, 500) });
  await audit(env, identity.uid, "submission_sent_for_verification", { submissionId });
  return result;
}

async function wallet(request, env, url) {
  const { identity } = await authenticated(request, env);
  if (request.method !== "GET") methodNotAllowed();
  const [walletRecord, transactionPage, settings] = await Promise.all([getDocument(env, "wallets", identity.uid), queryCollection(env, "transactions", { filters: [{ field: "userId", value: identity.uid }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...pageFromUrl(url) }), getDocument(env, "settings", "platform")]);
  const approvedWithdrawalAmount = Number(walletRecord?.approvedWithdrawalAmount || 0);
  return { availableBalance: walletRecord?.availableBalance || 0, pendingWithdrawalAmount: Math.max(0, Number(walletRecord?.pendingWithdrawalAmount || 0)), approvedWithdrawalAmount, verificationAmount: walletRecord?.verificationAmount || 0, withdrawalPolicy: { minimumWithdrawal: Number(settings?.minimumWithdrawal || 0), enabledPayoutMethods: Array.isArray(settings?.enabledPayoutMethods) ? settings.enabledPayoutMethods : [] }, transactions: transactionPage.items, nextCursor: transactionPage.nextCursor };
}

async function withdrawals(request, env) {
  const { identity } = await authenticated(request, env);
  if (request.method !== "POST") methodNotAllowed();
  const body = await readJson(request); const amount = validNumber(body.amount, NaN);
  if (!(amount > 0)) throw new HttpError(400, "Enter a withdrawal amount greater than zero.", "invalid_withdrawal_amount");
  const method = normalisePayoutMethod(required(body.method, "Payout method")); const payoutDetails = withdrawalPayoutDetails(method, body); const payoutReference = normalisePayoutReference(body.payoutReference || payoutDetails.accountNumber || payoutDetails.upiId || `${payoutDetails.giftCardType || ""} ${payoutDetails.giftCardDetails || ""}`); const timestamp = now(); const day = withdrawalDay(timestamp); const dailyId = withdrawalDailyCounterId(identity.uid, day); const [walletRecord, settings, dailyRecord] = await Promise.all([getDocument(env, "wallets", identity.uid), getDocument(env, "settings", "platform"), getDocument(env, "withdrawalDailyStats", dailyId)]);
  if (!walletRecord) throw new HttpError(409, "Your wallet is not ready. Reload the page and try again.", "wallet_unavailable");
  if (amount > Number(walletRecord.availableBalance || 0)) throw new HttpError(409, "The requested amount exceeds your available balance.", "insufficient_balance");
  const policy = withdrawalPolicy(settings); assertWithdrawalPolicy(policy, { method, amount, dailyReservedAmount: Number(dailyRecord?.reservedAmount || 0) }); const withdrawalId = crypto.randomUUID(); const transactionId = crypto.randomUUID(); const dailyWrite = policy.dailyAmountLimit ? (dailyRecord ? writeIncrement(env, "withdrawalDailyStats", dailyId, { reservedAmount: amount }, { updateTime: dailyRecord.updatedAt }) : writeCreate(env, "withdrawalDailyStats", dailyId, { userId: identity.uid, day, reservedAmount: amount, createdAt: timestamp, updatedAt: timestamp })) : null;
  await commit(env, [
    writeIncrement(env, "wallets", identity.uid, { availableBalance: -amount, pendingWithdrawalAmount: amount }, { updateTime: walletRecord.updatedAt }),
    writeCreate(env, "withdrawals", withdrawalId, { userId: identity.uid, amount, method, payoutReference, payoutDetails, status: "pending", transactionId, createdAt: timestamp }),
    writeCreate(env, "activeWithdrawals", identity.uid, { userId: identity.uid, withdrawalId, createdAt: timestamp }),
    writeCreate(env, "transactions", transactionId, { userId: identity.uid, type: "withdrawal", reference: withdrawalId, amount: -amount, status: "pending", createdAt: timestamp }),
    writeCreate(env, "notifications", `withdrawal_submitted_${withdrawalId}`, { userId: identity.uid, category: "withdrawal", title: "Withdrawal submitted", body: "Your withdrawal request was submitted for review.", unread: true, readAt: null, createdAt: timestamp }),
    ...(dailyWrite ? [dailyWrite] : [])
  ]);
  await audit(env, identity.uid, "withdrawal_requested", { withdrawalId, amount });
  return { id: withdrawalId, status: "pending" };
}

async function profile(request, env) {
  const { identity, profile: current } = await authenticated(request, env); const settings = await getDocument(env, "settings", "platform");
  const supportedCountries = Array.isArray(settings?.supportedCountries) ? settings.supportedCountries.map((country) => ({ code: tryNormaliseCountryCode(country?.code), name: cleanString(country?.name, 100) })).filter((country) => country.code && country.name) : [];
  if (request.method === "GET") return { ...current, supportedCountries, requiresCountryConfiguration: supportedCountries.length === 0 };
  if (request.method !== "PATCH") methodNotAllowed();
  const body = await readJson(request); const country = normaliseCountryCode(body.country === undefined ? current.country : body.country, { allowEmpty: true, fieldName: "Country" });
  if (supportedCountries.length && !supportedCountries.some((item) => item.code === country)) throw new HttpError(400, "Choose a country from the configured list.", "invalid_country");
  const updates = { displayName: cleanString(body.displayName, 70), country, preferredDevice: ["mobile", "desktop", "tablet", "both"].includes(body.preferredDevice) ? body.preferredDevice : "both", updatedAt: now() };
  const result = await patchDocument(env, "users", identity.uid, updates); await audit(env, identity.uid, "profile_updated", Object.keys(updates)); return result;
}

async function referrals(request, env, url) {
  const { identity, profile } = await authenticated(request, env);
  if (request.method !== "GET") methodNotAllowed();
  const settings = await getDocument(env, "settings", "platform"); const appBaseUrl = env.PUBLIC_APP_URL || request.headers.get("Origin") || new URL(request.url).origin; const [page, verifiedReferrals, pendingReferrals] = await Promise.all([queryCollection(env, "users", referralFeedQuery(identity.uid, pageFromUrl(url))), countCollection(env, "users", referralStatusCountQuery(identity.uid, "verified")), countCollection(env, "users", referralStatusCountQuery(identity.uid, "pending"))]); const referralRewards = Number(profile.referralRewardTotal || 0); const referralConfig = referralRewardConfig(settings);
  return { code: profile.referralCode, inviteUrl: `${appBaseUrl.replace(/\/$/, "")}/pages/signup.html?ref=${encodeURIComponent(profile.referralCode)}`, verifiedReferrals, pendingReferrals, referralRewards, referrals: page.items, nextCursor: page.nextCursor, qualifyingRule: settings?.referralQualifyingRule || "The reward conditions are set by Earnivo administration.", qualifyingCompletedTasks: referralConfig.qualifyingCompletedTasks };
}

async function notifications(request, env, url) { const { identity } = await authenticated(request, env); const match = url.pathname.match(/^\/v1\/notifications(?:\/([^/]+)\/read)?$/); if (!match) throw new HttpError(404, "The notification endpoint was not found.", "notification_not_found"); if (request.method === "GET" && !match[1]) { const [page, unreadCount] = await Promise.all([queryCollection(env, "notifications", notificationFeedQuery(identity.uid, pageFromUrl(url))), countCollection(env, "notifications", unreadNotificationCountQuery(identity.uid))]); return { ...page, unreadCount }; } if (request.method === "POST" && match[1]) { const notification = await getDocument(env, "notifications", decodeURIComponent(match[1])); if (!notification || notification.userId !== identity.uid) throw new HttpError(404, "The notification was not found.", "notification_not_found"); if (!notification.unread) return { ...notification, alreadyRead: true }; return patchDocument(env, "notifications", notification.id, { unread: false, readAt: now(), updatedAt: now() }); } methodNotAllowed(); }
async function feedback(request, env) { const { identity } = await authenticated(request, env); if (request.method !== "POST") methodNotAllowed(); const body = await readJson(request); const message = required(body.message, "Feedback message"); const topic = required(body.topic, "Feedback topic"); const id = crypto.randomUUID(); await setDocument(env, "feedback", id, { userId: identity.uid, topic, message: message.slice(0, 5000), status: "new", createdAt: now() }); return { id, status: "recorded" }; }

function providerPayload(body) { const integration = ["standard", "cpalead"].includes(cleanString(body.integration || "standard", 40).toLowerCase()) ? cleanString(body.integration || "standard", 40).toLowerCase() : "standard"; return { name: required(cleanString(body.name, 120), "Provider name"), integration, status: ["active", "disabled"].includes(body.status) ? body.status : integration === "cpalead" ? "disabled" : "active", postbackNotes: cleanString(body.postbackNotes, 2000) }; }
function notificationPayload(body) { const category = cleanString(body.category || "general", 40).toLowerCase(); if (!["general", "task", "wallet", "withdrawal", "referral", "account"].includes(category)) throw new HttpError(400, "Notification category is invalid.", "invalid_notification_category"); const audience = notificationAudience(body.recipientMode); return { title: required(cleanString(body.title, 120), "Notification title"), body: required(cleanString(body.body, 1000), "Notification message"), audience, userId: audience === "specific" ? notificationRecipient(body.userId) : null, category, unread: true, readAt: null }; }
async function adminUsers(request, env, identity, id, action) {
  if (!id || request.method !== "POST" || !["role", "suspend", "restore", "adjust-balance"].includes(action)) methodNotAllowed();
  const target = await getDocument(env, "users", id); if (!target) throw new HttpError(404, "The user was not found.", "user_not_found"); const body = await readJson(request); const timestamp = now();
  if (action === "role") { assertSuperAdmin(env, identity); if (id === identity.uid) throw new HttpError(400, "Super administrators cannot change their own delegated role record.", "self_role_change_blocked"); const updated = await patchDocument(env, "users", id, { isAdmin: Boolean(body.isAdmin), updatedAt: timestamp, updatedBy: identity.uid }); await audit(env, identity.uid, "administrator_role_changed", { userId: id, isAdmin: Boolean(body.isAdmin), actorEmail: identity.email || null }); return updated; }
  if (action === "suspend" || action === "restore") { const nextStatus = action === "suspend" ? "suspended" : "active"; const updated = await patchDocument(env, "users", id, { accountStatus: nextStatus, accountStatusReason: cleanString(body.reason, 1000) || null, accountStatusChangedAt: timestamp, accountStatusChangedBy: identity.uid, updatedAt: timestamp }); await audit(env, identity.uid, `user_${action}d`, { userId: id }); return updated; }
  const amount = Number(body.amount); const reason = required(cleanString(body.reason, 1000), "Adjustment reason"); if (!Number.isFinite(amount) || amount === 0) throw new HttpError(400, "Provide a non-zero balance adjustment.", "invalid_adjustment_amount"); const wallet = await getDocument(env, "wallets", id); if (!wallet) throw new HttpError(409, "The user wallet is not available.", "wallet_unavailable"); if (Number(wallet.availableBalance || 0) + amount < 0) throw new HttpError(409, "This adjustment would make the available balance negative.", "negative_balance_blocked"); const transactionId = crypto.randomUUID(); await commit(env, [writeIncrement(env, "wallets", id, { availableBalance: amount }, { updateTime: wallet.updatedAt }), writeCreate(env, "transactions", transactionId, { userId: id, type: "admin_balance_adjustment", reference: identity.uid, amount, status: "completed", reason, createdAt: timestamp, createdBy: identity.uid })]); await audit(env, identity.uid, "user_balance_adjusted", { userId: id, amount, reason }); return { userId: id, amount, transactionId };
}
async function adminSettings(request, env, identity, id) {
  if (id !== "platform") methodNotAllowed(); const current = await getDocument(env, "settings", "platform"); if (request.method === "GET") { if (!current) throw new HttpError(404, "Platform settings have not been configured.", "settings_not_found"); return current; } if (request.method !== "PATCH") methodNotAllowed(); const body = await readJson(request); const supportedCountries = Array.isArray(body.supportedCountries) ? body.supportedCountries.map((item) => ({ code: normaliseCountryCode(item?.code, { fieldName: "Supported country code" }), name: cleanString(item?.name, 80) })).filter((item) => item.name) : (current?.supportedCountries || []); const threshold = Number(body.referralQualifyingCompletedTasks ?? current?.referralQualifyingCompletedTasks ?? 1); const reward = Number(body.referralReward ?? current?.referralReward ?? 0); const minimumWithdrawal = validNumber(body.minimumWithdrawal ?? current?.minimumWithdrawal ?? 0, NaN); const dailyWithdrawalLimit = validNumber(body.dailyWithdrawalLimit ?? current?.dailyWithdrawalLimit ?? 0, NaN); const enabledPayoutMethods = Array.isArray(body.enabledPayoutMethods) ? [...new Set(body.enabledPayoutMethods.map(normalisePayoutMethod).filter(Boolean))] : (current?.enabledPayoutMethods || []); if (![1, 2, 3].includes(threshold)) throw new HttpError(400, "Referral qualification requires one, two, or three approved tasks.", "invalid_referral_threshold"); if (!Number.isFinite(reward) || reward < 0) throw new HttpError(400, "Referral reward must be zero or greater.", "invalid_referral_reward"); if (!Number.isFinite(minimumWithdrawal) || minimumWithdrawal < 0 || !Number.isFinite(dailyWithdrawalLimit) || dailyWithdrawalLimit < 0) throw new HttpError(400, "Withdrawal settings must be zero or greater.", "invalid_withdrawal_settings"); const record = { supportedCountries, referralQualifyingRule: cleanString(body.referralQualifyingRule ?? current?.referralQualifyingRule, 1000), referralQualifyingCompletedTasks: threshold, referralReward: reward, minimumWithdrawal, dailyWithdrawalLimit, enabledPayoutMethods, updatedAt: now(), updatedBy: identity.uid, ...(current ? {} : { createdAt: now(), createdBy: identity.uid }) }; const result = await setDocument(env, "settings", "platform", record); await audit(env, identity.uid, "platform_settings_updated", { keys: Object.keys(record).filter((key) => !["updatedAt", "updatedBy", "createdAt", "createdBy"].includes(key)) }); return result;
}
async function adminProviders(request, env, identity, id) {
  if (request.method === "POST" && !id) { const recordId = crypto.randomUUID(); const result = await setDocument(env, "providers", recordId, { ...providerPayload(await readJson(request)), createdAt: now(), createdBy: identity.uid, updatedAt: now(), updatedBy: identity.uid }); await audit(env, identity.uid, "provider_created", { id: recordId }); return result; }
  if (request.method === "PATCH" && id) { const current = await getDocument(env, "providers", id); if (!current) throw new HttpError(404, "The provider was not found.", "provider_not_found"); const result = await patchDocument(env, "providers", id, { ...providerPayload({ ...current, ...(await readJson(request)) }), updatedAt: now(), updatedBy: identity.uid }); await audit(env, identity.uid, "provider_updated", { id }); return result; }
  if (request.method === "DELETE" && id) { const activeTasks = await queryCollection(env, "tasks", { filters: [{ field: "provider", value: id }, { field: "status", op: "IN", value: ["active", "hidden"] }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], limit: 1, maximum: 1 }); if (activeTasks.items.length) throw new HttpError(409, "Disable or reassign tasks before removing this provider.", "provider_in_use"); await deleteDocument(env, "providers", id); await audit(env, identity.uid, "provider_deleted", { id }); return { id, deleted: true }; }
  methodNotAllowed();
}
async function adminNotifications(request, env, identity, id) { if (id || request.method !== "POST") methodNotAllowed(); const payload = notificationPayload(await readJson(request)); const timestamp = now(); if (payload.audience === "specific") { const recipient = await getDocument(env, "users", payload.userId); if (!recipient) throw new HttpError(404, "The notification recipient was not found.", "notification_recipient_not_found"); const notificationId = crypto.randomUUID(); const result = await setDocument(env, "notifications", notificationId, { ...payload, createdAt: timestamp, createdBy: identity.uid }); await audit(env, identity.uid, "notification_sent", { id: notificationId, target: result.userId }); return result; } const broadcastId = crypto.randomUUID(); let cursor = null, delivered = 0; do { const page = await queryCollection(env, "users", { orderBy: [{ field: "createdAt", direction: "DESCENDING" }], cursor, limit: 50, maximum: 50 }); if (page.items.length) await commit(env, page.items.map((user) => writeCreate(env, "notifications", `broadcast_${broadcastId}_${user.id}`, { title: payload.title, body: payload.body, userId: user.id, category: payload.category, unread: true, readAt: null, createdAt: timestamp, createdBy: identity.uid, broadcastId }))); delivered += page.items.length; cursor = page.nextCursor; } while (cursor); await audit(env, identity.uid, "notification_broadcast_sent", { broadcastId, delivered }); return { audience: "all", broadcastId, delivered }; }
async function adminFraudAction(request, env, identity, id, action) { if (!id || action !== "review" || request.method !== "POST") methodNotAllowed(); const current = await getDocument(env, "fraud", id); if (!current) throw new HttpError(404, "The fraud case was not found.", "fraud_case_not_found"); if (current.status === "reviewed") throw new HttpError(409, "This fraud case has already been reviewed.", "fraud_case_already_reviewed"); const body = await readJson(request); const result = await patchDocument(env, "fraud", id, { status: "reviewed", reviewedAt: now(), reviewedBy: identity.uid, reviewNote: cleanString(body.note, 1000) || null }); await audit(env, identity.uid, "fraud_case_reviewed", { id }); return result; }
async function adminRoutes(request, env, url) {
  const { identity } = await adminRequest(request, env); const segments = url.pathname.split("/").filter(Boolean); const resource = segments[2]; const id = segments[3]; const action = segments[4];
  if (resource === "session" && request.method === "GET") return { isAdmin: true, isSuperAdmin: isSuperAdmin(env, identity) };
  if (resource === "dashboard" && request.method === "GET") { const [users, activeTasks, verificationSubmissions, pendingWithdrawals] = await Promise.all([countCollection(env, "users"), countCollection(env, "tasks", { filters: [{ field: "status", value: "active" }] }), countCollection(env, "submissions", { filters: [{ field: "status", value: "verification" }] }), countCollection(env, "withdrawals", { filters: [{ field: "status", value: "pending" }] })]); return { users, activeTasks, verificationSubmissions, pendingWithdrawals }; }
  if (!adminReadableResources.has(resource)) throw new HttpError(404, "The administration resource was not found.", "admin_resource_not_found");
  if (resource === "tasks") return adminTasks(request, env, identity, id, url, action);
  if (resource === "submissions" && id && ["approve", "reject"].includes(action) && request.method === "POST") { const body = await readJson(request); const result = action === "approve" ? await approveSubmission(env, id, identity.uid) : await rejectSubmission(env, id, identity.uid, cleanString(body.reason, 1000)); await audit(env, identity.uid, `submission_${action}d`, { submissionId: id }); return result; }
  if (resource === "withdrawals" && id && action && request.method === "POST") return adminWithdrawalAction(request, env, identity, id, action);
  if (resource === "users" && id && action) return adminUsers(request, env, identity, id, action);
  if (resource === "settings" && id) return adminSettings(request, env, identity, id);
  if (resource === "providers" && request.method !== "GET") return adminProviders(request, env, identity, id);
  if (resource === "notifications" && request.method !== "GET") return adminNotifications(request, env, identity, id);
  if (resource === "fraud" && id && action) return adminFraudAction(request, env, identity, id, action);
  if (request.method === "GET" && !id) return queryCollection(env, resource, { orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...pageFromUrl(url) });
  if (request.method === "GET" && id) { const record = await getDocument(env, resource, id); if (!record) throw new HttpError(404, "The record was not found.", "record_not_found"); return record; }
  methodNotAllowed();
}

async function adminTasks(request, env, identity, id, url, action) {
  if (request.method === "GET" && !id) return queryCollection(env, "tasks", { orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...pageFromUrl(url) });
  if (request.method === "POST" && !id) { const taskId = crypto.randomUUID(); const task = taskShape(await readJson(request)); await requireActiveProvider(env, task.provider); normalizeTaskDates(task); if (task.maximumReward && task.maximumReward < task.reward) throw new HttpError(400, "Maximum reward must cover at least one task reward.", "invalid_reward_budget"); const timestamp = now(); const record = { ...task, status: task.status || "active", completions: 0, createdAt: timestamp, updatedAt: timestamp, createdBy: identity.uid }; await commit(env, [writeCreate(env, "tasks", taskId, record), writeCreate(env, "campaignCounters", campaignCounterId(taskId), { taskId, completedCount: 0, reservedCount: 0, paidRewardTotal: 0, reservedRewardTotal: 0, createdAt: timestamp, updatedAt: timestamp })]); await audit(env, identity.uid, "task_created", { id: taskId }); return { id: taskId, ...record }; }
  if (request.method === "POST" && id && action === "status") { const task = await getDocument(env, "tasks", id); if (!task) throw new HttpError(404, "The task was not found.", "task_not_found"); const body = await readJson(request); const status = cleanString(body.status); if (!isTaskStatus(status)) throw new HttpError(400, "Choose active, hidden, disabled, or expired.", "invalid_task_status"); const record = await patchDocument(env, "tasks", id, { status, statusChangedAt: now(), statusChangedBy: identity.uid, updatedAt: now(), updatedBy: identity.uid }); await audit(env, identity.uid, "task_status_changed", { id, from: task.status, to: status }); return record; }
  if (request.method === "PATCH" && id) { const [existing, counter] = await Promise.all([getDocument(env, "tasks", id), getDocument(env, "campaignCounters", campaignCounterId(id))]); if (!existing) throw new HttpError(404, "The task was not found.", "task_not_found"); const updates = taskShape(await readJson(request), { partial: true }); if (updates.provider !== undefined) await requireActiveProvider(env, updates.provider); const candidate = { ...existing, ...updates }; const normalizedDates = normalizeTaskDates(candidate); const history = counter ? [] : await listCollection(env, "submissions", 500); const totals = campaignRewardTotals(counterState(existing, counter, history)); if (candidate.maximumReward && candidate.maximumReward < candidate.reward) throw new HttpError(400, "Maximum reward must cover at least one task reward.", "invalid_reward_budget"); if (candidate.maximumReward && candidate.maximumReward < totals.paid + totals.reserved) throw new HttpError(409, "The campaign reward budget cannot be reduced below rewards already paid or reserved.", "budget_below_commitment"); const record = await patchDocument(env, "tasks", id, { ...updates, ...normalizedDates, updatedAt: now(), updatedBy: identity.uid }); await audit(env, identity.uid, "task_updated", { id }); return record; }
  if (request.method === "DELETE" && id) throw new HttpError(405, "Published task records are permanent. Change the task status to hidden, disabled, or expired instead.", "task_deletion_not_allowed");
  methodNotAllowed();
}

async function adminWithdrawalAction(request, env, identity, id, action) {
  const withdrawal = await getDocument(env, "withdrawals", id); if (!withdrawal) throw new HttpError(404, "The withdrawal was not found.", "withdrawal_not_found"); const nextStatus = nextWithdrawalStatus(withdrawal.status, action); if (!nextStatus) throw new HttpError(409, `This withdrawal cannot transition from ${withdrawal.status} using ${action}.`, "invalid_withdrawal_transition");
  const body = await readJson(request); const timestamp = now(); const wallet = await getDocument(env, "wallets", withdrawal.userId); if (!wallet) throw new HttpError(409, "The member wallet is not available for this withdrawal.", "wallet_unavailable");
  const reviewNote = cleanString(body.note, 1000); const paymentReference = cleanString(body.paymentReference, 500); if (action === "reject" && !reviewNote) throw new HttpError(400, "A rejection reason is required.", "rejection_reason_required"); if (action === "paid" && !paymentReference) throw new HttpError(400, "Record the payout provider reference before marking a withdrawal as paid.", "payment_reference_required");
  const statusFields = action === "approve" ? { status: "approved", approvedAt: timestamp, approvedBy: identity.uid, approvalNote: reviewNote } : action === "reject" ? { status: "rejected", rejectedAt: timestamp, rejectedBy: identity.uid, rejectionReason: reviewNote } : { status: "paid", paidAt: timestamp, paidBy: identity.uid, paymentReference, paymentNote: reviewNote };
  const writes = [writePatch(env, "withdrawals", id, statusFields, { updateTime: withdrawal.updatedAt })];
  if (withdrawal.transactionId) writes.push(writePatch(env, "transactions", withdrawal.transactionId, { status: nextStatus, updatedAt: timestamp, ...(action === "paid" ? { paymentReference } : {}) }));
  if (action === "reject") writes.push(writeIncrement(env, "wallets", withdrawal.userId, { availableBalance: Number(withdrawal.amount), pendingWithdrawalAmount: -Number(withdrawal.amount) }, { updateTime: wallet.updatedAt }), writeDelete(env, "activeWithdrawals", withdrawal.userId), writeCreate(env, "transactions", crypto.randomUUID(), { userId: withdrawal.userId, type: "withdrawal_reversal", reference: id, amount: Number(withdrawal.amount), status: "completed", createdAt: timestamp }));
  if (action === "approve") writes.push(writeIncrement(env, "wallets", withdrawal.userId, { pendingWithdrawalAmount: -Number(withdrawal.amount), approvedWithdrawalAmount: Number(withdrawal.amount) }, { updateTime: wallet.updatedAt }));
  if (action === "paid") writes.push(writeIncrement(env, "wallets", withdrawal.userId, { approvedWithdrawalAmount: -Number(withdrawal.amount) }, { updateTime: wallet.updatedAt }), writeDelete(env, "activeWithdrawals", withdrawal.userId));
  await commit(env, writes); await audit(env, identity.uid, `withdrawal_${nextStatus}`, { id, paymentReference: action === "paid" ? paymentReference : undefined }); return { ...withdrawal, ...statusFields };
}

export async function route(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return { status: "ok" };
  if (url.pathname === "/v1/postbacks/provider") { if (request.method !== "POST") methodNotAllowed(); const contentType = request.headers.get("Content-Type") || ""; if (!contentType.includes("application/json")) throw new HttpError(415, "Send a JSON request body.", "invalid_content_type"); const rawBody = await request.text(); let payload; try { payload = JSON.parse(rawBody); } catch { throw new HttpError(400, "The request body is not valid JSON.", "invalid_json"); } return processPostback(request, env, payload, rawBody); }
  if (url.pathname.startsWith("/v1/tasks")) return tasks(request, env, url);
  if (url.pathname.startsWith("/v1/submissions/")) return submissions(request, env, url);
  if (url.pathname === "/v1/dashboard") return dashboard(request, env, url);
  if (url.pathname === "/v1/wallet") return wallet(request, env, url);
  if (url.pathname === "/v1/withdrawals") return withdrawals(request, env);
  if (url.pathname === "/v1/profile") return profile(request, env);
  if (url.pathname === "/v1/referrals") return referrals(request, env, url);
  if (url.pathname.startsWith("/v1/notifications")) return notifications(request, env, url);
  if (url.pathname === "/v1/feedback") return feedback(request, env);
  if (url.pathname === "/v1/users/bootstrap") { if (request.method !== "POST") methodNotAllowed(); const body = await readJson(request); const { profile } = await authenticated(request, env, { referralCode: cleanString(body.referralCode, 80) }); return profile; }
  if (url.pathname.startsWith("/v1/admin/")) return adminRoutes(request, env, url);
  throw new HttpError(404, "The requested endpoint was not found.", "not_found");
}
