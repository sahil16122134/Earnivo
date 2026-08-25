import { auth, watchUserProfile } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, fmtINR } from "../nav.js";
import { Api, ApiError } from "../services/api.js";
import { Modal, friendlyMessage } from "../components/modal.js";
import "../components/ad-slot.js";

renderNav("home", "../");
initTheme();

let rewards = [];
let scheduleLoaded = false;
let scheduleFailed = false;
let serverClaimedToday = false;
const gridEl = document.getElementById("bonus-grid");
const claimBtn = document.getElementById("claim-btn");
let currentProfile = null;

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "../index.html"; return; }
  watchUserProfile(user.uid, (profile) => {
    currentProfile = profile;
    if (!scheduleLoaded) loadSchedule();
    render(profile);
  });
});

function render(profile) {
  if (!profile || !scheduleLoaded) return;
  // streak is 1-based: 1=first day claimed, 7=seventh, 0=never claimed.
  const streak = profile.dailyStreak ?? 0;
  const claimedToday = serverClaimedToday;
  // dayInCycle: if claimed today, show the current streak day; otherwise show what day will be claimed next.
  const dayInCycle = claimedToday ? ((streak - 1) % 7) + 1 : (streak % 7) + 1;

  document.getElementById("streak-label").textContent = `Day ${dayInCycle} of 7`;

  gridEl.innerHTML = rewards.map((amt, i) => {
    const day = i + 1;
    let cls = "locked";
    if (claimedToday && day < dayInCycle) cls = "claimed";
    else if (claimedToday && day === dayInCycle) cls = "claimed";
    else if (!claimedToday && day < dayInCycle) cls = "claimed";
    else if (!claimedToday && day === dayInCycle) cls = "current";
    return `<div class="bonus-day-card ${cls}"><span>D${day}</span><span class="mono">₹${amt}</span></div>`;
  }).join("");

  claimBtn.disabled = !!claimedToday;
  claimBtn.textContent = claimedToday ? "Claimed today ✓" : `Claim today's bonus`;
}

async function loadSchedule() {
  try {
    const data = await Api.getDailyBonusSchedule();
    rewards = Array.isArray(data?.amounts) ? data.amounts : [];
    serverClaimedToday = !!data?.claimedToday;
    scheduleLoaded = rewards.length === 7;
    scheduleFailed = !scheduleLoaded;
    if (scheduleFailed) showUnavailable();
    else if (currentProfile) render(currentProfile);
  } catch (err) {
    console.error("[daily-bonus] failed to load the bonus schedule from the Worker API:", err);
    scheduleLoaded = false;
    scheduleFailed = true;
    showUnavailable();
  }
}

function showUnavailable() {
  // Don't leave the button permanently dead on a transient failure — give
  // the person a way to try again instead of "Bonus unavailable" forever.
  claimBtn.disabled = false;
  claimBtn.textContent = "Couldn't load bonus · Retry";
}

async function retryLoadSchedule() {
  claimBtn.disabled = true;
  claimBtn.textContent = "Loading…";
  await loadSchedule();
}

// Single click handler for the button in all its states — avoids stacking a
// second listener that could double-fire alongside the claim handler below.
claimBtn.addEventListener("click", async () => {
  if (scheduleFailed) {
  await retryLoadSchedule();
  return;
}

  claimBtn.disabled = true;
  claimBtn.textContent = "Claiming…";
  try {
    const result = await Api.claimDailyBonus();
    serverClaimedToday = true;
    claimBtn.textContent = "Claimed today ✓";
    if (currentProfile) render(currentProfile);
    const amount = result?.amountRupees != null ? `₹${Number(result.amountRupees).toFixed(2)}` : null;
    Modal.success({
      title: "Bonus claimed!",
      message: amount ? `${amount} has been added to your balance.` : "Today's bonus has been added to your balance.",
      buttonText: "Nice!",
    });
  } catch (err) {
    claimBtn.disabled = false;
    claimBtn.textContent = "Claim today's bonus";
    if (err instanceof ApiError && err.code === "ALREADY_CLAIMED") {
      serverClaimedToday = true;
      claimBtn.disabled = true;
      claimBtn.textContent = "Claimed today ✓";
      Modal.info({ title: "Already claimed", message: "You've already claimed today's bonus. Come back tomorrow for the next one." });
      return;
    }
    Modal.error({ title: "Couldn't claim bonus", message: err instanceof ApiError ? friendlyMessage(err) : "Something went wrong. Please try again." });
  }
});