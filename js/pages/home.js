import { auth, watchUserProfile } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, fmtINR, fmtCoins } from "../nav.js";
import { Api } from "../services/api.js";
import "../components/ad-slot.js";

renderNav("home");
initTheme();

const balanceAmountEl = document.getElementById("balance-amount");
const balanceCoinsEl = document.getElementById("balance-coins");
const earnedTodayEl = document.getElementById("earned-today-pill");
const helloNameEl = document.getElementById("hello-name");
const avatarEl = document.getElementById("avatar-img");
const bonusDayEl = document.getElementById("bonus-day");
const bonusDotsEl = document.getElementById("bonus-dots");
const bonusAmountEl = document.getElementById("bonus-amount");
const bonusClaimBtn = document.getElementById("bonus-claim-btn");
const recoList = document.getElementById("recommended-list");
let dailyRewards = [];
let dailyScheduleFailed = false;
let serverClaimedToday = false;
let currentProfile = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not signed in — send to auth entry point.
    window.location.href = "index.html";
    return;
  }

  if (user.photoURL) avatarEl.src = user.photoURL;

  watchUserProfile(user.uid, (profile) => {
    if (!profile) {
      balanceAmountEl.textContent = fmtINR(0);
      balanceCoinsEl.textContent = "0 coins";
      return;
    }
    // Prefer the Firestore profile's name/photo — the Firebase Auth SDK's
    // user.displayName/photoURL are only auto-populated for providers like
    // Google, not for email/password sign-up.
    helloNameEl.textContent = `Hi, ${(profile.displayName || user.displayName)?.split(" ")[0] || "there"}`;
    if (!user.photoURL && profile.profilePhoto) avatarEl.src = profile.profilePhoto;

    balanceAmountEl.textContent = fmtINR(profile.balanceRupees ?? 0);
    balanceCoinsEl.textContent = `${fmtCoins(profile.coinBalance ?? 0)} coins`;
    earnedTodayEl.textContent = ``;  // earned-today is not stored; omit rather than show stale 0

    currentProfile = profile;
    if (!dailyRewards.length) loadDailySchedule();
    renderDailyBonus(profile);
  });

  loadRecommended();
});

function renderDailyBonus(profile) {
  // streak is 1-based from server (1=first day, 7=seventh, 0=never claimed)
  const streak = profile.dailyStreak ?? 0;
  const claimedToday = serverClaimedToday;
  // Show current day if claimed, or next day to claim
  const dayInCycle = claimedToday ? ((streak - 1) % 7) + 1 : (streak % 7) + 1;
  bonusDayEl.textContent = `Day ${dayInCycle} of 7`;
  bonusDotsEl.textContent = "● ".repeat(dayInCycle) + "○ ".repeat(7 - dayInCycle);

  if (claimedToday) {
    bonusClaimBtn.textContent = "Claimed ✓";
    bonusClaimBtn.classList.replace("btn-primary", "btn-secondary");
    bonusAmountEl.textContent = "Come back tomorrow";
  } else if (dailyRewards.length === 7) {
    bonusAmountEl.textContent = fmtINR(dailyRewards[(dayInCycle - 1) % 7]);
  } else if (dailyScheduleFailed) {
    // Don't leave this stuck on "Loading…" forever if the fetch failed —
    // give the person a way to try again instead of a dead-looking button.
    bonusAmountEl.innerHTML = `Couldn't load amount · <a href="#" id="bonus-retry-link" style="text-decoration:underline">Retry</a>`;
    const retryLink = document.getElementById("bonus-retry-link");
    if (retryLink) retryLink.addEventListener("click", (e) => { e.preventDefault(); loadDailySchedule(); });
  } else {
    bonusAmountEl.textContent = "Loading…";
  }
}

async function loadRecommended() {
  try {
    const tasks = (await Api.getTasks()).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0)).slice(0, 3);
    if (!tasks.length) {
      recoList.innerHTML = emptyState();
      return;
    }
    recoList.innerHTML = tasks.map(taskCard).join("");
  } catch (e) {
    console.error("[home] failed to load recommendations from the Worker API:", e);
    recoList.innerHTML = `<div class="empty-state"><p>Couldn't load recommendations.</p><button type="button" id="reco-retry-btn" class="btn-secondary" style="margin-top:8px">Retry</button></div>`;
    const retryBtn = document.getElementById("reco-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", loadRecommended);
  }
}

function taskCard(t) {
  return `<a href="pages/task-detail.html?id=${t.id}" class="reco-card">
    <div class="reco-icon">${t.iconUrl ? `<img src="${escapeHtml(t.iconUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : "🎯"}</div>
    <div class="reco-body">
      <div class="reco-title">${escapeHtml(t.title)}</div>
      <div class="reco-meta">${escapeHtml(t.provider || "")} · ~${t.estMinutes || "?"} min</div>
    </div>
    <div style="text-align:right">
      <div class="reco-reward mono">${"₹" + Number(t.rewardRupees ?? 0).toFixed(2)}</div>
      <div class="reco-cta">Start →</div>
    </div>
  </a>`;
}

async function loadDailySchedule() {
  try {
    const data = await Api.getDailyBonusSchedule();
    dailyRewards = Array.isArray(data?.amounts) ? data.amounts : [];
    dailyScheduleFailed = dailyRewards.length !== 7;
    serverClaimedToday = !!data?.claimedToday;
  } catch (e) {
    console.error("[home] failed to load the daily bonus schedule from the Worker API:", e);
    dailyRewards = [];
    dailyScheduleFailed = true;
  }
  if (currentProfile) renderDailyBonus(currentProfile);
}

function emptyState() {
  return `<div class="empty-state">
    <h3>No opportunities right now</h3>
    <p>Check back soon — new tasks are added regularly.</p>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
