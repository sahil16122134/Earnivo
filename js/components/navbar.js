/** Ledger Light design: navigation is a stable, thumb-friendly context rail rather than a generic header. */
import { signOutUser, waitForAuth } from "../auth.js";
import { api } from "../api.js";
import { showNotifications } from "./notification.js";
import { escapeHtml } from "../utils.js";
import { enableMemberNavigation } from "../navigation.js";

const navItems = [
  ["home", "Overview", "/pages/home.html", "⌂"],
  ["tasks", "Find tasks", "/pages/tasks.html", "▦"],
  ["wallet", "Wallet", "/pages/wallet.html", "◒"],
  ["referral", "Refer", "/pages/referral.html", "↗"],
  ["profile", "Profile", "/pages/profile.html", "◌"]
];
let unreadCache = { count: null, expiresAt: 0, pending: null };
async function unreadCount() { if (unreadCache.count !== null && Date.now() < unreadCache.expiresAt) return unreadCache.count; if (!unreadCache.pending) unreadCache.pending = api.get("/v1/notifications?limit=1").then(({ unreadCount = 0 }) => { unreadCache = { count: unreadCount, expiresAt: Date.now() + 30000, pending: null }; return unreadCount; }).catch((error) => { unreadCache.pending = null; throw error; }); return unreadCache.pending; }

export async function mountNavbar(activeKey) {
  const target = document.querySelector("[data-navbar]");
  if (!target) return;
  enableMemberNavigation();
  let user = null;
  try { user = await waitForAuth(); } catch { /* Configuration guard appears in page content. */ }
  const initial = user?.displayName?.[0] || user?.email?.[0] || "E";
  target.innerHTML = `<header class="app-bar"><a class="brand" href="/pages/home.html"><img src="/assets/logo.svg" alt=""/><span>Earnivo</span></a><nav aria-label="Primary">${navItems.map(([key, label, href, icon]) => `<a class="nav-link ${activeKey === key ? "is-active" : ""}" href="${href}" aria-current="${activeKey === key ? "page" : "false"}"><span aria-hidden="true">${icon}</span>${label}</a>`).join("")}</nav><div class="app-bar__actions"><button class="icon-button notification-trigger" type="button" data-notifications aria-label="Notifications">◉<span class="notification-badge" data-unread-badge hidden></span></button><button class="user-pill" type="button" data-user-menu><span>${escapeHtml(initial.toUpperCase())}</span><b>Account</b></button></div></header><div class="mobile-nav">${navItems.slice(0, 4).map(([key, label, href, icon]) => `<a class="${activeKey === key ? "is-active" : ""}" href="${href}"><span>${icon}</span>${label}</a>`).join("")}</div>`;
  target.querySelector("[data-notifications]").addEventListener("click", (event) => showNotifications(event.currentTarget));
  unreadCount().then((count) => { const badge = target.querySelector("[data-unread-badge]"); if (badge && count > 0) { badge.hidden = false; badge.textContent = count > 9 ? "9+" : String(count); } }).catch(() => {});
  target.querySelector("[data-user-menu]").addEventListener("click", () => {
    const menu = document.createElement("div");
    menu.className = "account-menu";
    menu.innerHTML = `<a href="/pages/profile.html">Profile settings</a><a href="/admin/index.html">Admin workspace</a><button type="button">Sign out</button>`;
    target.querySelector(".app-bar__actions").append(menu);
    menu.querySelector("button").addEventListener("click", signOutUser);
    window.setTimeout(() => document.addEventListener("click", (event) => { if (!menu.contains(event.target)) menu.remove(); }, { once: true }), 0);
  });
}
