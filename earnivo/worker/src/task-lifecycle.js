/** Published tasks are historical records; lifecycle changes alter availability without deleting the task or its linked earnings history. */
export const taskStatuses = Object.freeze(["active", "hidden", "disabled", "expired"]);
export function isTaskStatus(value) { return taskStatuses.includes(String(value || "").trim()); }
export function isRetirementStatus(value) { return ["hidden", "disabled", "expired"].includes(String(value || "").trim()); }
export function isMemberVisibleTaskStatus(value) { return String(value || "").trim() === "active"; }
