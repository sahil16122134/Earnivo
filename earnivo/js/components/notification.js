/** Ledger Light design: notification presentation stays compact, direct-recipient scoped, and read-state aware. */
import { api } from "../api.js";
import { formatDate, escapeHtml } from "../utils.js";

export async function showNotifications(anchor) {
  const popover = document.createElement("section");
  popover.className = "notification-panel";
  popover.innerHTML = "<p class='muted'>Loading notifications…</p>";
  anchor.after(popover);
  try {
    const { items = [] } = await api.get("/v1/notifications?limit=5");
    popover.innerHTML = items.length ? `<div class="notification-list">${items.map((item) => `<button type="button" class="notification-item ${item.unread === false ? "is-read" : "is-unread"}" data-notification-id="${escapeHtml(item.id)}"><span class="notification-category">${escapeHtml(item.category || "general")}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p><time>${formatDate(item.createdAt)}</time></button>`).join("")}</div>` : "<p class='muted'>You are all caught up.</p>";
    popover.querySelectorAll("[data-notification-id]").forEach((item) => item.addEventListener("click", async () => { if (item.classList.contains("is-read")) return; try { await api.post(`/v1/notifications/${encodeURIComponent(item.dataset.notificationId)}/read`, {}); item.classList.remove("is-unread"); item.classList.add("is-read"); anchor.querySelector("[data-unread-badge]")?.remove(); } catch (error) { item.insertAdjacentHTML("beforeend", `<span class="form-error">${escapeHtml(error.message)}</span>`); } }));
  } catch (error) {
    popover.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
  }
  const dismiss = (event) => { if (!popover.contains(event.target) && event.target !== anchor) { popover.remove(); document.removeEventListener("click", dismiss); } };
  window.setTimeout(() => document.addEventListener("click", dismiss), 0);
}
