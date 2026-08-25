// Minimal Firestore REST client authenticated with a service account JWT.
// This lets the Worker perform privileged reads/writes without Firebase
// Admin SDK (which isn't needed) and without Cloud Functions (Spark-safe —
// Firestore's REST API is available on every plan).
import { SignJWT, importPKCS8 } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/datastore";

let cachedToken = null; // { accessToken, expiresAt } — per-isolate cache

async function getAccessToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const privateKey = await importPKCS8(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error("Failed to obtain Firestore access token");
  const json = await res.json();
  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.accessToken;
}

function baseUrl(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

// ---- Firestore <-> JSON value encoding (subset covering common types) ----
function toFirestoreValue(v, fieldName = "") {
  if (v === null || v === undefined) return { nullValue: null };
  // Firestore TTL requires a timestamp-compatible field. Existing slot
  // writers use the established expiresAt field with ISO strings, so convert
  // only that field at the REST boundary without changing reservation logic.
  if (fieldName === "expiresAt" && typeof v === "string") {
    const parsed = Date.parse(v);
    if (Number.isFinite(parsed)) return { timestampValue: new Date(parsed).toISOString() };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "object") return { mapValue: { fields: toFirestoreFields(v) } };
  throw new Error(`Unsupported Firestore value type: ${typeof v}`);
}
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, val] of Object.entries(obj)) fields[k] = toFirestoreValue(val, k);
  return fields;
}
function fromFirestoreValue(v) {
  if (!v) return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}
function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = fromFirestoreValue(v);
  return obj;
}

export function createFirestoreClient(env) {
  async function authedFetch(path, opts = {}) {
    const token = await getAccessToken(env);
    return fetch(`${baseUrl(env)}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
  }

  return {
    async getDocMeta(path) {
      const res = await authedFetch(`/${path}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Firestore getDoc failed: ${res.status}`);
      const json = await res.json();
      return {
        doc: { id: path.split("/").pop(), ...fromFirestoreFields(json.fields) },
        updateTime: json.updateTime || null,
      };
    },

    async getDoc(path) {
      const result = await this.getDocMeta(path);
      return result ? result.doc : null;
    },

    async setDoc(path, data, condition) {
      const res = await authedFetch(`/${path}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: toFirestoreFields(data), ...(condition ? { currentDocument: condition } : {}) }),
      });
      if (!res.ok) throw new Error(`Firestore setDoc failed: ${res.status} ${await res.text()}`);
      return true;
    },

    async createDoc(collectionPath, docId, data) {
      const res = await authedFetch(`/${collectionPath}?documentId=${encodeURIComponent(docId)}`, {
        method: "POST",
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
      });
      if (!res.ok) throw new Error(`Firestore createDoc failed: ${res.status} ${await res.text()}`);
      return true;
    },

    async runQuery(collectionId, { where: whereClauses = [], orderBy: order, limit } = {}) {
      const structuredQuery = {
        from: [{ collectionId }],
        ...(whereClauses.length && {
          where: {
            compositeFilter: {
              op: "AND",
              filters: whereClauses.map(([field, op, value]) => ({
                fieldFilter: { field: { fieldPath: field }, op, value: toFirestoreValue(value) },
              })),
            },
          },
        }),
        ...(order && { orderBy: [{ field: { fieldPath: order[0] }, direction: order[1] || "DESCENDING" }] }),
        ...(limit && { limit }),
      };
      const res = await authedFetch(":runQuery", { method: "POST", body: JSON.stringify({ structuredQuery }) });
      if (!res.ok) throw new Error(`Firestore runQuery failed: ${res.status} ${await res.text()}`);
      const json = await res.json();
      return json
        .filter((r) => r.document)
        .map((r) => ({ id: r.document.name.split("/").pop(), ...fromFirestoreFields(r.document.fields) }));
    },

    // Atomic multi-write commit — used for reward crediting so the ledger
    // transaction and the balance update happen together or not at all.
    // Supports an optional per-write `condition` (e.g. { exists: false }) so
    // callers can enforce "create exactly once" semantics atomically via
    // Firestore itself, instead of a separate read-then-write race.
    async commit(writes) {
      const res = await authedFetch(":commit", {
        method: "POST",
        body: JSON.stringify({
          writes: writes.map((w) => ({
            ...(w.delete ? { delete: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${w.path}` } : { update: { name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${w.path}`, fields: toFirestoreFields(w.data) } }),
            ...(w.updateMask && !w.delete ? { updateMask: { fieldPaths: w.updateMask } } : {}),
            ...(w.condition ? { currentDocument: w.condition } : {}),
          })),
        }),
      });
      if (!res.ok) {
        const bodyText = await res.text();
        // A failed `currentDocument` precondition (e.g. exists:false but the
        // doc was already created by a concurrent request) surfaces as a 400
        // with FAILED_PRECONDITION/ALREADY_EXISTS — callers that passed a
        // condition can catch this specifically to treat it as "already done"
        // rather than a generic failure.
        if (res.status === 400 && /FAILED_PRECONDITION|ALREADY_EXISTS/.test(bodyText)) {
          const err = new Error(`Firestore commit precondition failed: ${bodyText}`);
          err.code = "PRECONDITION_FAILED";
          throw err;
        }
        throw new Error(`Firestore commit failed: ${res.status} ${bodyText}`);
      }
      return true;
    },

    // Deterministic, filesystem/Firestore-safe document ID derived from an
    // arbitrary string (e.g. a provider's transaction id), so the same input
    // always maps to the same doc ID — used to let Firestore itself enforce
    // "only one write ever succeeds for this id" via a create-precondition,
    // closing the check-then-write race a separate query would have.
    async deterministicId(input) {
      const bytes = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    },
  };
}
