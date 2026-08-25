import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("providers.html");
document.getElementById("status-chips").addEventListener("click", (e) => {
  if (e.target.matches(".chip")) { document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active")); e.target.classList.add("active"); load(e.target.dataset.c); }
});

load("All");

async function load(filter = "All") {
  const body = document.getElementById("table-body");
  try {
    let items = await AdminApi.listProviders();
    if (filter !== "All") items = items.filter((p) => (filter === "Enabled" ? p.enabled : !p.enabled));
    if (!items.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">No providers configured. Ad/offer providers (Monetag, AdsGram, etc.) are wired up directly in the Worker's postback handlers and secrets — this page is a read-only status view once a provider starts sending postbacks; there's no in-UI provider setup yet.</td></tr>`;
      return;
    }
    body.innerHTML = items.map(row).join("");
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Couldn't load providers. Configuration and secrets stay server-side in the Worker — never in this frontend.</td></tr>`;
  }
}

function row(p) {
  return `<tr>
    <td><strong>${esc(p.name)}</strong></td>
    <td>${esc(p.type)}</td>
    <td><span class="pill ${p.enabled ? "pill-success" : "pill-fail"}">${p.enabled ? "Enabled" : "Disabled"}</span></td>
    <td class="mono">${p.lastCallback ? new Date(p.lastCallback).toLocaleString() : "—"}</td>
    <td>${p.errorCount ?? 0}</td>
    <td class="actions-cell"><span style="color:var(--text-faint);font-size:.8rem">Managed via Worker config</span></td>
  </tr>`;
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
