import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";
import { Modal, friendlyMessage } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("tasks.html");
let active = "All";
let search = "";

// Add "New Task" action into the toolbar
const toolbar = document.querySelector(".toolbar");
const newBtn = document.createElement("a");
newBtn.href = "add-task.html";
newBtn.className = "btn btn-primary";
newBtn.textContent = "+ New Task";
newBtn.style.marginLeft = "8px";
toolbar.appendChild(newBtn);

document.querySelectorAll("#status-chips .chip").forEach((c) =>
  c.addEventListener("click", () => { document.querySelectorAll("#status-chips .chip").forEach((x) => x.classList.remove("active")); c.classList.add("active"); active = c.dataset.c; load(); })
);
document.getElementById("search-input").addEventListener("input", (e) => { search = e.target.value; load(); });

load();

async function load() {
  const body = document.getElementById("table-body");
  try {
    const tasks = await AdminApi.listTasks({ status: active, q: search });
    if (!tasks.length) { body.innerHTML = `<tr><td colspan="8" class="empty-state">No tasks match this filter.</td></tr>`; return; }
    body.innerHTML = tasks.map(row).join("");
    body.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onAction));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="8" class="empty-state">Couldn't load tasks. Confirm the Worker's /admin/tasks endpoint is deployed.</td></tr>`;
  }
}

function row(t) {
  return `<tr>
    <td><strong>${esc(t.title)}</strong></td>
    <td>${esc(t.provider || "")}</td>
    <td>${esc(t.category || "Task")}</td>
    <td class="mono">₹${Number(t.rewardRupees ?? 0).toFixed(2)}</td>
    <td>${t.completions ?? 0}</td>
    <td><span class="pill ${t.status === "active" ? "pill-success" : "pill-pending"}">${t.status}</span></td>
    <td class="mono">${t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "—"}</td>
    <td class="actions-cell">
      <a class="btn" href="add-task.html?id=${t.id}">Edit</a>
      <button class="btn" data-action="${t.status === "active" ? "hide" : "activate"}" data-id="${t.id}">${t.status === "active" ? "Hide" : "Activate"}</button>
    </td>
  </tr>`;
}

async function onAction(e) {
  const { action, id } = e.currentTarget.dataset;
  try {
    await AdminApi.updateTask(id, { status: action === "activate" ? "active" : "hidden" });
    Toast.success(action === "activate" ? "Task activated." : "Task hidden.");
    load();
  } catch (err) {
    Modal.error({ title: "Action failed", message: friendlyMessage(err) });
  }
}

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
