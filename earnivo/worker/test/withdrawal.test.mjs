import assert from "node:assert/strict";
import test from "node:test";
import { allowedWithdrawalActions, nextWithdrawalStatus } from "../src/withdrawal.js";

test("approval is a review state, not a paid state", () => { assert.equal(nextWithdrawalStatus("pending", "approve"), "approved"); assert.notEqual(nextWithdrawalStatus("pending", "approve"), "paid"); });
test("only an approved withdrawal can become paid", () => { assert.equal(nextWithdrawalStatus("approved", "paid"), "paid"); assert.equal(nextWithdrawalStatus("pending", "paid"), null); });
test("rejected and paid withdrawals are terminal", () => { assert.deepEqual(allowedWithdrawalActions("rejected"), []); assert.deepEqual(allowedWithdrawalActions("paid"), []); });

