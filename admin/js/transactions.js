import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("transactions.html");
let active = "All";
let search = "";

document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
document.getElementById("search-input").addEventListener("input", (e) => { search = e.target.value; load(); });

load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const items = await AdminApi.listTransactions({ type: active, q: search });
    if (!items.length) { body.innerHTML = `<tr><td colspan="7" class="empty-state">No transactions match this filter.</td></tr>`; return; }
    body.innerHTML = items.map(row).join("");
  } catch (e) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">Couldn't load transactions. Confirm the Worker's /admin/transactions endpoint is deployed.</td></tr>`;
  }
}

function row(t) {
  const isCredit = t.amountRupees >= 0;
  return `<tr>
    <td class="mono">${esc(t.transactionId)}</td>
    <td>${esc(t.username || t.userId)}</td>
    <td>${esc(t.type)}</td>
    <td class="mono">${esc(t.providerTransactionId || "—")}</td>
    <td class="mono" style="color:${isCredit ? "var(--accent-mint-ink)" : "var(--accent-coral-ink)"}">${isCredit ? "+" : "−"}₹${Math.abs(t.amountRupees).toFixed(2)}</td>
    <td><span class="pill ${t.status === "completed" ? "pill-success" : t.status === "failed" ? "pill-fail" : "pill-pending"}">${t.status}</span></td>
    <td class="mono">${t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</td>
  </tr>`;
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
