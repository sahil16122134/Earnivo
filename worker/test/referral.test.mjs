import assert from "node:assert/strict";
import test from "node:test";
import { normaliseReferralCode, referralFeedQuery, referralRewardConfig, referralStatusCountQuery, shouldVerifyReferral } from "../src/referral.js";
import { newReferralCode } from "../src/userAuth.js";

test("referral codes are normalized before lookup", () => { assert.equal(normaliseReferralCode("  e-code_7! "), "E-CODE_7"); });
test("new referral codes use the short EARNIVO plus four-digit format while legacy codes remain normalizable", () => { assert.match(newReferralCode(), /^EARNIVO\d{4}$/); assert.equal(normaliseReferralCode("EABCDEFGHIJKLMN"), "EABCDEFGHIJKLMN"); });
test("qualification requires the configured number of approved tasks", () => { const config = referralRewardConfig({ referralReward: 25, referralQualifyingCompletedTasks: 2 }); assert.equal(shouldVerifyReferral({ referralStatus: "pending", qualifiedTaskCount: 0 }, config), false); assert.equal(shouldVerifyReferral({ referralStatus: "pending", qualifiedTaskCount: 1 }, config), true); });
test("verified or non-referred members cannot be credited again", () => { const config = referralRewardConfig({}); assert.equal(shouldVerifyReferral({ referralStatus: "verified", qualifiedTaskCount: 0 }, config), false); assert.equal(shouldVerifyReferral({ referralStatus: "none", qualifiedTaskCount: 0 }, config), false); });

test("referral history and totals use direct referrer-scoped Firestore query contracts", () => { assert.deepEqual(referralFeedQuery("referrer-1", { limit: 20, cursor: null }), { filters: [{ field: "referredBy", value: "referrer-1" }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], limit: 20, cursor: null }); assert.deepEqual(referralStatusCountQuery("referrer-1", "verified"), { filters: [{ field: "referredBy", value: "referrer-1" }, { field: "referralStatus", value: "verified" }] }); });
