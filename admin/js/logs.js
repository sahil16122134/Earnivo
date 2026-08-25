import { renderAdminNav } from "./admin-nav.js";
import { auth } from "../../js/services/firebase.js";
import { WORKER_BASE_URL } from "../../js/config.js";

renderAdminNav("logs.html");

let active = "All";
document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const res = await fetch(`${WORKER_BASE_URL}/admin/logs?type=${active}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const json = await res.json();
    const items = json.data || [];
    if (!items.length) { body.innerHTML = `<tr><td colspan="4" class="empty-state">No log entries yet.</td></tr>`; return; }
    body.innerHTML = items.map(
      (l) => `<tr><td>${esc(l.admin)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td><td class="mono">${new Date(l.timestamp).toLocaleString()}</td></tr>`
    ).join("");
  } catch (e) {
    body.innerHTML = `<tr><td colspan="4" class="empty-state">Couldn't load logs. Admin logs are append-only and written by the Worker on every privileged action.</td></tr>`;
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
