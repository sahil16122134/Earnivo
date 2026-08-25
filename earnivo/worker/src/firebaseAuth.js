/** Ledger Light backend: Firebase ID tokens are verified against Google’s signing keys before a request gets a user identity. */
import { HttpError } from "./http.js";

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const b64urlToBytes = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)), (char) => char.charCodeAt(0));
const b64urlToJson = (value) => JSON.parse(decoder.decode(b64urlToBytes(value)));

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Sign in is required.", "missing_token");
  return header.slice(7);
}

async function signingKey(kid) {
  const response = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com", { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!response.ok) throw new HttpError(503, "Identity verification is temporarily unavailable.", "identity_unavailable");
  const { keys = [] } = await response.json();
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new HttpError(401, "The session token is not recognized.", "unknown_token_key");
  return crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

export async function verifyFirebaseToken(request, env) {
  const token = bearerToken(request);
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "The session token is invalid.", "invalid_token");
  let header; let payload;
  try { header = b64urlToJson(parts[0]); payload = b64urlToJson(parts[1]); } catch { throw new HttpError(401, "The session token is invalid.", "invalid_token"); }
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "The session token is invalid.", "invalid_token");
  const key = await signingKey(header.kid);
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  const now = Math.floor(Date.now() / 1000);
  if (!validSignature || payload.aud !== env.FIREBASE_PROJECT_ID || payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` || !payload.sub || payload.exp <= now || (payload.iat && payload.iat > now + 300)) {
    throw new HttpError(401, "Your session is no longer valid. Please sign in again.", "invalid_token");
  }
  return { uid: payload.sub, email: payload.email || "", emailVerified: Boolean(payload.email_verified), name: payload.name || "" };
}

