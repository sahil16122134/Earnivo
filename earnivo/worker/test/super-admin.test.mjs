import assert from "node:assert/strict";
import test from "node:test";
import { canManageAdministratorRoles, configuredSuperAdmins, isSuperAdmin } from "../src/admin.js";

test("only ADMIN_EMAILS identities are super administrators", () => { const env = { ADMIN_EMAILS: "owner@example.com, security@example.com" }; assert.equal(isSuperAdmin(env, { email: "owner@example.com" }), true); assert.equal(isSuperAdmin(env, { email: "ordinary@example.com" }), false); assert.equal(canManageAdministratorRoles(env, { email: "security@example.com" }), true); });
test("super administrator email matching is normalized", () => { const env = { ADMIN_EMAILS: " OWNER@EXAMPLE.COM " }; assert.deepEqual(configuredSuperAdmins(env), ["owner@example.com"]); assert.equal(isSuperAdmin(env, { email: "owner@example.com" }), true); });

