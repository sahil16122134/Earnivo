/** Ledger Light admin: fraud cases can only move through the explicit reviewed action, never arbitrary generic updates. */
import { requireAdmin } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { mountAdminNav } from "./admin-nav.js";
import { $, escapeHtml, formatDate, statusClass } from "../../js/utils.js";
import { toast } from "../../js/components/toast.js";

const root = $("#admin-root");
async function init() { try { if (!await requireAdmin()) return; mountAdminNav("fraud"); const { items = [] } = await adminApi.list("fraud"); root.className = ""; root.innerHTML = `<section class="admin-heading"><div><p class="eyebrow">Fraud review</p><h1>Case queue.</h1><p>Record evidence and review notes. Avoid automated enforcement based on signals alone.</p></div></section><div class="table-wrap"><table><thead><tr><th>Subject</th><th>Reason</th><th>Opened</th><th>Status</th><th></th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.userId || item.submissionId || "—")}</td><td>${escapeHtml(item.reason || "—")}</td><td>${formatDate(item.createdAt)}</td><td><span class="${statusClass(item.status)}">${escapeHtml(item.status || "open")}</span></td><td class="admin-action-row">${item.status === "reviewed" ? "Reviewed" : `<button data-close="${item.id}">Mark reviewed</button>`}</td></tr>`).join("") || "<tr><td colspan='5'>No fraud-review cases are open.</td></tr>"}</tbody></table></div>`; root.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", async () => { try { await adminApi.action("fraud", button.dataset.close, "review", {}); toast("Case marked reviewed.", "success"); init(); } catch (error) { toast(error.message, "error"); } })); } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>Fraud-review cases could not be loaded.</h2><p>${escapeHtml(error.message)}</p>`; } }
init();

