import assert from "node:assert/strict";
import test from "node:test";
import { campaignCounterIncrements, canCompleteCampaignSlot, canReserveCampaignSlot, campaignCounts } from "../src/campaign.js";

const task = { id: "campaign-a", userLimit: 2, completedCount: 1, reservedCount: 0 };

test("a campaign cap applies across all users rather than per member", () => {
  const submissions = [{ taskId: "campaign-a", userId: "member-a", status: "completed" }, { taskId: "campaign-a", userId: "member-b", status: "completed" }];
  assert.equal(canReserveCampaignSlot({ id: "campaign-a", userLimit: 2 }, submissions), false);
});

test("a reserved in-progress slot consumes the remaining campaign capacity", () => {
  const submissions = [{ taskId: "campaign-a", userId: "member-a", status: "completed" }, { taskId: "campaign-a", userId: "member-b", status: "verification" }];
  assert.equal(canReserveCampaignSlot({ id: "campaign-a", userLimit: 2 }, submissions), false);
});

test("a counter-based campaign stops approvals at its completion cap", () => {
  assert.equal(canCompleteCampaignSlot({ ...task, completedCount: 2, reservedCount: 0 }, []), false);
  assert.equal(canCompleteCampaignSlot(task, []), true);
});

test("legacy campaign records initialise counters from global submission history", () => {
  const legacyTask = { id: "campaign-a", userLimit: 5 };
  const submissions = [{ taskId: "campaign-a", status: "completed" }, { taskId: "campaign-a", status: "verification" }];
  assert.deepEqual(campaignCounts(legacyTask, submissions).completed, 1);
  assert.deepEqual(campaignCounterIncrements(legacyTask, submissions, { reserved: 1 }), { completedCount: 1, reservedCount: 2 });
});

