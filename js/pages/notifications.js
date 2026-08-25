import { auth, watchUserNotifications } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, timeAgo } from "../nav.js";

renderNav("home", "../");
initTheme();

const listEl = document.getElementById("notif-list");
const iconMap = { reward: "💰", withdrawal: "💸", system: "📣" };

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "../index.html"; return; }
  watchUserNotifications(user.uid, render, 50);
});

function render(items) {
  if (!items || items.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><h3>No notifications</h3><p>You're all caught up.</p></div>`;
    return;
  }
  listEl.innerHTML = items.map((n) => `
    <div class="txn-row" style="padding:14px 16px">
      <div class="txn-left">
        <div class="txn-icon">${iconMap[n.category] || "🔔"}</div>
        <div>
          <div class="txn-title">${escapeHtml(n.title)} ${n.read ? "" : "●"}</div>
          <div class="txn-sub">${escapeHtml(n.body)}</div>
          <div class="txn-sub">${timeAgo(n.createdAt)}</div>
        </div>
      </div>
    </div>`).join("");
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
