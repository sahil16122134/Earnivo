/** Ledger Light design: profile settings are reviewable, and unavailable country configuration is stated clearly instead of appearing as a broken empty field. */
import { requireUser } from "../auth.js";
import { api } from "../api.js";
import { $, escapeHtml, setLoading } from "../utils.js";
import { mountNavbar } from "../components/navbar.js";
import { toast } from "../components/toast.js";

const root = $("#profile-root");

async function init() {
  try {
    const user = await requireUser(); if (!user) return;
    await mountNavbar("profile");
    const profile = await api.get("/v1/profile"); const countries = profile.supportedCountries || [];
    const countryField = profile.requiresCountryConfiguration ? `<input type="hidden" name="country" value="${escapeHtml(profile.country || "")}"/><div class="configuration-callout"><strong>Country options are not configured yet.</strong><p>An administrator must add supported countries in the platform settings before country-based task eligibility can be applied.</p></div>` : `<label>Country<select name="country" required><option value="">Select country</option>${countries.map((country) => `<option value="${escapeHtml(country.code)}" ${profile.country === country.code ? "selected" : ""}>${escapeHtml(country.name)}</option>`).join("")}</select></label>`;
    root.className = "";
    root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">Account settings</p><h1>Keep your details current.</h1><p>Eligibility and payment checks may rely on the information you provide.</p></div></section><section class="profile-layout"><form id="profile-form" class="profile-form" novalidate><label>Display name<input name="displayName" maxlength="70" value="${escapeHtml(profile.displayName || "")}" placeholder="How Earnivo should address you" /></label><label>Email address<input value="${escapeHtml(user.email || "")}" disabled /></label>${countryField}<label>Preferred device<select name="preferredDevice"><option value="mobile" ${profile.preferredDevice === "mobile" ? "selected" : ""}>Mobile</option><option value="desktop" ${profile.preferredDevice === "desktop" ? "selected" : ""}>Desktop</option><option value="tablet" ${profile.preferredDevice === "tablet" ? "selected" : ""}>Tablet</option><option value="both" ${profile.preferredDevice === "both" ? "selected" : ""}>Any device</option></select></label><p class="form-error" hidden></p><button class="button button--primary" type="submit">Save account details <span>→</span></button></form><aside class="profile-note"><h2>Privacy is a product rule.</h2><p>Earnivo records only information needed for account access, eligibility, fraud prevention, and payments. Do not upload identity or financial documents through this page.</p></aside></section>`;
    $("#profile-form", root).addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const errorNode = $(".form-error", form); const button = $("button", form); errorNode.hidden = true; if (!form.reportValidity()) return; try { setLoading(button, true, "Saving…"); await api.patch("/v1/profile", Object.fromEntries(new FormData(form))); toast("Account details saved.", "success"); } catch (error) { errorNode.textContent = error.message; errorNode.hidden = false; } finally { setLoading(button, false); } });
  } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>Account settings could not be opened.</h2><p>${escapeHtml(error.message)}</p>`; }
}
init();
