// Central banner-ad configuration.
//
// Earnivo has no banner-ad provider wired up yet. Leave AD_PROVIDER_ENABLED
// false until one is integrated — <ad-slot> elements render nothing (not a
// fake ad, not a placeholder) whenever it's false, so the layout stays
// exactly as if the slot weren't there.
//
// When you do add a provider, set AD_PROVIDER_ENABLED to true and fill in
// renderInto() below with that provider's SDK/embed call. Do NOT flip this
// on without a real provider — see js/components/ad-slot.js.
export const AD_PROVIDER_ENABLED = false;

// Shown only as a labeled dev-mode placeholder (never in production, never
// as a stand-in for a real ad) so layout/spacing can be checked locally.
// Toggle with ?devads=1 in the URL.
export function isDevAdsPreview() {
  try {
    return new URLSearchParams(window.location.search).get("devads") === "1";
  } catch {
    return false;
  }
}

// Hook point for the real provider once one is chosen. Receives the slot
// element and the `placement` string (e.g. "home-below-hero").
export function renderInto(/* slotEl, placement */) {
  // e.g. window.SomeAdSdk.render(slotEl, { placement, ... })
}
