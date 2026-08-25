/** Ledger Light design: concise toast messages confirm accountable actions without stealing focus. */
import { escapeHtml } from "../utils.js";

export function toast(message, type = "info") {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  const item = document.createElement("div");
  item.className = `toast toast--${type}`;
  item.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" aria-label="Dismiss message">×</button>`;
  item.querySelector("button").addEventListener("click", () => item.remove());
  region.append(item);
  window.setTimeout(() => item.remove(), 5500);
}

