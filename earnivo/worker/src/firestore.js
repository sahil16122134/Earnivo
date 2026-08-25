/** Ledger Light backend: the Worker exchanges service-account credentials for short-lived access tokens and uses Firestore’s REST API. */
import { HttpError } from "./http.js";

const textEncoder = new TextEncoder();
const b64url = (input) => btoa(typeof input === "string" ? input : String.fromCharCode(...new Uint8Array(input))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const fromPem = (pem) => Uint8Array.from(atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, "")), (char) => char.charCodeAt(0));
const documentBase = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const databaseBase = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;

async function serviceAccessToken(env) {
  if (!env.FIREBASE_PROJECT_ID || !env.SERVICE_ACCOUNT_EMAIL || !env.SERVICE_ACCOUNT_PRIVATE_KEY) throw new HttpError(500, "Worker credentials have not been configured.", "worker_not_configured");
  const now = Math.floor(Date.now() / 1000);
  const assertionHeader = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const assertionPayload = b64url(JSON.stringify({ iss: env.SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3300 }));
  const key = await crypto.subtle.importKey("pkcs8", fromPem(env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, textEncoder.encode(`${assertionHeader}.${assertionPayload}`));
  const assertion = `${assertionHeader}.${assertionPayload}.${b64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new HttpError(503, "The data service is temporarily unavailable.", "firestore_auth_failed");
  return (await response.json()).access_token;
}

export function toValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, toValue(item)])) } };
  return { stringValue: String(value) };
}

export function fromValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromValue);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, fromValue(item)]));
  return undefined;
}

export function fromDocument(document) {
  if (!document) return null;
  const fields = Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, fromValue(value)]));
  return { id: document.name.split("/").pop(), ...fields, createdAt: fields.createdAt ?? document.createTime, updatedAt: document.updateTime };
}

async function firestoreFetch(env, path, options = {}) {
  const response = await fetch(`${documentBase(env)}${path}`, { ...options, headers: { Authorization: `Bearer ${await serviceAccessToken(env)}`, "Content-Type": "application/json", ...(options.headers || {}) } });
  if (response.status === 404) return null;
  if (!response.ok) { console.error("Firestore REST error", response.status, await response.text()); throw new HttpError(503, "The data service could not complete the request.", "firestore_error"); }
  return response.status === 204 ? null : response.json();
}

async function firestoreDatabaseFetch(env, path, options = {}) {
  const response = await fetch(`${databaseBase(env)}${path}`, { ...options, headers: { Authorization: `Bearer ${await serviceAccessToken(env)}`, "Content-Type": "application/json", ...(options.headers || {}) } });
  if (!response.ok) { console.error("Firestore query error", response.status, await response.text()); throw new HttpError(503, "The data service could not complete the query.", "firestore_query_error"); }
  return response.json();
}

export async function getDocument(env, collection, id) { return fromDocument(await firestoreFetch(env, `/${collection}/${encodeURIComponent(id)}`)); }
export async function setDocument(env, collection, id, fields) { const body = { fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => [key, toValue(value)])) }; return fromDocument(await firestoreFetch(env, `/${collection}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) })); }
export async function patchDocument(env, collection, id, fields) { const keys = Object.keys(fields).filter((key) => fields[key] !== undefined); if (!keys.length) return getDocument(env, collection, id); const body = { fields: Object.fromEntries(keys.map((key) => [key, toValue(fields[key])])) }; const params = keys.map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&"); return fromDocument(await firestoreFetch(env, `/${collection}/${encodeURIComponent(id)}?${params}`, { method: "PATCH", body: JSON.stringify(body) })); }
export async function deleteDocument(env, collection, id) { await firestoreFetch(env, `/${collection}/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function listCollection(env, collection, limit = 100) { const response = await firestoreFetch(env, `/${collection}?pageSize=${Math.min(Math.max(Number(limit) || 20, 1), 500)}`); return (response?.documents || []).map(fromDocument); }

export function normalizePage(value, fallback = 20, maximum = 50) { return Math.min(Math.max(Number(value) || fallback, 1), maximum); }
export function encodeCursor(values) { return values?.length ? b64url(JSON.stringify(values)) : null; }
export function decodeCursor(cursor) { if (!cursor) return null; try { const input = cursor.replace(/-/g, "+").replace(/_/g, "/"); const padded = input + "=".repeat((4 - (input.length % 4)) % 4); const values = JSON.parse(atob(padded)); return Array.isArray(values) ? values : null; } catch { throw new HttpError(400, "The page cursor is invalid.", "invalid_cursor"); } }
function fieldFilter({ field, op = "EQUAL", value }) { return { fieldFilter: { field: { fieldPath: field }, op, value: toValue(value) } }; }
export function stableOrderBy(orderBy) { const requested = orderBy === undefined ? [{ field: "createdAt", direction: "DESCENDING" }] : orderBy; if (!requested.length || requested.some((entry) => entry.field === "__name__")) return requested; const direction = requested.at(-1)?.direction || "DESCENDING"; return [...requested, { field: "__name__", direction }]; }
export function cursorValuesFromItem(orderBy, item) { return orderBy.map((entry) => entry.field === "__name__" ? item.id : item[entry.field] ?? null); }
function cursorValue(env, collection, field, value) { return field === "__name__" ? { referenceValue: documentName(env, collection, value) } : toValue(value); }
function structuredQuery(env, collection, { filters = [], filterMode = "AND", orderBy = [{ field: "createdAt", direction: "DESCENDING" }], limit = 20, cursor = null } = {}) { const where = filters.length === 1 ? fieldFilter(filters[0]) : filters.length > 1 ? { compositeFilter: { op: filterMode, filters: filters.map(fieldFilter) } } : undefined; const stableOrder = stableOrderBy(orderBy); const orders = stableOrder.map((entry) => ({ field: { fieldPath: entry.field }, direction: entry.direction || "DESCENDING" })); const startValues = decodeCursor(cursor); if (startValues && startValues.length !== stableOrder.length) throw new HttpError(400, "The page cursor does not match this query.", "invalid_cursor"); return { from: [{ collectionId: collection }], ...(where ? { where } : {}), orderBy: orders, ...(limit ? { limit } : {}), ...(startValues ? { startAt: { before: false, values: startValues.map((value, index) => cursorValue(env, collection, stableOrder[index].field, value)) } } : {}) }; }
export async function queryCollection(env, collection, options = {}) { const limit = normalizePage(options.limit, 20, options.maximum || 50); const stableOrder = stableOrderBy(options.orderBy); const query = structuredQuery(env, collection, { ...options, orderBy: stableOrder, limit }); const response = await firestoreDatabaseFetch(env, ":runQuery", { method: "POST", body: JSON.stringify({ structuredQuery: query }) }); const items = response.filter((entry) => entry.document).map((entry) => fromDocument(entry.document)); const last = items.at(-1); return { items, nextCursor: items.length === limit && last ? encodeCursor(cursorValuesFromItem(stableOrder, last)) : null }; }
export async function countCollection(env, collection, options = {}) { const query = structuredQuery(env, collection, { ...options, orderBy: [], limit: null }); const response = await firestoreDatabaseFetch(env, ":runAggregationQuery", { method: "POST", body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: query, aggregations: [{ count: {}, alias: "total" }] } }) }); const result = response.find((entry) => entry.result)?.result?.aggregateFields?.total; return Number(fromValue(result) || 0); }

export async function commit(env, writes) {
  const token = await serviceAccessToken(env);
  const response = await fetch(`${documentBase(env).replace("/documents", "")}:commit`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ writes }) });
  if (response.status === 409) throw new HttpError(409, "This record changed while it was being processed. Reload and try again.", "concurrent_update");
  if (!response.ok) { console.error("Firestore commit error", response.status, await response.text()); throw new HttpError(503, "The data service could not complete the change.", "firestore_commit_error"); }
  return response.json();
}

export function documentName(env, collection, id) { return `${documentBase(env)}/${collection}/${id}`; }
export function writeCreate(env, collection, id, fields) { return { update: { name: documentName(env, collection, id), fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => [key, toValue(value)])) }, currentDocument: { exists: false } }; }
export function writePatch(env, collection, id, fields, currentDocument) { const entries = Object.entries(fields).filter(([, value]) => value !== undefined); return { update: { name: documentName(env, collection, id), fields: Object.fromEntries(entries.map(([key, value]) => [key, toValue(value)])) }, updateMask: { fieldPaths: entries.map(([key]) => key) }, ...(currentDocument ? { currentDocument } : {}) }; }
export function writeIncrement(env, collection, id, increments, currentDocument) { return { transform: { document: documentName(env, collection, id), fieldTransforms: Object.entries(increments).map(([fieldPath, amount]) => ({ fieldPath, increment: toValue(amount) })) }, ...(currentDocument ? { currentDocument } : {}) }; }
export function writeDelete(env, collection, id, currentDocument) { return { delete: documentName(env, collection, id), ...(currentDocument ? { currentDocument } : {}) }; }
