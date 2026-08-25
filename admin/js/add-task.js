import { renderAdminNav } from "./admin-nav.js";
import { AdminApi } from "./admin-api.js";

renderAdminNav("tasks.html");

const params = new URLSearchParams(location.search);
const editId = params.get("id");
const statusEl = document.getElementById("form-status");

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
function numVal(id) {
  const el = document.getElementById(id);
  if (!el || el.value === "") return null;
  return Number(el.value);
}
function checked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function collect(status) {
  return {
    title:            val("f-name"),
    category:         val("f-type"),
    provider:         val("f-provider"),
    rewardRupees:     numVal("f-reward"),
    maxRewardRupees:  numVal("f-max-reward"),
    userLimit:        numVal("f-user-limit"),
    dailyLimit:       numVal("f-daily-limit"),
    country:          val("f-country"),
    device:           val("f-device"),
    startDate:        val("f-start-date"),
    expiryDate:       val("f-expiry-date"),
    startUrl:         val("f-start-url"),
    iconUrl:          val("f-icon-url"),
    description:      val("f-description"),
    notes:            val("f-notes"),
    steps:            val("f-steps").split("\n").map(s => s.trim()).filter(Boolean),
    proofInstructions: val("f-proof-instructions"),
    requiresProof:    checked("f-requires-proof"),
    status,
  };
}

// When editing, populate the form with existing task data
async function loadForEdit() {
  if (!editId) return;
  try {
    statusEl.textContent = "Loading…";
    const task = await AdminApi.getTask(editId);
    document.getElementById("f-name").value        = task.title || "";
    document.getElementById("f-type").value        = task.category || "Task";
    document.getElementById("f-provider").value    = task.provider || "";
    document.getElementById("f-reward").value      = task.rewardRupees ?? "";
    document.getElementById("f-max-reward").value  = task.maxRewardRupees ?? "";
    document.getElementById("f-user-limit").value  = task.userLimit ?? "";
    document.getElementById("f-daily-limit").value = task.dailyLimit ?? "";
    document.getElementById("f-country").value     = task.country || "";
    document.getElementById("f-device").value      = task.device || "All";
    document.getElementById("f-start-date").value  = task.startDate || "";
    document.getElementById("f-expiry-date").value = task.expiryDate || "";
    document.getElementById("f-start-url").value   = task.startUrl || "";
    document.getElementById("f-icon-url").value    = task.iconUrl || "";
    document.getElementById("f-description").value = task.description || "";
    document.getElementById("f-notes").value       = task.notes || "";
    document.getElementById("f-steps").value       = (task.steps || []).join("\n");
    document.getElementById("f-proof-instructions").value = task.proofInstructions || "";
    document.getElementById("f-requires-proof").checked   = !!task.requiresProof;
    document.getElementById("f-active").checked           = task.status === "active";
    document.querySelector(".admin-topbar strong").textContent = "Edit Task";
    statusEl.textContent = "";
  } catch (e) {
    statusEl.textContent = "Couldn't load task data.";
  }
}

document.getElementById("save-draft-btn").addEventListener("click", () => submit("draft"));
document.getElementById("create-task-btn").addEventListener("click", () =>
  submit(checked("f-active") ? "active" : "hidden")
);

async function submit(status) {
  statusEl.textContent = "Saving…";
  try {
    const payload = collect(status);
    if (!payload.title) { statusEl.textContent = "Task name is required."; return; }
    if (editId) await AdminApi.updateTask(editId, payload);
    else        await AdminApi.createTask(payload);
    statusEl.textContent = "Saved.";
    setTimeout(() => { window.location.href = "tasks.html"; }, 500);
  } catch (e) {
    statusEl.textContent = "Couldn't save this task. Confirm the Worker's /admin/tasks endpoint is deployed.";
  }
}

loadForEdit();
