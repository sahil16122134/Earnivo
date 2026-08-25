/** Ledger Light admin: only a configured super administrator can see or use administrator-role delegation controls. */
import { requireAdmin } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { mountAdminNav } from "./admin-nav.js";
import { $, escapeHtml, formatDate } from "../../js/utils.js";
import { toast } from "../../js/components/toast.js";

const root = $("#admin-root");
async function init() { try { if (!await requireAdmin()) return; mountAdminNav("users"); const [{ items = [] }, session] = await Promise.all([adminApi.list("users"), adminApi.get("session")]); const canManageRoles = Boolean(session.isSuperAdmin); root.className = ""; root.innerHTML = `<section class="admin-heading"><div><p class="eyebrow">Users</p><h1>Account records.</h1><p>Review roles and account context without exposing private credentials.</p></div></section>${canManageRoles ? "" : `<p class="configuration-callout">Administrator role changes are restricted to super administrators configured through ADMIN_EMAILS.</p>`}<div class="table-wrap"><table><thead><tr><th>Email</th><th>Country</th><th>Joined</th><th>Role</th><th></th></tr></thead><tbody>${items.map((user) => `<tr><td><strong>${escapeHtml(user.email || "—")}</strong></td><td>${escapeHtml(user.country || "—")}</td><td>${formatDate(user.createdAt)}</td><td>${user.isAdmin ? "Administrator" : "Member"}</td><td class="admin-action-row">${canManageRoles ? `<button data-role="${user.id}" data-admin="${!user.isAdmin}">${user.isAdmin ? "Remove admin" : "Make admin"}</button>` : "Role managed by super admin"}</td></tr>`).join("") || "<tr><td colspan='5'>No accounts have been created.</td></tr>"}</tbody></table></div>`; root.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", async () => { try { await adminApi.action("users", button.dataset.role, "role", { isAdmin: button.dataset.admin === "true" }); toast("Role record updated.", "success"); init(); } catch (error) { toast(error.message, "error"); } })); } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>User records could not be loaded.</h2><p>${escapeHtml(error.message)}</p>`; } }
init();

