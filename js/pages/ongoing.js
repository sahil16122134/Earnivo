import { db, auth } from "../services/firebase.js";
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme, timeAgo } from "../nav.js";
import "../components/ad-slot.js";

renderNav("ongoing");
initTheme();

const STATUS_CHIPS = ["All", "In Progress", "Verification", "Completed", "Failed"];
let active = "All";
let items = [];

const chipsEl = document.getElementById("status-chips");
const listEl = document.getElementById("ongoing-list");
const countEl = document.getElementById("active-count");

chipsEl.innerHTML = STATUS_CHIPS.map((c) => `<button class="chip ${c === active ? "active" : ""}" data-c="${c}">${c}</button>`).join("");
chipsEl.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { active = b.dataset.c; renderChips(); renderList(); }));

function renderChips() {
  chipsEl.querySelectorAll(".chip").forEach((b) => b.classList.toggle("active", b.dataset.c === active));
}

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  const q = query(
    collection(db, "taskSubmissions"),
    where("userId", "==", user.uid),
    orderBy("startedAt", "desc")
  );
  onSnapshot(q, (snap) => {
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    countEl.textContent = items.filter((i) => i.status !== "completed" && i.status !== "failed").length;
    renderList();
  }, () => {
    listEl.innerHTML = `<div class="empty-state"><p>Couldn't load your ongoing tasks.</p></div>`;
  });
});

function renderList() {
  const map = { "In Progress": "in_progress", "Verification": "verification", "Completed": "completed", "Failed": "failed" };
  const filtered = active === "All" ? items : items.filter((i) => i.status === map[active]);
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state">
      <h3>Nothing in progress</h3><p>Start an opportunity from Earn.</p>
    </div>`;
    return;
  }
  listEl.innerHTML = filtered.map(row).join("");
}

function row(t) {
  const statusPill = {
    in_progress: `<span class="pill pill-pending">In progress</span>`,
    verification: `<span class="pill pill-pending">Verification pending</span>`,
    completed: `<span class="pill pill-success">Completed</span>`,
    failed: `<span class="pill pill-fail">Failed</span>`,
  }[t.status] || `<span class="pill pill-pending">${t.status}</span>`;

  const step = { in_progress: 1, verification: 2, completed: 3, failed: 1 }[t.status] || 0;

  return `<a href="pages/task-detail.html?id=${t.taskId}&submission=${t.id}" class="task-card" style="flex-direction:column;align-items:stretch">
    <div style="display:flex;align-items:center;gap:var(--space-3);width:100%">
      <div class="task-icon">${t.iconUrl ? `<img src="${escapeHtml(t.iconUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : "🎯"}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.taskTitle)}</div>
        <div class="task-meta">${escapeHtml(t.provider || "")} · Started ${t.startedAt ? timeAgo(t.startedAt) : ""}</div>
      </div>
      <div class="task-right">
        <div class="task-reward mono">₹${Number(t.rewardRupees ?? 0).toFixed(2)}</div>
        ${statusPill}
      </div>
    </div>
    <div class="progress-track">
      ${progressDot(step >= 1, step === 1)}
      <div class="progress-line ${step > 1 ? "done" : ""}"></div>
      ${progressDot(step >= 2, step === 2)}
      <div class="progress-line ${step > 2 ? "done" : ""}"></div>
      ${progressDot(step >= 3, step === 3)}
    </div>
  </a>`;
}

function progressDot(done, current) {
  return `<div class="progress-dot ${done ? "done" : ""} ${current ? "current" : ""}"></div>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
