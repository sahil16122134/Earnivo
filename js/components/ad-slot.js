// Reusable banner-ad container. Drop <ad-slot placement="home-below-hero">
// anywhere a banner is appropriate (see UI audit for approved placements —
// never beside Withdraw/Start Task/Submit/Claim Bonus/nav/security controls).
//
// Behavior:
//  - No provider configured -> renders nothing, takes up no space.
//  - Provider configured -> reserves stable height (no layout shift) and
//    delegates to ads-config.renderInto().
//  - ?devads=1 -> shows a clearly-labeled placeholder box, dev-only, so
//    spacing/layout can be reviewed before a provider is wired up.
import { AD_PROVIDER_ENABLED, isDevAdsPreview, renderInto } from "../ads-config.js";

class AdSlot extends HTMLElement {
  connectedCallback() {
    const placement = this.getAttribute("placement") || "unknown";
    this.setAttribute("role", "complementary");
    this.setAttribute("aria-label", "Advertisement");

    if (AD_PROVIDER_ENABLED) {
      this.classList.add("ad-slot", "ad-banner");
      this.innerHTML = `<span class="ad-slot-label">Advertisement</span><div class="ad-slot-body"></div>`;
      renderInto(this.querySelector(".ad-slot-body"), placement);
      return;
    }

    if (isDevAdsPreview()) {
      this.classList.add("ad-slot", "ad-banner", "ad-slot-dev");
      this.innerHTML = `<span class="ad-slot-label">Advertisement</span><span class="ad-slot-dev-note">No provider configured · ${placement}</span>`;
      return;
    }

    // No provider, not previewing dev layout: stay empty and out of the
    // way rather than showing a fake/blank ad box.
    this.style.display = "none";
  }
}

if (!customElements.get("ad-slot")) {
  customElements.define("ad-slot", AdSlot);
}
