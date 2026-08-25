/** User provisioning creates the profile, wallet, and referral-code index atomically; signup attribution is immutable after creation. */
import { commit, getDocument, writeCreate } from "./firestore.js";
import { resolveReferralAttribution } from "./referral.js";

const newReferralCode = (uid) => `E${uid.replace(/[^A-Za-z0-9]/g, "").slice(0, 20).toUpperCase()}`;

export async function ensureUser(env, identity, { referralCode = "" } = {}) {
  const existing = await getDocument(env, "users", identity.uid);
  if (existing) return existing;
  const createdAt = new Date().toISOString(); const code = newReferralCode(identity.uid); const attribution = await resolveReferralAttribution(env, identity.uid, referralCode);
  const profile = { email: identity.email, displayName: identity.name || "", referralCode: code, isAdmin: false, ...attribution, createdAt, updatedAt: createdAt };
  await commit(env, [
    writeCreate(env, "users", identity.uid, profile),
    writeCreate(env, "wallets", identity.uid, { userId: identity.uid, availableBalance: 0, pendingWithdrawalAmount: 0, verificationAmount: 0, createdAt, updatedAt: createdAt }),
    writeCreate(env, "referralCodes", code, { ownerId: identity.uid, code, createdAt })
  ]);
  return { id: identity.uid, ...profile };
}

