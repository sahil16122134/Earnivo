import assert from "node:assert/strict";
import test from "node:test";
import { notificationFeedQuery, notificationRecipient } from "../src/notifications.js";

test("member notification queries use direct userId equality and descending creation time", () => { const query = notificationFeedQuery("member-7", { limit: 20, cursor: null }); assert.deepEqual(query.filters, [{ field: "userId", value: "member-7" }]); assert.deepEqual(query.orderBy, [{ field: "createdAt", direction: "DESCENDING" }]); });
test("notifications require an explicit recipient instead of storing a broadcast null userId", () => { assert.equal(notificationRecipient(" member-7 "), "member-7"); assert.throws(() => notificationRecipient(""), { code: "notification_recipient_required" }); });

