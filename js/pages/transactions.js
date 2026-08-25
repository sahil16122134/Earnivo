import { auth } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, fmtINR, timeAgo } from "../nav.js";
import { Api } from "../services/api.js";
import "../components/ad-slot.js";

renderNav("wallet", "../");
initTheme();

const CHIPS = ["All", "Earned", "Withdrawals", "Referral", "Bonus", "Reversal"];

let active = "All";
let allTxns = [];

const chipsEl = document.getElementById("txn-chips");
const listEl = document.getElementById("txn-list");
const searchEl = document.getElementById("txn-search");

chipsEl.innerHTML = CHIPS.map(
  (c) =>
    `<button class="chip ${c === active ? "active" : ""}" data-c="${c}">${c}</button>`
).join("");

chipsEl.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    active = button.dataset.c;
    renderChips();
    render();
  });
});

searchEl.addEventListener("input", render);

function renderChips() {
  chipsEl.querySelectorAll(".chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.c === active);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    allTxns = (await Api.getTransactions({ limit: 100 })) || [];
    render();
  } catch (error) {
    console.error("[transactions] failed to load transactions:", error);

    listEl.innerHTML = `
      <div class="empty-state">
        <h3>Couldn't load transactions</h3>
        <p>Please try again.</p>
      </div>
    `;
  }
});

function render() {
  const typeMap = {
    Earned: ["task", "survey", "offer", "ad"],
    Withdrawals: ["withdrawal"],
    Referral: ["referral"],
    Bonus: ["daily_bonus"],
    Reversal: ["reward_reversal", "withdrawal_reversal"],
  };

  let list =
    active === "All"
      ? allTxns
      : allTxns.filter((transaction) =>
          (typeMap[active] || []).includes(transaction.type)
        );

  const search = searchEl.value.trim().toLowerCase();

  if (search) {
    list = list.filter((transaction) =>
      [
        transaction.description,
        transaction.providerTransactionId,
        transaction.transactionId,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h3>No transactions yet</h3>
        <p>Complete your first earning opportunity to see it here.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = list
    .map((transaction) => {
      const amount = Number(transaction.amountRupees || 0);
      const isCredit = amount >= 0;

      return `
        <div class="txn-row">
          <div class="txn-left">
            <div class="txn-icon">${isCredit ? "↓" : "↑"}</div>

            <div>
              <div class="txn-title">
                ${escapeHtml(
                  transaction.description || transaction.type
                )}
              </div>

              <div class="txn-sub">
                ${escapeHtml(transaction.provider || "")}
                · ${timeAgo(transaction.createdAt)}
                · <span class="pill ${statusPillClass(
                  transaction.status
                )}">
                  ${escapeHtml(transaction.status || "pending")}
                </span>
              </div>
            </div>
          </div>

          <div class="txn-amt ${isCredit ? "credit" : "debit"} mono">
            ${isCredit ? "+" : "−"}${fmtINR(Math.abs(amount))}
          </div>
        </div>
      `;
    })
    .join("");
}

function statusPillClass(status) {
  if (status === "completed" || status === "paid") {
    return "pill-success";
  }

  if (status === "failed" || status === "rejected") {
    return "pill-fail";
  }

  return "pill-pending";
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}