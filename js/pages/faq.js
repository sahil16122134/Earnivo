import { renderNav, initTheme } from "../../js/nav.js";
import "../../js/components/ad-slot.js";

renderNav("profile", "../../");
initTheme();

const FAQS = [
  { cat: "Earnings", q: "How much can I earn?", a: "Earnings depend on which tasks, surveys, offers and ads are available to you and how many you complete. Estimated rewards are shown on each opportunity." },
  { cat: "Tasks", q: "Why hasn't my task been credited yet?", a: "Most rewards are credited automatically after the provider confirms completion. This can take a few minutes to a few hours depending on the provider." },
  { cat: "Surveys", q: "Why was my survey marked as not qualified?", a: "Survey providers sometimes screen out respondents partway through based on their own criteria. This is controlled by the provider, not Earnivo." },
  { cat: "Verification", q: "How does verification work?", a: "For most tasks, verification happens automatically through the provider. For tasks requiring proof, our team reviews your submission." },
  { cat: "Withdrawals", q: "How long do withdrawals take?", a: "Withdrawals are typically processed after verification. Processing times can vary by method and volume." },
  { cat: "Withdrawals", q: "What's the minimum withdrawal amount?", a: "The current minimum withdrawal is shown on the Withdraw page and may vary by payment method." },
  { cat: "Referrals", q: "When do I get my referral reward?", a: "Referral rewards are credited once your referred user completes the required qualifying activity." },
  { cat: "Account restrictions", q: "Why was my account suspended?", a: "Accounts may be suspended for suspected fraud, duplicate accounts, or violations of our Terms & Conditions. Contact support if you believe this was in error." },
  { cat: "Failed offers", q: "An offer failed to track — what do I do?", a: "Some offers can take time to track. If it doesn't appear after a reasonable period, contact support with the task details." },
];

const root = document.getElementById("faq-root");
root.innerHTML = FAQS.map(
  (f, i) => `<div class="faq-item" data-i="${i}">
    <div class="faq-q"><span>${escapeHtml(f.q)}</span><span class="chevron">⌄</span></div>
    <div class="faq-a">${escapeHtml(f.a)}</div>
  </div>`
).join("");

root.querySelectorAll(".faq-item").forEach((item) =>
  item.querySelector(".faq-q").addEventListener("click", () => item.classList.toggle("open"))
);

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
