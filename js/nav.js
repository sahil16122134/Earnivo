import { Icon } from "./icons.js";

const NAV_ITEMS = [
  { href: "home.html", label: "Home", icon: Icon.home, key: "home" },
  { href: "earn.html", label: "Earn", icon: Icon.earn, key: "earn" },
  { href: "ongoing.html", label: "Ongoing", icon: Icon.ongoing, key: "ongoing" },
  { href: "wallet.html", label: "Wallet", icon: Icon.wallet, key: "wallet" },
  { href: "profile.html", label: "Profile", icon: Icon.profile, key: "profile" },
];

export function renderNav(activeKey, basePath = "") {
  // Inject brand into mobile topbar so logo is visible on mobile
  const topbar = document.querySelector(".topbar");
  if (topbar && !topbar.querySelector(".topbar-brand")) {
    const brand = document.createElement("div");
    brand.className = "topbar-brand";
    brand.innerHTML = `Earn<span>ivo</span>`;
    topbar.insertAdjacentElement("afterbegin", brand);
  }

  const bottom = document.getElementById("bottom-nav");
  if (bottom) {
    bottom.innerHTML = NAV_ITEMS.map(
      (i) => `<a href="${basePath}${i.href}" class="${i.key === activeKey ? "active" : ""}">${i.icon}<span>${i.label}</span></a>`
    ).join("");
  }
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML =
      `<div class="brand">Earn<span>ivo</span></div>` +
      NAV_ITEMS.map(
        (i) => `<a href="${basePath}${i.href}" class="${i.key === activeKey ? "active" : ""}">${i.icon}<span>${i.label}</span></a>`
      ).join("");
  }
}

export function initTheme() {
  const saved = localStorage.getItem("earnivo-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("earnivo-theme", next);
    });
  });
}

export function initFooterAccordion() {
  document.querySelectorAll(".footer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (window.innerWidth > 759) return; // desktop always shows every panel
      const idx = tab.dataset.idx;
      const panel = document.querySelector(`.footer-panel[data-idx="${idx}"]`);
      const isOpen = tab.classList.contains("active");

      // Single-open accordion: close every tab/panel first, then reopen the
      // one that was tapped (unless it was already open, which just closes it).
      document.querySelectorAll(".footer-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".footer-panel").forEach((p) => p.classList.remove("open"));

      if (!isOpen) {
        tab.classList.add("active");
        if (panel) panel.classList.add("open");
      }
    });
  });
}

export const fmtINR = (n) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtCoins = (n) => Number(n ?? 0).toLocaleString("en-IN");

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
