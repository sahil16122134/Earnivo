/** Ordinary administrators can operate the platform; only ADMIN_EMAILS allowlisted super administrators can delegate administrator roles. */
import { HttpError } from "./http.js";
import { getDocument } from "./firestore.js";

export function configuredSuperAdmins(env) { return (env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean); }
export function isSuperAdmin(env, identity) { return configuredSuperAdmins(env).includes((identity.email || "").trim().toLowerCase()); }
export function canManageAdministratorRoles(env, identity) { return isSuperAdmin(env, identity); }

export async function assertAdmin(env, identity) {
  const profile = await getDocument(env, "users", identity.uid);
  if (!isSuperAdmin(env, identity) && !profile?.isAdmin) throw new HttpError(403, "Administrator access is required.", "admin_required");
  return profile;
}

export function assertSuperAdmin(env, identity) { if (!isSuperAdmin(env, identity)) throw new HttpError(403, "Only a configured super administrator may manage administrator roles.", "super_admin_required"); }

