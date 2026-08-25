import { auth, db, watchUserProfile } from "../services/firebase.js";
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, fmtINR, timeAgo } from "../nav.js";
import { WORKER_BASE_URL } from "../config.js";
import "../components/ad-slot.js";

renderNav("home", "../");
initTheme();

let referrals = [];
let activeFilter = "all";
let backfillAttempted = false;
const listEl = document.getElementById("ref-list");

document.querySelectorAll(".chip").forEach((c) =>
  c.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    activeFilter = c.dataset.c;
    render();
  })
);

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "../index.html"; return; }

  watchUserProfile(user.uid, (profile) => {
    if (!profile) return;
    document.getElementById("ref-code").textContent = profile.referralCode || "—";
    // Every user is meant to have a referral code. If an older account is
    // missing one, ask the Worker to heal it (it backfills on ensure-user)
    // instead of leaving "—" on screen until the user next logs out/in.
    if (!profile.referralCode && !backfillAttempted) {
      backfillAttempted = true;
      backfillReferralCode(user);
    }
  });

  const q = query(collection(db, "referrals"), where("referrerId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    referrals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("stat-total").textContent = referrals.length;
    const qualified = referrals.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
    document.getElementById("stat-qualified").textContent = qualified;
    const earned = referrals.filter((r) => r.status === "rewarded").reduce((s, r) => s + (r.rewardRupees || 0), 0);
    document.getElementById("stat-earned").textContent = fmtINR(earned);
    render();
  }, () => { listEl.innerHTML = `<p class="hint">Couldn't load referrals.</p>`; });
});

function render() {
  const filtered = activeFilter === "all" ? referrals : referrals.filter((r) => r.status === activeFilter);
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><h3>No referrals yet</h3><p>Share your code to start earning.</p></div>`;
    return;
  }
  listEl.innerHTML = filtered.map((r) => `
    <div class="txn-row">
      <div class="txn-left">
        <div class="txn-icon">👤</div>
        <div><div class="txn-title">${escapeHtml(r.referredName || "New user")}</div><div class="txn-sub">${timeAgo(r.createdAt)}</div></div>
      </div>
      <span class="pill ${r.status === "rewarded" ? "pill-success" : r.status === "pending" ? "pill-pending" : "pill-success"}">${r.status}</span>
    </div>`).join("");
}

document.getElementById("copy-btn").addEventListener("click", async () => {
  const code = document.getElementById("ref-code").textContent;
  try { await navigator.clipboard.writeText(code); flash("copy-btn", "Copied ✓"); } catch {}
});

document.getElementById("share-btn").addEventListener("click", async () => {
  const code = document.getElementById("ref-code").textContent;
  const link = new URL(`../index.html?ref=${encodeURIComponent(code)}`, location.href).href;
  const text = `Join Earnivo and start earning — use my code ${code}\n${link}`;
  if (navigator.share) { try { await navigator.share({ text, url: link }); } catch {} }
  else { await navigator.clipboard.writeText(text); flash("share-btn", "Copied ✓"); }
});

function flash(id, label) {
  const btn = document.getElementById(id);
  const orig = btn.textContent;
  btn.textContent = label;
  setTimeout(() => (btn.textContent = orig), 1500);
}

async function backfillReferralCode(user) {
  try {
    const idToken = await user.getIdToken();
    await fetch(`${WORKER_BASE_URL}/auth/ensure-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    });
    // No need to read the response — the Firestore onSnapshot listener above
    // will pick up the newly-written referralCode automatically.
  } catch (e) {
    console.error("[referral] couldn't backfill a missing referral code:", e);
  }
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
