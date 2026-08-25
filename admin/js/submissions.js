import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("submissions.html");
let active = "All";
let subsById = new Map();

document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);

load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const subs = await AdminApi.listSubmissions({ status: active });
    subsById = new Map(subs.map((s) => [String(s.id), s]));
    if (!subs.length) { body.innerHTML = `<tr><td colspan="6" class="empty-state">No submissions match this filter.</td></tr>`; return; }
    body.innerHTML = subs.map(row).join("");
    body.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onAction));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Couldn't load submissions. Confirm the Worker's /admin/submissions endpoint is deployed.</td></tr>`;
  }
}

function row(s) {
  return `<tr>
    <td>${esc(s.username || s.userId)}</td>
    <td>${esc(s.taskTitle)}</td>
    <td class="mono">${s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}</td>
    <td class="mono">₹${Number(s.rewardRupees ?? 0).toFixed(2)}</td>
    <td><span class="pill ${statusClass(s.status)}">${s.status}</span></td>
    <td class="actions-cell">
      <button class="btn btn-primary" data-action="approve" data-id="${s.id}">Approve</button>
      <button class="btn btn-danger" data-action="reject" data-id="${s.id}">Reject</button>
    </td>
  </tr>`;
}

function statusClass(s) { return s === "completed" ? "pill-success" : s === "failed" ? "pill-fail" : "pill-pending"; }

async function onAction(e) {
  const { action, id } = e.currentTarget.dataset;
  const s = subsById.get(String(id));
  try {
    if (action === "approve") {
      const ok = await Modal.confirm({
        title: "Approve this submission?",
        message: "The reward will be credited to the user's balance immediately.",
        rows: [
          { label: "User", value: s?.username || s?.userId || "—" },
          { label: "Task", value: s?.taskTitle || "—" },
          { label: "Reward", value: `₹${Number(s?.rewardRupees ?? 0).toFixed(2)}`, total: true },
        ],
        confirmText: "Approve & credit",
      });
      if (!ok) return;
      await AdminApi.approveSubmission(id);
      Toast.success("Submission approved and reward credited.");
    } else {
      const result = await Modal.form({
        title: "Reject this submission?",
        rows: [
          { label: "User", value: s?.username || s?.userId || "—" },
          { label: "Task", value: s?.taskTitle || "—" },
        ],
        fields: [{ id: "reason", label: "Reason for rejection", type: "textarea", required: true, placeholder: "Shown to the user" }],
        confirmText: "Reject submission",
        destructive: true,
        tone: "warning",
      });
      if (!result) return;
      await AdminApi.rejectSubmission(id, result.reason);
      Toast.info("Submission rejected.");
    }
    load();
  } catch (err) {
    Modal.error({ title: "Action failed", message: friendlyMessage(err) });
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
