import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("notifications.html");

load();

// Add a "New broadcast" control into the toolbar.
const toolbar = document.querySelector(".toolbar");
const composeBtn = document.createElement("button");
composeBtn.className = "btn btn-primary";
composeBtn.textContent = "+ New broadcast";
composeBtn.style.marginLeft = "8px";
toolbar.appendChild(composeBtn);

composeBtn.addEventListener("click", async () => {
  const draft = await Modal.form({
    title: "New broadcast",
    fields: [
      {
        id: "audience",
        label: "Send to",
        type: "select",
        options: [
          { value: "all", label: "All users" },
          { value: "active", label: "Active users" },
          { value: "suspended", label: "Suspended users" },
        ],
      },
      { id: "title", label: "Notification title", required: true, placeholder: "e.g. New tasks available" },
      { id: "body", label: "Notification body", type: "textarea", required: true, placeholder: "Message shown to users" },
    ],
    confirmText: "Review & send",
  });
  if (!draft) return;

  const confirmed = await Modal.confirm({
    title: "Send this broadcast?",
    message: "This cannot be undone once sent.",
    rows: [
      { label: "Audience", value: draft.audience },
      { label: "Title", value: draft.title },
    ],
    confirmText: "Send now",
    destructive: true,
    tone: "warning",
  });
  if (!confirmed) return;

  composeBtn.disabled = true;
  composeBtn.textContent = "Sending…";
  try {
    const { sentCount } = await AdminApi.sendNotification(draft.audience, draft.title, draft.body);
    Toast.success(`Sent to ${sentCount} user${sentCount === 1 ? "" : "s"}.`);
    load();
  } catch (err) {
    Modal.error({ title: "Broadcast failed", message: friendlyMessage(err) });
  } finally {
    composeBtn.disabled = false;
    composeBtn.textContent = "+ New broadcast";
  }
});

async function load() {
  const body = document.getElementById("table-body");
  try {
    const items = await AdminApi.listBroadcasts();
    if (!items.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty-state">No notifications sent yet. Use "+ New broadcast" above.</td></tr>`;
      return;
    }
    body.innerHTML = items.map((b) => `<tr>
      <td><strong>${esc(b.title)}</strong><div style="color:var(--text-faint);font-size:.75rem">${esc(b.body)}</div></td>
      <td>${esc(b.audience)} (${b.sentCount ?? 0})</td>
      <td><span class="pill">Sent</span></td>
      <td>${b.sentAt ? new Date(b.sentAt).toLocaleString() : ""}</td>
    </tr>`).join("");
  } catch (e) {
    body.innerHTML = `<tr><td colspan="4" class="empty-state">Couldn't load broadcast history.</td></tr>`;
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
