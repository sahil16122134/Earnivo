import assert from "node:assert/strict";
import test from "node:test";
import { campaignCounterId, campaignCounterSeed, counterState, canReserveCampaignSlot, canReserveRewardBudget } from "../src/campaign.js";
import { writeCreate, writeIncrement } from "../src/firestore.js";

const env = { FIREBASE_PROJECT_ID: "earnivo-test" };

test("a new campaign counter is created with an exists:false precondition", () => {
  const write = writeCreate(env, "campaignCounters", campaignCounterId("task-a"), { taskId: "task-a" });
  assert.equal(write.currentDocument.exists, false);
});

test("an existing campaign counter uses its update-time precondition", () => {
  const write = writeIncrement(env, "campaignCounters", "campaign_task-a", { reservedCount: 1 }, { updateTime: "2026-08-25T00:00:00.000Z" });
  assert.equal(write.currentDocument.updateTime, "2026-08-25T00:00:00.000Z");
});

test("one final counter slot cannot be reserved twice from the same counter state", () => {
  const task = { id: "task-a", userLimit: 2, maximumReward: 20 };
  const state = counterState(task, { taskId: "task-a", completedCount: 1, reservedCount: 0, paidRewardTotal: 10, reservedRewardTotal: 0 });
  assert.equal(canReserveCampaignSlot(state), true);
  assert.equal(canReserveRewardBudget(state, [], 10), true);
  const afterFirstReservation = counterState(task, { taskId: "task-a", completedCount: 1, reservedCount: 1, paidRewardTotal: 10, reservedRewardTotal: 10 });
  assert.equal(canReserveCampaignSlot(afterFirstReservation), false);
  assert.equal(canReserveRewardBudget(afterFirstReservation, [], 10), false);
});

test("legacy task counters can be seeded from history only during migration", () => {
  const task = { id: "task-a" }; const history = [{ taskId: "task-a", status: "completed", reward: 10 }, { taskId: "task-a", status: "verification", reward: 5 }];
  assert.deepEqual(campaignCounterSeed(task, history), { taskId: "task-a", completedCount: 1, reservedCount: 1, paidRewardTotal: 10, reservedRewardTotal: 5 });
});

