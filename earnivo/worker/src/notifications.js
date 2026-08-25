/** Notifications are direct inbox records: every delivery carries a recipient userId and is read through that indexed recipient feed. */
import { HttpError } from "./http.js";

export function notificationRecipient(value) { const userId = typeof value === "string" ? value.trim().slice(0, 128) : ""; if (!userId) throw new HttpError(400, "A recipient user ID is required. Create individual inbox records for each intended member.", "notification_recipient_required"); return userId; }
export function notificationFeedQuery(userId, page) { return { filters: [{ field: "userId", value: userId }], orderBy: [{ field: "createdAt", direction: "DESCENDING" }], ...page }; }
export function unreadNotificationCountQuery(userId) { return { filters: [{ field: "userId", value: userId }, { field: "unread", value: true }] }; }
