import { auth, watchUserProfile } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, fmtINR, fmtCoins, timeAgo } from "../nav.js";
import { Api, ApiError } from "../services/api.js";
import { Modal, friendlyMessage } from "../components/modal.js";
import { Toast } from "../components/toast.js";
import "../components/ad-slot.js";

renderNav("wallet");
initTheme();

let currentBalance = 0;
let selectedMethod = null;
let minWithdraw = 50;

const els = {
  balance: document.getElementById("wallet-balance"),
  coins: document.getElementById("wallet-coins"),
  statEarned: document.getElementById("stat-earned"),
  statWithdrawn: document.getElementById("stat-withdrawn"),
  statPending: document.getElementById("stat-pending"),
  recentTxns: document.getElementById("recent-txns"),
  withdrawOverlay: document.getElementById("withdraw-overlay"),
  confirmOverlay: document.getElementById("confirm-overlay"),
  successOverlay: document.getElementById("success-overlay"),
  withdrawAvailable: document.getElementById("withdraw-available"),
  amountInput: document.getElementById("withdraw-amount"),
  upiField: document.getElementById("upi-field"),
  upiInput: document.getElementById("upi-id"),
  receiveAmount: document.getElementById("receive-amount"),
  withdrawError: document.getElementById("withdraw-error"),
  openWithdrawBtn: document.getElementById("open-withdraw-btn"),
  maintenanceBanner: document.getElementById("maintenance-banner"),
  minWithdrawHint: document.getElementById("min-withdraw-hint"),
  quickAmounts: document.getElementById("quick-amounts"),
};

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  watchUserProfile(user.uid, (profile) => {
    if (!profile) return;
    currentBalance = profile.balanceRupees ?? 0;
    els.balance.textContent = fmtINR(currentBalance);
    els.coins.textContent = `${fmtCoins(profile.coinBalance ?? 0)} coins`;
    els.statEarned.textContent = fmtINR(profile.totalEarnedCoins ? profile.totalEarnedCoins / 100 : 0);
    els.statWithdrawn.textContent = fmtINR(profile.totalWithdrawn ?? 0);
    els.statPending.textContent = fmtINR(profile.pendingWithdrawal ?? 0);
  });
  loadRecentTxns();
  loadPublicSettings().then(() => {
    if (new URLSearchParams(location.search).get("action") === "withdraw") openWithdraw();
  });
});

async function loadPublicSettings() {
  try {
    const settings = await Api.getPublicSettings();
    minWithdraw = Number(settings.minWithdrawRupees) > 0 ? Number(settings.minWithdrawRupees) : 50;

    // Reflect the live minimum in the input, hint text, and quick-amount chips.
    els.amountInput.min = String(minWithdraw);
    els.minWithdrawHint.textContent = `Minimum withdrawal: ${fmtINR(minWithdraw)}`;
    if (els.quickAmounts) {
      els.quickAmounts.querySelectorAll("button").forEach((b) => {
        const amt = Number(b.dataset.amt);
        b.style.display = amt >= minWithdraw ? "" : "none";
      });
    }

    // Hide any withdrawal method the admin hasn't enabled, so users can't
    // pick a method the backend will just reject.
    const enabled = new Set(settings.enabledMethods || ["upi"]);
    document.querySelectorAll(".method-row").forEach((row) => {
      row.style.display = enabled.has(row.dataset.method) ? "" : "none";
    });

    if (settings.maintenanceMode) {
      els.maintenanceBanner.style.display = "block";
      els.openWithdrawBtn.disabled = true;
      els.openWithdrawBtn.title = "Withdrawals are paused for maintenance.";
    } else {
      els.maintenanceBanner.style.display = "none";
      els.openWithdrawBtn.disabled = false;
      els.openWithdrawBtn.title = "";
    }
  } catch (e) {
    // Non-critical: fall back to the built-in defaults (₹50 min, all methods
    // shown) rather than blocking the wallet page from loading.
  }
}

async function loadRecentTxns() {
  try {
    const txns = await Api.getTransactions({ limit: 5 });
    if (!txns || txns.length === 0) {
      els.recentTxns.innerHTML = `<div class="empty-state" style="padding:var(--space-6) var(--space-3)">
        <h3>No transactions yet</h3><p>Complete your first earning opportunity to see it here.</p></div>`;
      return;
    }
    els.recentTxns.innerHTML = txns.map(txnRow).join("");
  } catch (e) {
    els.recentTxns.innerHTML = `<p class="hint">Couldn't load transactions right now.</p>`;
  }
}

function txnRow(t) {
  const isCredit = t.amountRupees >= 0;
  return `<div class="txn-row">
    <div class="txn-left">
      <div class="txn-icon">${isCredit ? "↓" : "↑"}</div>
      <div><div class="txn-title">${escapeHtml(t.description || t.type)}</div><div class="txn-sub">${timeAgo(t.createdAt)}</div></div>
    </div>
    <div class="txn-amt ${isCredit ? "credit" : "debit"} mono">${isCredit ? "+" : "−"}${fmtINR(Math.abs(t.amountRupees))}</div>
  </div>`;
}

// ---- Withdraw drawer ----
document.getElementById("open-withdraw-btn").addEventListener("click", openWithdraw);
document.getElementById("cancel-withdraw-btn").addEventListener("click", () => toggle(els.withdrawOverlay, false));

function openWithdraw() {
  if (els.openWithdrawBtn.disabled) return;
  els.withdrawAvailable.textContent = fmtINR(currentBalance);
  toggle(els.withdrawOverlay, true);
}

document.querySelectorAll(".method-row").forEach((row) => {
  row.addEventListener("click", () => {
    document.querySelectorAll(".method-row").forEach((r) => r.classList.remove("selected"));
    row.classList.add("selected");
    selectedMethod = row.dataset.method;
    els.upiField.style.display = selectedMethod === "upi" ? "block" : "none";
  });
});

document.querySelectorAll(".quick-amounts button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".quick-amounts button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    els.amountInput.value = b.dataset.amt;
    updateReceive();
  });
});
els.amountInput.addEventListener("input", updateReceive);
function updateReceive() {
  const v = Number(els.amountInput.value || 0);
  els.receiveAmount.textContent = fmtINR(v);
}

document.getElementById("continue-withdraw-btn").addEventListener("click", () => {
  const amount = Number(els.amountInput.value || 0);
  els.withdrawError.style.display = "none";

  if (!selectedMethod) return showErr("Select a payment method.");
  if (amount < minWithdraw) return showErr(`Minimum withdrawal is ${fmtINR(minWithdraw)}.`);
  if (amount > currentBalance) return showErr("Amount exceeds available balance.");
  if (selectedMethod === "upi" && !els.upiInput.value.includes("@")) return showErr("Enter a valid UPI ID.");

  document.getElementById("confirm-amount").textContent = fmtINR(amount);
  document.getElementById("confirm-method").textContent = methodLabel(selectedMethod);
  document.getElementById("confirm-dest").textContent = selectedMethod === "upi" ? els.upiInput.value : methodLabel(selectedMethod);

  toggle(els.withdrawOverlay, false);
  toggle(els.confirmOverlay, true);
});

function showErr(msg) { els.withdrawError.textContent = msg; els.withdrawError.style.display = "block"; }
function methodLabel(m) { return { upi: "UPI", amazon: "Amazon Gift Card", flipkart: "Flipkart Gift Card", myntra: "Myntra Gift Card" }[m] || m; }

document.getElementById("cancel-confirm-btn").addEventListener("click", () => toggle(els.confirmOverlay, false));

document.getElementById("confirm-withdraw-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true; btn.textContent = "Submitting…";
  try {
    const amount = Number(els.amountInput.value || 0);
    const result = await Api.requestWithdrawal({
      method: selectedMethod,
      amountRupees: amount,
      upiId: selectedMethod === "upi" ? els.upiInput.value : undefined,
    });
    document.getElementById("success-request-id").textContent = result.requestId;
    toggle(els.confirmOverlay, false);
    toggle(els.successOverlay, true);
    loadRecentTxns();
  } catch (err) {
    const msg = err instanceof ApiError ? friendlyMessage(err) : "Your withdrawal could not be submitted. Your balance has not been deducted.";
    toggle(els.confirmOverlay, false);
    Modal.error({ title: "Withdrawal failed", message: msg });
  } finally {
    btn.disabled = false; btn.textContent = "Confirm withdrawal";
  }
});

document.getElementById("close-success-btn").addEventListener("click", () => {
  toggle(els.successOverlay, false);
  els.amountInput.value = "";
  updateReceive();
});

function toggle(el, open) { el.classList.toggle("open", open); }

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
