import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("ongoing.html");
let active = "All";
document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const items = await AdminApi.listSubmissions({ status: active, kind: "ongoing" });
    if (!items.length) { body.innerHTML = `<tr><td colspan="6" class="empty-state">Nothing in progress right now.</td></tr>`; return; }
    body.innerHTML = items.map(row).join("");
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Couldn't load ongoing tasks.</td></tr>`;
  }
}

function row(s) {
  return `<tr>
    <td>${esc(s.username || s.userId)}</td>
    <td>${esc(s.taskTitle)}</td>
    <td>${esc(s.provider || "")}</td>
    <td class="mono">${s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}</td>
    <td><span class="pill pill-pending">${s.status}</span></td>
    <td class="mono">₹${Number(s.rewardRupees ?? 0).toFixed(2)}</td>
  </tr>`;
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
