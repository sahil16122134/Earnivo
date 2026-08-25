// Bootstraps a Firestore `users/{uid}` profile the first time a user signs in
// with Firebase Authentication (email/password, Google, or any other Firebase
// Auth provider configured in the console). The client authenticates directly
// with the Firebase Auth SDK and never talks to this endpoint for the sign-in
// itself — this endpoint only creates/refreshes the Firestore profile
// document, since `firestore.rules` blocks users from creating their own
// `users/{uid}` doc (`allow create: if false`), so it has to happen here with
// the Worker's service-account credentials.
import { verifyIdToken } from "./firebaseAuth.js";
import { json } from "./http.js";
import { AppError } from "./reward.js";

export async function handleEnsureUser(request, env, firestore) {
  const auth = await verifyIdToken(request, env);
  if (!auth) throw new AppError("UNAUTHENTICATED", "Sign-in required.", 401);

  const uid = auth.uid;
  const now = new Date().toISOString();
  const existing = await firestore.getDoc(`users/${uid}`);

  if (!existing) {
    // Generate a unique, unpredictable referral code for the new user.
    const referralCode = generateReferralCode();
    const profile = {
      firebaseUid: uid,
      email: auth.claims.email || "",
      displayName: auth.claims.name || (auth.claims.email ? auth.claims.email.split("@")[0] : "Earnivo user"),
      profilePhoto: auth.claims.picture || "",
      role: "user", coinBalance: 0, balanceRupees: 0, totalEarnedCoins: 0, totalRedeemedCoins: 0,
      dailyStreak: 0, riskLevel: "Low", referralCode, createdAt: now, updatedAt: now,
    };
    try {
      await firestore.createDoc("users", uid, profile);
      return json(profile);
    } catch (e) {
      // A concurrent ensure-user call (e.g. a race between app-load and a
      // retry) may have created the doc a moment ago — Firestore's create
      // endpoint 409s in that case. Treat it as success and return the
      // profile that now exists, instead of surfacing a 500.
      const nowExisting = await firestore.getDoc(`users/${uid}`);
      if (nowExisting) return backfillReferralCodeIfMissing(firestore, uid, nowExisting);
      throw e;
    }
  }

  // Older accounts created before referral codes existed (or accounts whose
  // very first ensure-user call failed partway through, e.g. during a Worker
  // outage) can be left with no referralCode. Every user is expected to have
  // one, so heal it here rather than showing a blank code in the app forever.
  return backfillReferralCodeIfMissing(firestore, uid, existing);
}

function generateReferralCode() {
  return `EARNIVO${Math.floor(1000 + Math.random() * 9000)}`;
}

async function backfillReferralCodeIfMissing(firestore, uid, profile) {
  if (profile.referralCode) return json(profile);

  const path = `users/${uid}`;
  // Small retry loop guards against the astronomically unlikely case of a
  // collision with another user's code, and against a concurrent write
  // changing the document between read and patch (currentDocument.updateTime
  // makes the patch fail rather than silently overwrite newer data).
  for (let attempt = 0; attempt < 3; attempt++) {
    const meta = await firestore.getDocMeta(path);
    if (!meta) return json(profile); // doc vanished; nothing sane to do
    if (meta.doc.referralCode) return json(meta.doc); // healed by a concurrent request

    const referralCode = generateReferralCode();
    const existingWithCode = await firestore.runQuery("users", {
      where: [["referralCode", "EQUAL", referralCode]],
      limit: 1,
    });
    if (existingWithCode.length) continue; // collision (near-impossible); retry with a new code

    const updated = { ...meta.doc, referralCode, updatedAt: new Date().toISOString() };
    try {
      await firestore.setDoc(path, updated, { updateTime: meta.updateTime });
      return json(updated);
    } catch (e) {
      // Someone else wrote to this doc between our read and patch — loop and
      // re-read rather than surfacing an error to the user.
    }
  }

  return json(profile);
}
