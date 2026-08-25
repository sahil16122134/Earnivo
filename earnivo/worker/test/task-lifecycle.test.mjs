import assert from "node:assert/strict";
import test from "node:test";
import { isMemberVisibleTaskStatus, isRetirementStatus, isTaskStatus, taskStatuses } from "../src/task-lifecycle.js";

test("published task lifecycle uses only preserved availability states", () => { assert.deepEqual(taskStatuses, ["active", "hidden", "disabled", "expired"]); assert.equal(isTaskStatus("hidden"), true); assert.equal(isTaskStatus("deleted"), false); });
test("retirement states preserve a task record without using deletion", () => { assert.equal(isRetirementStatus("hidden"), true); assert.equal(isRetirementStatus("disabled"), true); assert.equal(isRetirementStatus("expired"), true); assert.equal(isRetirementStatus("active"), false); });
test("only active tasks are member-visible while hidden tasks remain retained lifecycle records", () => { assert.equal(isMemberVisibleTaskStatus("active"), true); assert.equal(isMemberVisibleTaskStatus("hidden"), false); assert.equal(isMemberVisibleTaskStatus("disabled"), false); });
