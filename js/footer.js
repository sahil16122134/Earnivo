import { initFooterAccordion } from "./nav.js";

const COLS = [
  { title: "Platform", links: [["About", "pages/about.html"], ["How It Works", "pages/how-it-works.html"], ["Earn", "earn.html"], ["Refer & Earn", "pages/referral.html"], ["Rewards", "earn.html"]] },
  { title: "Support", links: [["FAQ", "pages/support/faq.html"], ["Help Center", "pages/support/help.html"], ["Contact Us", "pages/support/contact.html"], ["Report a Problem", "pages/support/contact.html"]] },
  { title: "Legal", links: [["Privacy Policy", "pages/legal/privacy.html"], ["Terms & Conditions", "pages/legal/terms.html"], ["Refund / Cancellation Policy", "pages/legal/refund.html"], ["Disclaimer", "pages/legal/disclaimer.html"], ["Cookie Policy", "pages/legal/cookies.html"]] },
  { title: "Company", links: [["Responsible Rewards", "pages/legal/disclaimer.html"], ["Security", "pages/about.html"], ["Community Guidelines", "pages/legal/terms.html"]] },
];

const CHEVRON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

export function renderFooter(basePath = "") {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  mount.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-tabs">
        ${COLS.map((c, i) => `<button type="button" class="footer-tab" data-idx="${i}">${c.title} ${CHEVRON}</button>`).join("")}
      </div>
      <div class="footer-panel-wrap">
        ${COLS.map(
          (c, i) => `<div class="footer-panel" data-idx="${i}">
            ${c.links.map(([label, href]) => `<a href="${basePath}${href}">${label}</a>`).join("")}
          </div>`
        ).join("")}
      </div>
    </div>
    <div class="footer-bottom">
      © 2026 Earnivo. All rights reserved.<br>
      Availability of tasks, surveys and offers varies by region and eligibility.<br>
      Support: <a href="mailto:blacknoar500@gmail.com">blacknoar500@gmail.com</a>
    </div>`;
  initFooterAccordion();
  initFooterScrollReveal(mount);
}

// Fixed footer sits just above the bottom nav and slides into view only while
// the user is scrolling up; scrolling down (or sitting at the very top) hides
// it again so it never permanently blocks page content on mobile.
function initFooterScrollReveal(mount) {
  const bottomNav = document.getElementById("bottom-nav");
  const syncNavHeight = () => {
    const h = bottomNav && bottomNav.offsetHeight ? bottomNav.offsetHeight : 64;
    document.documentElement.style.setProperty("--bottom-nav-h", `${h}px`);
  };
  syncNavHeight();
  window.addEventListener("resize", syncNavHeight);

  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    if (window.innerWidth >= 760) {
      mount.classList.remove("footer-visible");
      lastY = y;
      ticking = false;
      return;
    }
    const scrollingUp = y < lastY - 4;
    const scrollingDown = y > lastY + 4;
    if (scrollingUp && y > 40) {
      mount.classList.add("footer-visible");
    } else if (scrollingDown || y <= 40) {
      mount.classList.remove("footer-visible");
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}
