/** Referral lifecycle: validated attribution is immutable; a qualifying approved task verifies the relationship and credits the referrer once. */
import { HttpError } from "./http.js";
import { getDocument, writeCreate, writeIncrement, writePatch } from "./firestore.js";

export const normaliseReferralCode = (value) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 80);
export const referralRewardConfig = (settings = {}) => ({ reward: Math.max(0, Number(settings.referralReward || 0)), qualifyingCompletedTasks: Math.max(1, Math.floor(Number(settings.referralQualifyingCompletedTasks || 1))) });
export const shouldVerifyReferral = (user, config) => user.referralStatus === "pending" && Number(user.qualifiedTaskCount || 0) + 1 >= config.qualifyingCompletedTasks;
export const referralFeedQuery = (referrerId, page) => ({ filters: [{ field: "referredBy", value: referrerId }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...page });
export const referralStatusCountQuery = (referrerId, status) => ({ filters: [{ field: "referredBy", value: referrerId }, { field: "referralStatus", value: status }] });

export async function resolveReferralAttribution(env, userId, suppliedCode) {
  const code = normaliseReferralCode(suppliedCode);
  if (!code) return { referredBy: null, referralCodeUsed: null, referralStatus: "none", qualifiedTaskCount: 0, referralRewardCredited: false };
  const referral = await getDocument(env, "referralCodes", code);
  if (!referral?.ownerId) throw new HttpError(400, "This invitation code is not valid.", "invalid_referral_code");
  if (referral.ownerId === userId) throw new HttpError(400, "You cannot apply your own invitation code.", "self_referral");
  return { referredBy: referral.ownerId, referralCodeUsed: code, referralStatus: "pending", qualifiedTaskCount: 0, referralRewardCredited: false, referralCreatedAt: new Date().toISOString() };
}

export async function qualifyReferral(env, completedUserId, timestamp) {
  const user = await getDocument(env, "users", completedUserId);
  if (!user || user.referralStatus !== "pending" || !user.referredBy) return { writes: [], verified: false };
  const settings = await getDocument(env, "settings", "platform"); const config = referralRewardConfig(settings); const nextQualifiedCount = Number(user.qualifiedTaskCount || 0) + 1;
  if (!shouldVerifyReferral(user, config)) return { writes: [writePatch(env, "users", user.id, { qualifiedTaskCount: nextQualifiedCount, updatedAt: timestamp }, { updateTime: user.updatedAt })], verified: false };
  const [referrerWallet, referrerProfile] = await Promise.all([getDocument(env, "wallets", user.referredBy), getDocument(env, "users", user.referredBy)]);
  if (!referrerWallet || !referrerProfile) throw new HttpError(409, "The referrer account is unavailable.", "referrer_unavailable");
  const reward = config.reward; const writes = [writePatch(env, "users", user.id, { qualifiedTaskCount: nextQualifiedCount, referralStatus: "verified", referralVerifiedAt: timestamp, referralRewardCredited: true, referralRewardAmount: reward, updatedAt: timestamp }, { updateTime: user.updatedAt }), writeIncrement(env, "users", user.referredBy, { verifiedReferralCount: 1, referralRewardTotal: reward }, { updateTime: referrerProfile.updatedAt }), writeCreate(env, "notifications", `referral_verified_${user.id}`, { userId: user.referredBy, category: "referral", title: "Referral verified", body: "A referred member completed the qualifying action.", unread: true, readAt: null, createdAt: timestamp })];
  if (reward > 0) {
    const transactionId = `referral_${user.id}`;
    writes.push(writeIncrement(env, "wallets", user.referredBy, { availableBalance: reward }, { updateTime: referrerWallet.updatedAt }), writeCreate(env, "transactions", transactionId, { userId: user.referredBy, type: "referral_reward", reference: user.id, amount: reward, status: "completed", createdAt: timestamp }));
  }
  return { writes, verified: true, referrerId: user.referredBy, reward };
}
