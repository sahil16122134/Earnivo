import assert from "node:assert/strict";
import test from "node:test";
import { adminReadableResources, genericMutationAllowed, isReadOnlyGenericResource } from "../src/admin-policy.js";

test("financial and audit collections are readable but cannot use generic mutation", () => { for (const resource of ["transactions", "withdrawals", "submissions", "fraud", "logs"]) { assert.equal(adminReadableResources.has(resource), true); assert.equal(isReadOnlyGenericResource(resource), true); assert.equal(genericMutationAllowed(resource), false); } });
test("tasks remain a dedicated administrative resource, not a generic mutation exception", () => { assert.equal(adminReadableResources.has("tasks"), true); assert.equal(genericMutationAllowed("tasks"), false); });

