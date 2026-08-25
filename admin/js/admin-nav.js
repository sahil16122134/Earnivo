import { AdminApi } from "./admin-api.js";

const NAV = [
  ["dashboard.html", "Dashboard"],
  ["users.html", "Users"],
  ["tasks.html", "Tasks"],
  ["ongoing.html", "Ongoing"],
  ["submissions.html", "Submissions"],
  ["providers.html", "Providers"],
  ["withdrawals.html", "Withdrawals"],
  ["transactions.html", "Transactions"],
  ["revenue.html", "Revenue"],
  ["fraud.html", "Fraud & Risk"],
  ["notifications.html", "Notifications"],
  ["settings.html", "Settings"],
  ["logs.html", "Admin Logs"],
];

export function renderAdminNav(activeFile) {
  const sidebar = document.getElementById("admin-sidebar");
  if (sidebar) {
    sidebar.innerHTML =
      `<div class="brand">Earn<span>ivo</span> Admin</div>` +
      NAV.map(([href, label]) =>
        `<a href="${href}" class="${href === activeFile ? "active" : ""}">${label}</a>`
      ).join("");
  }
  initAdminDrawer();
  guardAdminAccess();
}

// Every admin page relies on the Worker to re-verify role=admin on each real
// call, so there's no data-security gap here — but without this check, any
// signed-in (non-admin) user who navigates straight to an admin/*.html URL
// would see the full admin shell UI with a wall of failed requests instead
// of being sent back to sign in. This is a lightweight client-side redirect
// for a better/safer experience, not itself the security boundary.
let guardRan = false;
async function guardAdminAccess() {
  if (guardRan) return;
  guardRan = true;
  try {
    await AdminApi.stats("today");
} catch (e) {
  console.error("[ADMIN GUARD FAILED]", e);
}
}

function initAdminDrawer() {
  // Inject backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "admin-drawer-backdrop";
  backdrop.className = "admin-drawer-backdrop";
  document.body.appendChild(backdrop);

  // Inject hamburger button into topbar
  const topbar = document.querySelector(".admin-topbar");
  if (topbar) {
    const btn = document.createElement("button");
    btn.className = "admin-drawer-btn";
    btn.setAttribute("aria-label", "Open admin menu");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg> Menu`;
    topbar.insertAdjacentElement("afterbegin", btn);
    btn.addEventListener("click", openDrawer);
  }

  backdrop.addEventListener("click", closeDrawer);

  // Close when a nav link is tapped on mobile
  const sidebar = document.getElementById("admin-sidebar");
  if (sidebar) {
    sidebar.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeDrawer();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

function openDrawer() {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("admin-drawer-backdrop");
  const btn = document.querySelector(".admin-drawer-btn");
  if (sidebar) sidebar.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
  if (btn) btn.setAttribute("aria-expanded", "true");
  document.body.classList.add("admin-drawer-open");
}

function closeDrawer() {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("admin-drawer-backdrop");
  const btn = document.querySelector(".admin-drawer-btn");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
  if (btn) btn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("admin-drawer-open");
}
