import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("withdrawals.html");
let active = "All";
let itemsById = new Map();

document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);

load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const items = await AdminApi.listWithdrawals({ status: active });
    itemsById = new Map(items.map((w) => [String(w.id), w]));
    if (!items.length) { body.innerHTML = `<tr><td colspan="7" class="empty-state">No withdrawals match this filter.</td></tr>`; return; }
    body.innerHTML = items.map(row).join("");
    body.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onAction));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">Couldn't load withdrawals. Confirm the Worker's /admin/withdrawals endpoint is deployed.</td></tr>`;
  }
}

function row(w) {
  return `<tr>
    <td>${esc(w.username || w.userId)}</td>
    <td class="mono">₹${Number(w.amountRupees ?? 0).toFixed(2)}</td>
    <td>${esc(w.method)}</td>
    <td class="mono">${esc(w.requestId)}</td>
    <td class="mono">${w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "—"}</td>
    <td><span class="pill ${statusClass(w.status)}">${w.status}</span></td>
    <td class="actions-cell">
      ${w.status === "pending" ? `<button class="btn btn-primary" data-action="approve" data-id="${w.id}">Approve</button><button class="btn btn-danger" data-action="reject" data-id="${w.id}">Reject</button>` : ""}
      ${w.status === "processing" ? `<button class="btn btn-primary" data-action="paid" data-id="${w.id}">Mark Paid</button>` : ""}
    </td>
  </tr>`;
}

function statusClass(s) { return s === "paid" ? "pill-success" : s === "rejected" ? "pill-fail" : "pill-pending"; }

async function onAction(e) {
  const { action, id } = e.currentTarget.dataset;
  const w = itemsById.get(String(id));
  const amountLabel = w ? `₹${Number(w.amountRupees ?? 0).toFixed(2)}` : "";
  const userLabel = w ? (w.username || w.userId) : id;

  try {
    if (action === "approve") {
      const ok = await Modal.confirm({
        title: "Approve this withdrawal?",
        message: "This will move the request to processing.",
        rows: [
          { label: "User", value: userLabel },
          { label: "Amount", value: amountLabel, total: true },
          { label: "Method", value: w?.method || "—" },
        ],
        confirmText: "Approve",
        tone: "neutral",
      });
      if (!ok) return;
      await AdminApi.approveWithdrawal(id);
      Toast.success("Withdrawal approved.");
    }

    if (action === "paid") {
      const ok = await Modal.confirm({
        title: "Mark as paid?",
        message: "Confirm the payout has actually been sent before marking this paid.",
        rows: [
          { label: "User", value: userLabel },
          { label: "Amount", value: amountLabel, total: true },
        ],
        confirmText: "Mark Paid",
        tone: "neutral",
      });
      if (!ok) return;
      await AdminApi.markWithdrawalPaid(id);
      Toast.success("Withdrawal marked as paid.");
    }

    if (action === "reject") {
      const result = await Modal.form({
        title: "Reject this withdrawal?",
        message: "The user's balance will be reversed. This cannot be undone.",
        fields: [{ id: "reason", label: "Reason for rejection", type: "textarea", required: true, placeholder: "Shown to the user" }],
        confirmText: "Reject withdrawal",
        cancelText: "Cancel",
        destructive: true,
        tone: "warning",
      });
      if (!result) return;
      await AdminApi.rejectWithdrawal(id, result.reason);
      Toast.info("Withdrawal rejected and balance reversed.");
    }

    load();
  } catch (err) {
    Modal.error({ title: "Action failed", message: friendlyMessage(err) });
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
