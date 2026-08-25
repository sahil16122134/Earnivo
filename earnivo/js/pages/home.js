/** Ledger Light design: overview highlights verifiable work, separates balance states, and lets a member submit an active task for review. */
import { requireUser } from "../auth.js";
import { api } from "../api.js";
import { $, currency, escapeHtml, formatDate, setLoading, statusClass } from "../utils.js";
import { mountNavbar } from "../components/navbar.js";
import { taskCard } from "../components/task-card.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";

const root = $("#home-root");
let currentDashboard = null;

function completionDialog(submission) {
  openModal({
    title: "Send task for review",
    content: `<section class="task-detail"><p>Confirm that you completed <strong>${escapeHtml(submission.taskTitle || "this task")}</strong> before sending it for verification.</p>${submission.requiresProof ? `<label class="stacked-label">Proof or completion reference<textarea id="submission-proof" rows="5" required placeholder="Paste a reference, link, or the proof requested by this task."></textarea></label><p class="field-note">Provide only the task proof requested. Do not include passwords, payment details, or unnecessary personal information.</p>` : `<p class="configuration-callout">This task does not require proof. Sending it now places the reward in verification until reviewed.</p>`}</section>`,
    actions: [{ label: "Keep working", className: "button button--secondary" }, { label: "Send for verification", onClick: async (dialog, button) => {
      const proof = $("#submission-proof", dialog)?.value.trim() || "";
      if (submission.requiresProof && !proof) { toast("Add the requested proof before sending this task.", "error"); return false; }
      try { setLoading(button, true, "Sending…"); await api.post(`/v1/submissions/${encodeURIComponent(submission.id)}/complete`, { proof }); toast("Submission sent for verification.", "success"); await loadDashboard(); }
      catch (error) { toast(error.message, "error"); return false; }
      finally { setLoading(button, false); }
    }}]
  });
}

function renderDashboard(data) {
  currentDashboard = data;
  const tasks = data.tasks || [];
  const submissions = data.ongoingSubmissions || [];
  root.className = "";
  root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">Personal ledger</p><h1>Your work has a route.</h1><p>Follow your task progress and keep your available balance in view.</p></div><a class="button button--secondary" href="/pages/improve.html">Share feedback</a></section><section class="ledger-grid"><article class="balance-card"><p class="eyebrow">Available balance</p><div class="balance-amount">${currency(data.wallet?.availableBalance)}</div><p>Ready to request when you meet the withdrawal terms.</p><a class="button" href="/pages/wallet.html">Open wallet <span>→</span></a></article><aside class="summary-stack"><article class="summary-card"><p>In verification</p><strong class="summary-number">${escapeHtml(String(data.wallet?.verificationCount || 0))}</strong><h2>Submissions being checked</h2></article><article class="summary-card"><p>Pending withdrawal</p><strong class="summary-number">${currency(data.wallet?.pendingWithdrawalAmount)}</strong><h2>Tracked separately from balance</h2></article></aside></section><section class="section-heading"><div><p class="eyebrow">Eligible now</p><h2>Find the next good fit.</h2></div><a class="text-action" href="/pages/tasks.html">See all tasks <span>→</span></a></section>${tasks.length ? `<section class="task-grid">${tasks.slice(0, 3).map(taskCard).join("")}</section>` : `<section class="empty-state"><h2>No eligible tasks right now.</h2><p>When an active task matches your country, device, and limits, it will appear here.</p><a class="button button--secondary" href="/pages/tasks.html">Check task board</a></section>`}<section class="section-heading"><div><p class="eyebrow">Ongoing tasks</p><h2>Keep each record in view.</h2></div></section><section class="rule-card"><div class="ongoing-list">${submissions.length ? submissions.slice(0, 5).map((submission) => `<article class="ongoing-row"><div><h3>${escapeHtml(submission.taskTitle || "Task submission")}</h3><p>Started ${formatDate(submission.startedAt)} · ${currency(submission.reward)}</p></div><div class="ongoing-row__actions"><span class="${statusClass(submission.status)}">${escapeHtml(submission.status)}</span>${submission.status === "in_progress" ? `<button class="text-action" type="button" data-complete-submission="${escapeHtml(submission.id)}">Send for review <span aria-hidden="true">→</span></button>` : `<span class="review-copy">Awaiting review</span>`}</div></article>`).join("") : `<div class="empty-state"><h2>Nothing is in progress.</h2><p>Start only tasks whose requirements you understand. Your active submissions will appear here.</p></div>`}</div></section>`;
  root.querySelectorAll("[data-complete-submission]").forEach((button) => button.addEventListener("click", () => completionDialog(submissions.find((submission) => submission.id === button.dataset.completeSubmission))));
  root.querySelectorAll("[data-open-task]").forEach((button) => button.addEventListener("click", () => { window.location.assign("/pages/tasks.html"); }));
}

async function loadDashboard() { renderDashboard(await api.get("/v1/dashboard")); }
async function init() { try { const user = await requireUser(); if (!user) return; await mountNavbar("home"); await loadDashboard(); } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>Your dashboard could not be opened.</h2><p>${escapeHtml(error.message)}</p><a class="button button--secondary" href="/pages/login.html">Return to sign in</a>`; } }
init();

