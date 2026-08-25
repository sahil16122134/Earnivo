import assert from "node:assert/strict";
import test from "node:test";
import { canRecordDailyCompletion, dailyCompletionLimit, dailyCounterId, utcDay } from "../src/daily.js";

test("a daily cap applies to all campaign completions rather than individual members", () => {
  const task = { dailyLimit: 2 };
  assert.equal(canRecordDailyCompletion(task, { completedCount: 1 }), true);
  assert.equal(canRecordDailyCompletion(task, { completedCount: 2 }), false);
});

test("daily cap records use a stable UTC task-and-day identifier", () => {
  assert.equal(utcDay("2026-08-25T23:59:59.000Z"), "2026-08-25");
  assert.equal(dailyCounterId("task-a", "2026-08-25"), "task-a_2026-08-25");
});

test("zero daily limit keeps the campaign uncapped for that day", () => {
  assert.equal(dailyCompletionLimit({ dailyLimit: 0 }), 0);
  assert.equal(canRecordDailyCompletion({ dailyLimit: 0 }, { completedCount: 999 }), true);
});

