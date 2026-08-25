/** Administrative policy: sensitive records are read-only outside explicit state-transition or adjustment handlers. */
export const adminReadableResources = new Set(["users", "tasks", "submissions", "withdrawals", "transactions", "providers", "fraud", "notifications", "settings", "logs", "feedback"]);
export const genericReadOnlyResources = new Set(["submissions", "withdrawals", "transactions", "fraud", "logs", "feedback"]);
export function genericMutationAllowed(resource) { return false; }
export function isReadOnlyGenericResource(resource) { return genericReadOnlyResources.has(resource); }

