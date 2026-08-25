import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav(null); // no matching sidebar item for this drill-down page

const userId = new URLSearchParams(window.location.search).get("id");
const root = document.getElementById("detail-root");

if (!userId) {
  root.innerHTML = `<div class="empty-state">No user ID given. <a href="users.html">Go back to Users</a>.</div>`;
} else {
  load();
}

async function load() {
  try {
    const { user, transactions, withdrawals, submissions, referredBy, referralsMade } = await AdminApi.getUser(userId);
    root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3>${esc(user.displayName || userId)} <span style="color:var(--text-faint);font-weight:400">${esc(userId)}</span></h3>
          <div>
            <span class="pill pill-risk-${(user.riskLevel || "low").toLowerCase()}">${esc(user.riskLevel || "Low")} risk</span>
            <span class="pill ${user.suspended ? "pill-fail" : "pill-success"}">${user.suspended ? "Suspended" : "Active"}</span>
          </div>
        </div>
        <div style="padding:var(--space-5);display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4)">
          ${stat("Balance", `₹${Number(user.balanceRupees ?? 0).toFixed(2)}`)}
          ${stat("Total earned", `₹${Number((user.totalEarnedCoins ?? 0) / 100).toFixed(2)}`)}
          ${stat("Total withdrawn", `₹${Number(user.totalWithdrawn ?? 0).toFixed(2)}`)}
          ${stat("Pending withdrawal", `₹${Number(user.pendingWithdrawal ?? 0).toFixed(2)}`)}
          ${stat("Coin balance", `${Number(user.coinBalance ?? 0).toLocaleString()}`)}
          ${stat("Referrals made", `${referralsMade.length} (${referralsMade.filter((r) => r.status === "rewarded").length} rewarded)`)}
        </div>
        <div style="padding:0 var(--space-5) var(--space-5);color:var(--text-faint);font-size:.85rem">
          ${referredBy ? `Referred by <span class="mono">${esc(referredBy.referrerId)}</span> — ${esc(referredBy.status)}` : "Not referred by anyone."}
        </div>
        <div style="padding:0 var(--space-5) var(--space-5)">
          <button class="btn" id="credit-btn">Credit balance</button>
          <button class="btn" id="debit-btn">Debit balance</button>
          <button class="btn" id="suspend-btn">${user.suspended ? "Unsuspend" : "Suspend"}</button>
        </div>
      </div>

      ${section("Recent transactions", transactions, (t) => `
        <td class="mono">${esc(t.type)}</td><td>${esc(t.description || "")}</td>
        <td class="mono">${t.amountRupees > 0 ? "+" : ""}₹${Number(t.amountRupees).toFixed(2)}</td>
        <td>${esc(t.status)}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</td>
      `, ["Type", "Description", "Amount", "Status", "Date"])}

      ${section("Withdrawals", withdrawals, (w) => `
        <td class="mono">${esc(w.requestId || w.id)}</td><td>${esc(w.method)}</td>
        <td class="mono">₹${Number(w.amountRupees).toFixed(2)}</td><td>${esc(w.status)}</td>
        <td>${w.createdAt ? new Date(w.createdAt).toLocaleString() : ""}</td>
      `, ["Request", "Method", "Amount", "Status", "Date"])}

      ${section("Task submissions", submissions, (s) => `
        <td>${esc(s.taskTitle || s.taskId)}</td><td>${esc(s.status)}</td>
        <td class="mono">₹${Number(s.rewardRupees ?? 0).toFixed(2)}</td>
        <td>${s.startedAt ? new Date(s.startedAt).toLocaleString() : ""}</td>
      `, ["Task", "Status", "Reward", "Started"])}
    `;

    document.getElementById("suspend-btn").addEventListener("click", async () => {
      const ok = await Modal.confirm({
        title: user.suspended ? "Unsuspend this user?" : "Suspend this user?",
        rows: [{ label: "User", value: user.displayName || userId }],
        confirmText: user.suspended ? "Unsuspend" : "Suspend",
        destructive: !user.suspended,
        tone: user.suspended ? "neutral" : "warning",
      });
      if (!ok) return;
      try {
        await AdminApi.suspendUser(userId, !user.suspended);
        Toast.success(user.suspended ? "User unsuspended." : "User suspended.");
        load();
      } catch (e) {
        Modal.error({ title: "Action failed", message: friendlyMessage(e) });
      }
    });
    document.getElementById("credit-btn").addEventListener("click", () => adjustBalance(1, user));
    document.getElementById("debit-btn").addEventListener("click", () => adjustBalance(-1, user));
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Couldn't load this user. ${esc(e.message || "")}</div>`;
  }
}

async function adjustBalance(sign, user) {
  const result = await Modal.form({
    title: sign > 0 ? "Credit balance" : "Debit balance",
    message: `This ${sign > 0 ? "adds to" : "removes from"} ${esc(user?.displayName || userId)}'s balance and is recorded in the ledger.`,
    fields: [
      { id: "amount", label: "Amount (₹)", inputType: "number", required: true, placeholder: "0.00" },
      { id: "reason", label: "Reason (shown in the ledger)", type: "textarea", required: true, placeholder: "Why this adjustment is being made" },
    ],
    confirmText: sign > 0 ? "Credit balance" : "Debit balance",
    destructive: sign < 0,
    tone: sign > 0 ? "neutral" : "warning",
  });
  if (!result) return;
  const amount = Number(result.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    Modal.error({ title: "Invalid amount", message: "Enter an amount greater than ₹0." });
    return;
  }
  try {
    await AdminApi.manualBalanceAdjust(userId, sign * amount, result.reason);
    Toast.success(`Balance ${sign > 0 ? "credited" : "debited"}.`);
    load();
  } catch (e) {
    Modal.error({ title: "Adjustment failed", message: friendlyMessage(e) });
  }
}

function stat(label, value) {
  return `<div><div style="color:var(--text-faint);font-size:.75rem">${esc(label)}</div><div style="font-size:1.1rem;font-weight:600" class="mono">${value}</div></div>`;
}

function section(title, items, rowFn, headers) {
  return `<div class="panel">
    <div class="panel-head"><h3>${esc(title)}</h3></div>
    <table>
      <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${items.length ? items.map((i) => `<tr>${rowFn(i)}</tr>`).join("") : `<tr><td colspan="${headers.length}" class="empty-state">Nothing here yet.</td></tr>`}</tbody>
    </table>
  </div>`;
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
