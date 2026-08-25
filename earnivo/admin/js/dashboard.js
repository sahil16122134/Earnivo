/** Ledger Light admin: the overview calls its exact Worker endpoint once and routes operations to their dedicated queues. */
import { requireAdmin } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { mountAdminNav } from "./admin-nav.js";
import { $, escapeHtml } from "../../js/utils.js";

const root = $("#admin-root");
async function init() { try { const user = await requireAdmin(); if (!user) return; mountAdminNav("dashboard"); const data = await adminApi.list("dashboard"); root.className = ""; root.innerHTML = `<section class="admin-heading"><div><p class="eyebrow">Administrator workspace</p><h1>Operational overview.</h1><p>Use the dedicated queues to resolve records safely and keep an audit trail.</p></div><a class="button button--primary" href="/admin/tasks.html">Create task <span>→</span></a></section><section class="admin-stats"><article class="admin-stat"><span>Users</span><strong>${escapeHtml(String(data.users || 0))}</strong></article><article class="admin-stat"><span>Active tasks</span><strong>${escapeHtml(String(data.activeTasks || 0))}</strong></article><article class="admin-stat"><span>Needs verification</span><strong>${escapeHtml(String(data.verificationSubmissions || 0))}</strong></article><article class="admin-stat"><span>Pending withdrawals</span><strong>${escapeHtml(String(data.pendingWithdrawals || 0))}</strong></article></section><section class="admin-record-card"><p class="eyebrow">Work deliberately</p><h2>Resolve changes from their source record.</h2><p>Task updates, submission decisions, and withdrawal resolutions are sent through the Worker, which records the responsible administrator and timestamp.</p></section>`; } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>Administration is unavailable.</h2><p>${escapeHtml(error.message)}</p>`; } }
init();

