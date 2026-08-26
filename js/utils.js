/** Ledger Light design: shared UI utilities keep status, money and time consistently readable. */
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

export function currency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(amount || 0));
}

export function compactNumber(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat(undefined, options).format(date);
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
}

export function setLoading(element, loading, label = "Working…") {
  element.disabled = loading;
  element.dataset.originalLabel ||= element.innerHTML;
  element.innerHTML = loading ? `<span class="button-spinner" aria-hidden="true"></span>${label}` : element.dataset.originalLabel;
}

export function statusClass(status = "") {
  return `status status--${String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
