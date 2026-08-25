import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTaskDate, normalizeTaskDates } from "../src/task-dates.js";

test("date-only task expiry is normalized to the final millisecond of the UTC day", () => { assert.equal(normalizeTaskDate("2026-08-25", "expiry"), "2026-08-25T23:59:59.999Z"); });
test("date-only task start is normalized to the beginning of the UTC day", () => { assert.equal(normalizeTaskDate("2026-08-25", "start"), "2026-08-25T00:00:00.000Z"); });
test("full timestamps are normalized to ISO UTC and invalid ranges are rejected", () => { assert.equal(normalizeTaskDate("2026-08-25T15:30:00+05:30", "start"), "2026-08-25T10:00:00.000Z"); assert.throws(() => normalizeTaskDates({ startDate: "2026-08-26", expiryDate: "2026-08-25" }), { code: "invalid_task_date_range" }); });
test("malformed task timestamps are rejected with a structured validation error", () => { assert.throws(() => normalizeTaskDate("not-a-date", "expiry"), { code: "invalid_task_date" }); });
