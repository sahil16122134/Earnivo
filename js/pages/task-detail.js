import { auth } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme } from "../nav.js";
import { Api, ApiError } from "../services/api.js";
import { Modal, friendlyMessage } from "../components/modal.js";
import "../components/ad-slot.js";

renderNav("earn", "../");
initTheme();

const root = document.getElementById("detail-root");
const params = new URLSearchParams(location.search);
const taskId = params.get("id");
// submission param is set only when navigating from ongoing.html for proof submission
const submissionId = params.get("submission");
let task = null;
let activeSubmission = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../index.html"; return; }
  if (!taskId) { root.innerHTML = emptyState("Task not found"); return; }
  try {
    task = await Api.getTask(taskId);
    render();
  } catch (e) {
    root.innerHTML = emptyState("Couldn't load this opportunity");
  }
});

function render() {
  // Proof stage only when arriving from ongoing.html with a submission id AND task requires proof.
  // requiresProof alone on the initial page never triggers proof stage.
  const proofStage = !!(submissionId && task.requiresProof);

  const icon = task.iconUrl
    ? `<img src="${escapeHtml(task.iconUrl)}" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover">`
    : `<div style="width:56px;height:56px;font-size:1.7rem;display:flex;align-items:center;justify-content:center">🎯</div>`;

  const metaRows = [
    row("Provider", task.provider),
    row("Reward", task.rewardRupees != null ? `₹${Number(task.rewardRupees).toFixed(2)}` : null),
    row("Maximum Reward", task.maxRewardRupees != null ? `₹${Number(task.maxRewardRupees).toFixed(2)}` : null),
    row("User Limit", task.userLimit),
    row("Daily Limit", task.dailyLimit),
    row("Country", Array.isArray(task.country) ? task.country.join(", ") : task.country),
    row("Device", Array.isArray(task.device) ? task.device.join(", ") : task.device),
    row("Start Date", task.startDate),
    row("Expiry Date", task.expiryDate),
  ].filter(Boolean).join("");

  root.innerHTML = `
    <div class="detail-hero">
      ${icon}
      <h1>${escapeHtml(task.title)}</h1>
      ${task.provider ? `<div class="detail-provider">${escapeHtml(task.provider)}</div>` : ""}
      <div class="detail-stats">
        ${task.rewardRupees != null ? `<div class="detail-stat"><div class="v mono">₹${Number(task.rewardRupees).toFixed(2)}</div><div class="l">Reward</div></div>` : ""}
        ${task.maxRewardRupees != null ? `<div class="detail-stat"><div class="v mono">₹${Number(task.maxRewardRupees).toFixed(2)}</div><div class="l">Max Reward</div></div>` : ""}
        ${task.estMinutes ? `<div class="detail-stat"><div class="v">${escapeHtml(String(task.estMinutes))} min</div><div class="l">Est. time</div></div>` : ""}
      </div>
    </div>

    ${metaRows ? `<div class="section-block detail-meta">${metaRows}</div>` : ""}

    <div class="section-block">
      <h3>About this opportunity</h3>
      <p>${escapeHtml(task.description || "No description provided.")}</p>
    </div>

    ${task.notes ? `<div class="section-block"><h3>Notes</h3><p>${escapeHtml(task.notes)}</p></div>` : ""}

    ${(task.steps && task.steps.length) ? `
    <div class="section-block">
      <h3>Steps</h3>
      <ol class="step-list">${task.steps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    </div>` : ""}

    ${task.requiresProof && task.proofInstructions ? `
    <div class="section-block">
      <h3>How to submit proof</h3>
      <p>${escapeHtml(task.proofInstructions)}</p>
    </div>` : ""}

    <ad-slot placement="task-detail-below-info"></ad-slot>

    <div class="sticky-cta">
      <button class="btn btn-primary btn-block" id="start-btn">${proofStage ? "Submit Proof" : "Start Earning"}</button>
      <p class="hint" style="text-align:center;margin-top:8px">Rewards are credited after verification — not instantly.</p>
    </div>
  `;

  if (proofStage) {
    document.getElementById("start-btn").addEventListener("click", openProofModal);
  } else {
    document.getElementById("start-btn").addEventListener("click", startEarning);
  }
}

function row(label, value) {
  if (value == null || value === "") return null;
  return `<div class="detail-meta-row"><span class="detail-meta-label">${label}</span><span>${escapeHtml(String(value))}</span></div>`;
}

function openProofModal() {
  document.getElementById("proof-overlay").classList.add("open");
}

async function startEarning() {
  const btn = document.getElementById("start-btn");
  const startUrl = task.startUrl || "";

  if (!startUrl) {
    Modal.error({ title: "Opportunity unavailable", message: "This opportunity isn't available right now. Please try again later." });
    return;
  }

  // Open external URL synchronously within the click handler so browsers
  // don't block it as an unprompted popup.
  window.open(startUrl, "_blank", "noopener");

  btn.disabled = true;
  btn.textContent = "Starting…";
  try {
    activeSubmission = await Api.startTask(task.id);
    window.location.href = `../ongoing.html?submission=${encodeURIComponent(activeSubmission.submissionId || "")}`;
  } catch (err) {
    Modal.error({ title: "Couldn't start this task", message: err instanceof ApiError ? friendlyMessage(err) : "Something went wrong. Please try again." });
    btn.disabled = false;
    btn.textContent = "Start Earning";
  }
}

document.getElementById("cancel-proof-btn").addEventListener("click", () => {
  document.getElementById("proof-overlay").classList.remove("open");
});

document.getElementById("submit-proof-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const text = document.getElementById("proof-text").value.trim();
  if (!text) return;

  const confirmed = await Modal.confirm({
    title: "Submit this task?",
    message: "Make sure your proof is complete and correct before submitting — you won't be able to edit it afterward.",
    confirmText: "Submit",
    cancelText: "Go back",
  });
  if (!confirmed) return;

  btn.disabled = true;
  btn.textContent = "Submitting…";
  try {
    await Api.submitTaskProof(task.id, { text }, submissionId || activeSubmission?.submissionId, activeSubmission?.providerAttemptId || activeSubmission?.attemptId);
    await Modal.success({
      title: "Submitted for review",
      message: "Your task was submitted successfully and is now waiting for review. You'll be credited once it's approved.",
      buttonText: "OK",
    });
    window.location.href = "../ongoing.html";
  } catch (err) {
    Modal.error({ title: "Couldn't submit task", message: err instanceof ApiError ? friendlyMessage(err) : "Something went wrong. Please try again." });
    btn.disabled = false;
    btn.textContent = "Submit Proof";
  }
});

function emptyState(msg) {
  return `<div class="empty-state"><h3>${msg}</h3><p>Check the Earn page for available opportunities.</p></div>`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
