/** Task dates are stored as complete UTC ISO timestamps; date-only expiries mean the end of that UTC calendar day. */
import { HttpError } from "./http.js";

const dayOnly = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeTaskDate(value, boundary) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (dayOnly.test(raw)) return `${raw}T${boundary === "expiry" ? "23:59:59.999" : "00:00:00.000"}Z`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.valueOf())) throw new HttpError(400, `${boundary === "expiry" ? "Expiry" : "Start"} date must be a valid date or ISO timestamp.`, "invalid_task_date");
  const normalized = parsed.toISOString();
  return normalized;
}
export function normalizeTaskDates(task) { const startDate = normalizeTaskDate(task.startDate, "start"); const expiryDate = normalizeTaskDate(task.expiryDate, "expiry"); if (startDate && expiryDate && startDate > expiryDate) throw new HttpError(400, "Expiry date must be after the start date.", "invalid_task_date_range"); return { startDate, expiryDate }; }
