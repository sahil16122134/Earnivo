import { auth } from "../services/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme } from "../nav.js";
import { Api } from "../services/api.js";
import "../components/ad-slot.js";

renderNav("earn");
initTheme();

const CATEGORIES = ["All", "Tasks", "Surveys", "Offers", "Ads", "Apps", "Websites", "Games"];
let activeCategory = "All";
let allTasks = [];

const chipsEl = document.getElementById("category-chips");
const listEl = document.getElementById("task-list");

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  loadTasks();
});

async function loadTasks() {
  try {
    allTasks = await Api.getTasks();
    renderChips();
    renderList();
  } catch (e) {
    console.error("[earn] failed to load tasks from the Worker API:", e);
    listEl.innerHTML = `<div class="empty-state"><p>Couldn't load opportunities.</p><button type="button" id="tasks-retry-btn" class="btn-secondary" style="margin-top:8px">Retry</button></div>`;
    const retryBtn = document.getElementById("tasks-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", loadTasks);
  }
}

function renderChips() {
  const present = new Set(allTasks.map((t) => t.category || "Tasks"));
  const visible = CATEGORIES.filter((c) => c === "All" || present.has(c));
  chipsEl.innerHTML = visible
    .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
  chipsEl.querySelectorAll(".chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderChips();
      renderList();
    })
  );
}

function renderList() {
  const filtered = activeCategory === "All" ? allTasks : allTasks.filter((t) => (t.category || "Tasks") === activeCategory);
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state">
      <h3>No tasks</h3><p>No earning opportunities available. Check again later.</p>
    </div>`;
    return;
  }
  // One banner after every 5 task cards, plus one near the bottom of a long
  // list — never between every card (see UI audit ad-frequency rules).
  const AFTER_N = 5;
  const parts = filtered.map(taskRow);
  for (let i = AFTER_N; i < parts.length; i += AFTER_N + 1) {
    parts.splice(i, 0, `<ad-slot placement="earn-between-tasks"></ad-slot>`);
  }
  if (filtered.length > AFTER_N) parts.push(`<ad-slot placement="earn-bottom"></ad-slot>`);
  listEl.innerHTML = parts.join("");
}

function taskRow(t) {
  return `<a href="pages/task-detail.html?id=${t.id}" class="task-card">
    <div class="task-icon">${t.iconUrl ? `<img src="${escapeHtml(t.iconUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : "🎯"}</div>
    <div class="task-body">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta"><span class="diff-dot"></span>${escapeHtml(t.provider || "")} · ${t.estMinutes || "?"} min</div>
    </div>
    <div class="task-right">
      <div class="task-reward mono">₹${Number(t.rewardRupees ?? 0).toFixed(2)}</div>
      <div class="task-start">Start →</div>
    </div>
  </a>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
