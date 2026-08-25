import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("dashboard.html");

let range = "7d";
document.querySelectorAll("#range-chips .chip").forEach((c) =>
  c.addEventListener("click", () => {
    document.querySelectorAll("#range-chips .chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    range = c.dataset.r;
    load();
  })
);

load();

async function load() {
  try {
    const s = await AdminApi.stats(range);
    renderStats(s);
    renderSources(s.earningSources || []);
    renderActivity(s.recentActivity || []);
  } catch (e) {
    document.getElementById("activity-body").innerHTML =
      `<tr><td colspan="4" class="empty-state">Couldn't load dashboard data. Confirm the Worker's /admin/stats endpoint is deployed.</td></tr>`;
  }
}

function renderStats(s) {
  const est = s.isEstimate ? " (est.)" : "";
  const cards = [
    ["Total users", fmtInt(s.totalUsers)],
    ["Active today", fmtInt(s.activeToday)],
    [`Revenue${est} (${range})`, fmtINR(s.revenue)],
    [`User rewards (${range})`, fmtINR(s.userRewards)],
    ["Pending withdrawals", fmtInt(s.pendingWithdrawals)],
    [`Profit${est} (${range})`, fmtINR(s.profit)],
  ];
  document.getElementById("stat-grid").innerHTML = cards
    .map(([l, v]) => `<div class="stat-card"><div class="l">${l}</div><div class="v mono">${v}</div></div>`)
    .join("");
}

function renderSources(sources) {
  const el = document.getElementById("source-breakdown");
  if (!sources.length) { el.innerHTML = `<p style="color:var(--text-faint);font-size:.85rem">No data for this period.</p>`; return; }
  const max = Math.max(...sources.map((s) => s.amountRupees), 1);
  el.innerHTML = sources
    .map(
      (s) => `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px"><span>${s.label}</span><span class="mono">${fmtINR(s.amountRupees)}</span></div>
      <div style="background:var(--surface-2);border-radius:8px;height:8px"><div style="width:${(s.amountRupees / max) * 100}%;background:var(--accent-amber);height:8px;border-radius:8px"></div></div>
    </div>`
    )
    .join("");
}

function renderActivity(items) {
  const body = document.getElementById("activity-body");
  if (!items.length) { body.innerHTML = `<tr><td colspan="4" class="empty-state">No recent activity.</td></tr>`; return; }
  body.innerHTML = items
    .map((i) => `<tr><td>${esc(i.event)}</td><td>${esc(i.actor)}</td><td>${esc(i.detail)}</td><td class="mono">${new Date(i.timestamp).toLocaleString()}</td></tr>`)
    .join("");
}

function fmtInt(n) { return Number(n ?? 0).toLocaleString("en-IN"); }
function fmtINR(n) { return "₹" + Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
