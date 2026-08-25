import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("fraud.html");
let active = "All";
let flagsById = new Map();
document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const items = await AdminApi.listFraudFlags({ risk: active });
    flagsById = new Map(items.map((f) => [String(f.id), f]));
    if (!items.length) { body.innerHTML = `<tr><td colspan="5" class="empty-state">No flagged activity right now.</td></tr>`; return; }
    body.innerHTML = items.map(row).join("");
    body.querySelectorAll("[data-action]").forEach((b) => b.addEventListener("click", onAction));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5" class="empty-state">Couldn't load fraud signals. Confirm the Worker's /admin/fraud endpoint is deployed.</td></tr>`;
  }
}

function row(f) {
  return `<tr>
    <td>${esc(f.username || f.userId)}</td>
    <td>${esc(f.signal)}</td>
    <td><span class="pill pill-risk-${(f.riskLevel || "low").toLowerCase()}">${f.riskLevel || "Low"}</span></td>
    <td class="mono">${f.detectedAt ? new Date(f.detectedAt).toLocaleString() : "—"}</td>
    <td class="actions-cell">
      <button class="btn" data-action="review" data-id="${f.id}" data-user="${f.userId}">Review</button>
      <button class="btn btn-danger" data-action="suspend" data-id="${f.id}">Suspend</button>
      <button class="btn" data-action="clear" data-id="${f.id}">Clear flag</button>
    </td>
  </tr>`;
}

const ACTION_LABEL = { suspend: "Suspend the user for this flag", clear: "Clear this fraud flag" };

async function onAction(e) {
  const { action, id, user } = e.currentTarget.dataset;
  if (action === "review") { window.location.href = `user-detail.html?id=${user}`; return; }

  const f = flagsById.get(String(id));
  const ok = await Modal.confirm({
    title: `${ACTION_LABEL[action] || action}?`,
    rows: [
      { label: "User", value: f?.username || f?.userId || user || "—" },
      { label: "Signal", value: f?.signal || "—" },
    ],
    confirmText: action === "suspend" ? "Suspend" : "Clear flag",
    cancelText: "Cancel",
    destructive: action === "suspend",
    tone: action === "suspend" ? "warning" : "neutral",
  });
  if (!ok) return;
  try {
    await AdminApi.resolveFraudFlag(id, action);
    Toast.success(action === "suspend" ? "User suspended." : "Flag cleared.");
    load();
  } catch (err) {
    Modal.error({ title: "Action failed", message: friendlyMessage(err) });
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
