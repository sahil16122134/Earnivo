/** User provisioning creates the profile, wallet, and referral-code index atomically; signup attribution is immutable after creation. */
import { commit, getDocument, writeCreate } from "./firestore.js";
import { HttpError } from "./http.js";
import { resolveReferralAttribution } from "./referral.js";

const codeAlphabet = "0123456789";
export const newReferralCode = () => `EARNIVO${Array.from(crypto.getRandomValues(new Uint8Array(4)), (byte) => codeAlphabet[byte % codeAlphabet.length]).join("")}`;

export async function ensureUser(env, identity, { referralCode = "" } = {}) {
  const existing = await getDocument(env, "users", identity.uid);
  if (existing) return existing;
  const createdAt = new Date().toISOString(); const attribution = await resolveReferralAttribution(env, identity.uid, referralCode);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = newReferralCode();
    if (await getDocument(env, "referralCodes", code)) continue;
    const profile = { email: identity.email, displayName: identity.name || "", referralCode: code, isAdmin: false, ...attribution, createdAt, updatedAt: createdAt };
    try {
      await commit(env, [
        writeCreate(env, "users", identity.uid, profile),
        writeCreate(env, "wallets", identity.uid, { userId: identity.uid, availableBalance: 0, pendingWithdrawalAmount: 0, verificationAmount: 0, createdAt, updatedAt: createdAt }),
        writeCreate(env, "referralCodes", code, { ownerId: identity.uid, code, createdAt })
      ]);
      return { id: identity.uid, ...profile };
    } catch (error) {
      if (error?.code !== "concurrent_update") throw error;
      const provisioned = await getDocument(env, "users", identity.uid);
      if (provisioned) return provisioned;
    }
  }
  throw new HttpError(503, "A referral code could not be generated. Please try again.", "referral_code_generation_failed");
}
