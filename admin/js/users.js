import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("users.html");
let active = "All";
let search = "";
let usersById = new Map();

document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
document.getElementById("search-input").addEventListener("input", (e) => { search = e.target.value; load(); });

load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const users = await AdminApi.listUsers({ status: active, q: search });
    usersById = new Map(users.map((u) => [String(u.id), u]));
    if (!users.length) { body.innerHTML = `<tr><td colspan="7" class="empty-state">No users match this filter.</td></tr>`; return; }
    body.innerHTML = users.map(row).join("");
    body.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onAction));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">Couldn't load users. Confirm the Worker's /admin/users endpoint is deployed.</td></tr>`;
  }
}

function row(u) {
  return `<tr>
    <td><strong>${esc(u.username || u.displayName || u.id.slice(0,8))}</strong><div style="color:var(--text-faint);font-size:.75rem">${u.id}</div></td>
    <td class="mono">₹${Number(u.balanceRupees ?? 0).toFixed(2)}</td>
    <td class="mono">₹${Number((u.totalEarnedCoins ?? 0) / 100).toFixed(2)}</td>
    <td class="mono">₹${Number(u.totalWithdrawn ?? 0).toFixed(2)}</td>
    <td>${u.referralCount ?? 0}</td>
    <td><span class="pill pill-risk-${(u.riskLevel || "low").toLowerCase()}">${u.riskLevel || "Low"}</span></td>
    <td class="actions-cell">
      <button class="btn" data-action="view" data-id="${u.id}">View</button>
      <button class="btn" data-action="${u.suspended ? "unsuspend" : "suspend"}" data-id="${u.id}">${u.suspended ? "Unsuspend" : "Suspend"}</button>
    </td>
  </tr>`;
}

async function onAction(e) {
  const { action, id } = e.currentTarget.dataset;
  if (action === "suspend" || action === "unsuspend") {
    const u = usersById.get(String(id));
    const label = u ? (u.username || u.displayName || u.id.slice(0, 8)) : id;
    const suspending = action === "suspend";
    const ok = await Modal.confirm({
      title: suspending ? "Suspend this user?" : "Unsuspend this user?",
      message: suspending
        ? "The user will lose access to earning, withdrawals, and login until unsuspended."
        : "The user will regain full access to their account.",
      rows: [{ label: "User", value: label }],
      confirmText: suspending ? "Suspend" : "Unsuspend",
      destructive: suspending,
      tone: suspending ? "warning" : "neutral",
    });
    if (!ok) return;
    try {
      await AdminApi.suspendUser(id, suspending);
      Toast.success(suspending ? "User suspended." : "User unsuspended.");
      load();
    } catch (err) {
      Modal.error({ title: "Action failed", message: friendlyMessage(err) });
    }
  }
  if (action === "view") window.location.href = `user-detail.html?id=${id}`;
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
