import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("revenue.html");
let range = "7d";
document.querySelectorAll("#range-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#range-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); range = c.dataset.r; load(); })
);
load();

async function load() {
  try {
    const s = await AdminApi.stats(range);
    const estimateNote = s.isEstimate
      ? `<div class="empty-state" style="text-align:left;padding:8px 12px;margin-bottom:10px;">
           ⚠️ Revenue, provider costs, and profit below are <strong>estimates</strong>
           (based on user rewards × an assumed margin) — there's no ad-network
           payout integration reporting real figures yet.
         </div>`
      : "";
    document.getElementById("rev-stats").innerHTML = estimateNote + [
      [s.isEstimate ? "Estimated revenue" : "Gross revenue", s.revenue], ["User rewards", s.userRewards],
      [s.isEstimate ? "Estimated provider costs" : "Provider costs", s.providerCosts], ["Withdrawals", s.withdrawalsTotal],
      ["Estimated profit", s.profit],
    ].map(([l, v]) => `<div class="stat-card"><div class="l">${l}</div><div class="v mono">₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>`).join("");

    fillTable("by-provider", s.byProvider || [], (r) => `<td><strong>${esc(r.name)}</strong></td><td class="mono">₹${n(r.revenue)}</td><td class="mono">₹${n(r.userRewards)}</td><td class="mono">₹${n(r.providerCost)}</td><td class="mono">₹${n(r.profit)}</td>`, 5);
    fillTable("by-type", s.byType || [], (r) => `<td><strong>${esc(r.type)}</strong></td><td class="mono">₹${n(r.revenue)}</td><td class="mono">₹${n(r.userRewards)}</td><td class="mono">₹${n(r.profit)}</td>`, 4);
  } catch (e) {
    document.getElementById("rev-stats").innerHTML = `<div class="empty-state">Couldn't load revenue data. Confirm the Worker's /admin/stats endpoint is deployed.</div>`;
  }
}

function fillTable(id, rows, renderRow, cols) {
  const body = document.getElementById(id);
  if (!rows.length) { body.innerHTML = `<tr><td colspan="${cols}" class="empty-state">No data for this period.</td></tr>`; return; }
  body.innerHTML = rows.map((r) => `<tr>${renderRow(r)}</tr>`).join("");
}

function n(v) { return Number(v ?? 0).toFixed(2); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
