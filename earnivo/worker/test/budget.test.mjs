import assert from "node:assert/strict";
import test from "node:test";
import { canReserveRewardBudget, canSpendRewardBudget, campaignRewardBudget, campaignRewardTotals, rewardBudgetIncrements } from "../src/campaign.js";

test("the reward budget is enforced across all members, not per member", () => {
  const task = { id: "campaign-a", maximumReward: 100 };
  const submissions = [{ taskId: "campaign-a", userId: "member-a", status: "completed", reward: 90 }];
  assert.equal(canReserveRewardBudget(task, submissions, 10), true);
  assert.equal(canReserveRewardBudget(task, submissions, 11), false);
});

test("reserved rewards consume campaign budget before approval", () => {
  const task = { id: "campaign-a", maximumReward: 100, paidRewardTotal: 60, reservedRewardTotal: 30 };
  assert.equal(canReserveRewardBudget(task, [], 10), true);
  assert.equal(canReserveRewardBudget(task, [], 11), false);
  assert.equal(canSpendRewardBudget(task, [], 40), true);
  assert.equal(canSpendRewardBudget(task, [], 41), false);
});

test("legacy campaigns initialise paid and reserved totals from global submission history", () => {
  const task = { id: "campaign-a", maximumReward: 100 };
  const submissions = [{ taskId: "campaign-a", status: "completed", reward: 40 }, { taskId: "campaign-a", status: "verification", reward: 20 }];
  assert.deepEqual(campaignRewardTotals(task, submissions), { paid: 40, reserved: 20, legacyPaid: true, legacyReserved: true });
  assert.deepEqual(rewardBudgetIncrements(task, submissions, { reserved: 10 }), { paidRewardTotal: 40, reservedRewardTotal: 30 });
  assert.equal(campaignRewardBudget(task), 100);
});

